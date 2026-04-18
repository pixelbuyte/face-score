#!/usr/bin/env python3
"""
Train a regression model on SCUT-FBP5500 + MEBeauty with unified target rating_0_100.

SCUT: raw 1–5 means → (r-1)/4*100. MEBeauty: per-CSV min–max normalized to 0–100.

Backbone: ResNet50 or EfficientNet-B0 (ImageNet pretrained).

Later: combine CNN score with MediaPipe geometric features in the web app;
export ONNX for onnxruntime-web.

Calibration / user votes: fine-tune a small head on frozen backbone using
(face embedding, user preference) pairs collected locally.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import argparse

from dataset_entries import load_combined_training_entries  # noqa: E402
from scut_paths import REPO_ROOT, SCUT_ROOT  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scut-manifest",
        type=Path,
        default=SCUT_ROOT / "prepared" / "scut_manifest.json",
    )
    parser.add_argument("--no-scut", action="store_true")
    parser.add_argument("--no-mebeauty", action="store_true")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--backbone", choices=("resnet50", "efficientnet_b0"), default="resnet50")
    parser.add_argument("--max-samples", type=int, default=0, help="0 = use all")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "models/beauty_model.pth",
    )
    args = parser.parse_args()

    try:
        import torch
        import torch.nn as nn
        from PIL import Image
        from torch.utils.data import DataLoader, Dataset
        from torchvision import transforms
        from torchvision.models import efficientnet_b0, resnet50
        from torchvision.models import EfficientNet_B0_Weights, ResNet50_Weights
        from tqdm import tqdm
    except ImportError as e:
        print("Missing dependency:", e)
        print("Install: pip install -r requirements.txt")
        raise SystemExit(1)

    scut_m = args.scut_manifest if args.scut_manifest.is_file() else None
    entries = load_combined_training_entries(
        use_scut=not args.no_scut,
        use_mebeauty=not args.no_mebeauty,
        scut_manifest=scut_m,
    )
    if not entries:
        print(
            "No training samples. Add SCUT (run scripts/prepare_scut_data.py) and/or clone MEBeauty to\n"
            "  data/training/real_rated/mebeauty/_repo"
        )
        raise SystemExit(1)

    if args.max_samples > 0:
        random.seed(args.seed)
        entries = random.sample(entries, min(args.max_samples, len(entries)))

    n_scut = sum(1 for e in entries if e["dataset"] == "scut_fbp5500")
    n_mb = sum(1 for e in entries if e["dataset"] == "mebeauty")
    print(f"Samples: {len(entries)} (scut={n_scut}, mebeauty={n_mb})")

    class BeautyDataset(Dataset):
        def __init__(self, items: list[dict], xform) -> None:
            self.items = items
            self.xform = xform

        def __len__(self) -> int:
            return len(self.items)

        def __getitem__(self, i: int):
            e = self.items[i]
            p = REPO_ROOT / e["image_relpath"]
            img = Image.open(p).convert("RGB")
            t = float(e["rating_0_100"])
            return self.xform(img), torch.tensor(t, dtype=torch.float32)

    train_tf = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(0.1, 0.1, 0.1, 0.05),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    val_tf = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    random.seed(args.seed)
    random.shuffle(entries)
    n_val = max(1, int(len(entries) * args.val_fraction))
    n_train = len(entries) - n_val
    if n_train < 1:
        print("Not enough samples for train/val.")
        raise SystemExit(1)

    train_items = entries[:n_train]
    val_items = entries[n_train:]

    train_ds = BeautyDataset(train_items, train_tf)
    val_ds = BeautyDataset(val_items, val_tf)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}  train={len(train_ds)} val={len(val_ds)} backbone={args.backbone}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    if args.backbone == "resnet50":
        weights = ResNet50_Weights.IMAGENET1K_V2
        backbone = resnet50(weights=weights)
        in_f = backbone.fc.in_features
        backbone.fc = nn.Linear(in_f, 1)
        model = backbone
    else:
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1
        backbone = efficientnet_b0(weights=weights)
        in_f = backbone.classifier[1].in_features
        backbone.classifier = nn.Sequential(nn.Dropout(p=0.2, inplace=True), nn.Linear(in_f, 1))
        model = backbone

    model = model.to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)
    loss_fn = nn.MSELoss()

    for epoch in range(args.epochs):
        model.train()
        running = 0.0
        for x, y in tqdm(train_loader, desc=f"train e{epoch+1}"):
            x, y = x.to(device), y.to(device).unsqueeze(1)
            opt.zero_grad()
            pred = model(x)
            loss = loss_fn(pred, y)
            loss.backward()
            opt.step()
            running += loss.item() * x.size(0)
        train_loss = running / len(train_ds)

        model.eval()
        vloss = 0.0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device).unsqueeze(1)
                pred = model(x)
                vloss += loss_fn(pred, y).item() * x.size(0)
        vloss /= len(val_ds)
        print(f"epoch {epoch+1}: train_mse={train_loss:.4f} val_mse={vloss:.4f}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "backbone": args.backbone,
            "target": "rating_0_100 (SCUT (r-1)/4*100; MEBeauty min-max per loader)",
        },
        args.out,
    )
    print(f"Saved: {args.out}")

    try:
        onnx_path = args.out.with_suffix(".onnx")
        model_cpu = model.cpu().eval()
        dummy = torch.randn(1, 3, 224, 224)
        torch.onnx.export(
            model_cpu,
            dummy,
            onnx_path,
            input_names=["input"],
            output_names=["score"],
            opset_version=17,
            dynamic_axes={"input": {0: "batch"}, "score": {0: "batch"}},
        )
        print(f"Also wrote ONNX (optional): {onnx_path}")
    except Exception as e:
        print(f"(Optional ONNX export skipped: {e})")


if __name__ == "__main__":
    main()
