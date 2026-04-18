#!/usr/bin/env python3
"""
Optional helpers to fetch SCUT-FBP5500 (Google Drive via gdown) or print Kaggle CLI steps.

Does not upload anything. Skips download if Images/ + labels already exist.
"""

from __future__ import annotations

import sys
from pathlib import Path as _Path

_SCRIPTS = _Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import argparse
from pathlib import Path

from mebeauty_paths import find_mebeauty_repo  # noqa: E402
from scut_paths import SCUT_ROOT, find_scut_dataset_dir  # noqa: E402

# Public file id from dataset docs (may require gdown cookies for large files).
GDRIVE_ID = "1w0TorBfTIqbquQVd6k3h_77ypnrvfGwf"
KAGGLE_SLUG = "pranavchandane/scut-fbp5500-v2-facial-beauty-scores"


def count_images_and_avg_rating(ds_dir: Path) -> tuple[int, float | None]:
    images = ds_dir / "Images"
    labels = ds_dir / "train_test_files" / "All_labels.txt"
    if not images.is_dir() or not labels.is_file():
        return 0, None
    ratings: dict[str, float] = {}
    for line in labels.read_text(encoding="utf-8", errors="replace").splitlines():
        parts = line.split()
        if len(parts) >= 2:
            try:
                ratings[parts[0]] = float(parts[1])
            except ValueError:
                pass
    n = 0
    s = 0.0
    for p in images.glob("*.jpg"):
        if p.name in ratings:
            n += 1
            s += ratings[p.name]
    avg = (s / n) if n else None
    return n, avg


def try_gdown(out_zip: Path) -> bool:
    try:
        import gdown  # type: ignore
    except ImportError:
        print("gdown not installed. Run: pip install gdown")
        return False
    url = f"https://drive.google.com/uc?id={GDRIVE_ID}"
    print(f"Attempting gdown download -> {out_zip}")
    try:
        gdown.download(url, str(out_zip), quiet=False)
    except Exception as e:
        print(f"gdown failed: {e}")
        return False
    return out_zip.is_file() and out_zip.stat().st_size > 0


def print_kaggle_instructions() -> None:
    print(
        "\n--- Kaggle CLI (alternative) ---\n"
        "1. pip install kaggle\n"
        "2. Put kaggle.json in ~/.kaggle/ (see Kaggle account API settings)\n"
        f"3. kaggle datasets download -d {KAGGLE_SLUG}\n"
        f"4. Unzip into: {SCUT_ROOT}\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="SCUT download helper / status")
    parser.add_argument("--try-gdown", action="store_true", help="Try gdown for Google Drive id")
    parser.add_argument(
        "--zip-out",
        type=Path,
        default=SCUT_ROOT / "SCUT_downloaded.zip",
        help="Where to save ZIP when using --try-gdown",
    )
    args = parser.parse_args()

    ds = find_scut_dataset_dir()
    print(f"SCUT folder: {SCUT_ROOT}")
    if ds is not None:
        n, avg = count_images_and_avg_rating(ds)
        print(f"Found dataset at: {ds}")
        print(f"Images with labels: {n}")
        if avg is not None:
            print(f"Average rating (1-5): {avg:.4f}")
        mb = find_mebeauty_repo()
        if mb is not None:
            print(f"MEBeauty repo: {mb}")
        else:
            print(
                "MEBeauty: not found. Clone: git clone https://github.com/fbplab/MEBeauty-database.git\n"
                f"  → data/training/real_rated/mebeauty/_repo"
            )
        return

    print("Dataset not found (no Images/ + All_labels.txt).")
    print_kaggle_instructions()
    if args.try_gdown:
        ok = try_gdown(args.zip_out)
        if ok:
            print(f"Downloaded: {args.zip_out} — unzip into {SCUT_ROOT}")
        else:
            print("Automatic download failed; use Kaggle or manual steps in data/training/README.md")
            sys.exit(1)


if __name__ == "__main__":
    main()
