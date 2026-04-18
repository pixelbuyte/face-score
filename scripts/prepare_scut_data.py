#!/usr/bin/env python3
"""
Scan extracted SCUT-FBP5500 folders, read beauty ratings, and write a manifest.

Typical layout:
  SCUT-FBP5500_v2/
    Images/*.jpg
    train_test_files/All_labels.txt
    facial landmark/*.pts
"""

from __future__ import annotations

import sys
from pathlib import Path as _Path

_SCRIPTS = _Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import argparse
import json
import shutil
import statistics
from collections import Counter
from pathlib import Path

from scut_paths import REPO_ROOT, SCUT_ROOT, find_scut_dataset_dir  # noqa: E402


def parse_all_labels(path: Path) -> dict[str, float]:
    """filename -> mean rating in [1, 5]."""
    out: dict[str, float] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        fname, score_s = parts[0], parts[1]
        try:
            out[fname] = float(score_s)
        except ValueError:
            continue
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare SCUT-FBP5500 manifest + labels copy.")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=SCUT_ROOT / "prepared",
        help="Where to write manifest.json",
    )
    args = parser.parse_args()

    ds = find_scut_dataset_dir()
    if ds is None:
        print(
            "Could not find SCUT dataset under:\n"
            f"  {SCUT_ROOT}\n"
            "Expected a folder containing Images/ and train_test_files/All_labels.txt"
        )
        raise SystemExit(1)

    images_dir = ds / "Images"
    labels_file = ds / "train_test_files" / "All_labels.txt"
    ratings = parse_all_labels(labels_file)

    labels_out = SCUT_ROOT / "labels"
    labels_out.mkdir(parents=True, exist_ok=True)
    shutil.copy2(labels_file, labels_out / "All_labels.txt")

    entries: list[dict] = []
    missing_rating = 0
    missing_file = 0
    for jpg in sorted(images_dir.glob("*.jpg")):
        name = jpg.name
        if name not in ratings:
            missing_rating += 1
            continue
        rel = jpg.resolve().relative_to(REPO_ROOT)
        entries.append(
            {
                "file": name,
                "rating_1_to_5": ratings[name],
                "image_relpath": rel.as_posix(),
            }
        )

    for name in ratings:
        if not (images_dir / name).is_file():
            missing_file += 1

    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out_dir / "scut_manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "dataset_root": ds.resolve().relative_to(REPO_ROOT).as_posix(),
                "source_labels": labels_file.relative_to(REPO_ROOT).as_posix(),
                "n_images_with_labels": len(entries),
                "entries": entries,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    vals = [e["rating_1_to_5"] for e in entries]
    rounded = [round(v, 2) for v in vals]
    dist = Counter(rounded)

    print("=== SCUT-FBP5500 prepare ===")
    print(f"Dataset dir: {ds}")
    print(f"Images dir:  {images_dir}")
    print(f"Label file:  {labels_file}")
    print(f"Manifest:    {manifest_path}")
    print(f"Copied labels to: {labels_out / 'All_labels.txt'}")
    print(f"Total paired image+rating: {len(entries)}")
    print(f"Missing rating for image file: {missing_rating}")
    print(f"Rating entry without image file: {missing_file}")
    if vals:
        print(f"Rating mean: {statistics.mean(vals):.4f}  std: {statistics.pstdev(vals):.4f}")
        print(f"Min: {min(vals):.4f}  Max: {max(vals):.4f}")
        print("Sample paths:")
        for e in entries[:5]:
            print(f"  {e['image_relpath']}  ->  {e['rating_1_to_5']}")
    print("(Copy) Done.")


if __name__ == "__main__":
    main()
