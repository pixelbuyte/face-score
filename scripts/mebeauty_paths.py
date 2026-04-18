"""Resolve MEBeauty layout under data/training/real_rated/mebeauty/."""

from __future__ import annotations

from pathlib import Path

from scut_paths import REPO_ROOT

MEBEAUTY_ROOT = REPO_ROOT / "data" / "training" / "real_rated" / "mebeauty"


def find_mebeauty_repo() -> Path | None:
    """
    Return root containing cropped_images/ and scores/ (often mebeauty/_repo).
    """
    candidates = [
        MEBEAUTY_ROOT / "_repo",
        MEBEAUTY_ROOT,
    ]
    for c in candidates:
        scores = c / "scores"
        imgs = c / "cropped_images"
        if scores.is_dir() and imgs.is_dir():
            return c.resolve()
    return None


def score_csv_paths(repo: Path) -> list[Path]:
    d = repo / "scores"
    if not d.is_dir():
        return []
    names = ("train_crop.csv", "test_crop.csv", "val_crop.csv")
    return [d / n for n in names if (d / n).is_file()]
