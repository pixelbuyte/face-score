"""Resolve SCUT-FBP5500 layout under data/training/real_rated/scut_fbp5500/."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCUT_ROOT = REPO_ROOT / "data" / "training" / "real_rated" / "scut_fbp5500"


def find_scut_dataset_dir() -> Path | None:
    """
    Return directory that contains Images/ and train_test_files/All_labels.txt
    (e.g. .../scut_fbp5500/SCUT-FBP5500_v2).
    """
    if not SCUT_ROOT.is_dir():
        return None
    candidates = [SCUT_ROOT, *SCUT_ROOT.iterdir()]
    for c in candidates:
        if not c.is_dir():
            continue
        images = c / "Images"
        labels = c / "train_test_files" / "All_labels.txt"
        if images.is_dir() and labels.is_file():
            return c.resolve()
    return None
