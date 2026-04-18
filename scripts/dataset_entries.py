"""Shared loaders for SCUT + MEBeauty training samples (no CLI)."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from mebeauty_paths import find_mebeauty_repo, score_csv_paths
from scut_paths import REPO_ROOT, SCUT_ROOT, find_scut_dataset_dir


def scut_rating_to_0_100(r: float) -> float:
    return (float(r) - 1.0) / 4.0 * 100.0


def _load_scut_from_manifest_file(manifest: Path) -> list[dict]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    entries: list[dict] = []
    for e in data.get("entries", []):
        r = float(e["rating_1_to_5"])
        entries.append(
            {
                "dataset": "scut_fbp5500",
                "file": e["file"],
                "rating_raw": r,
                "rating_0_100": scut_rating_to_0_100(r),
                "image_relpath": e["image_relpath"],
            }
        )
    return entries


def load_scut_entries(manifest: Path | None = None) -> list[dict]:
    """Prefer explicit manifest, then default prepared path, then scan Images/."""
    candidates: list[Path] = []
    if manifest is not None:
        candidates.append(manifest)
    candidates.append(SCUT_ROOT / "prepared" / "scut_manifest.json")
    for path in candidates:
        if path.is_file():
            return _load_scut_from_manifest_file(path)

    ds = find_scut_dataset_dir()
    if ds is None:
        return []
    labels = ds / "train_test_files" / "All_labels.txt"
    ratings: dict[str, float] = {}
    for line in labels.read_text(encoding="utf-8", errors="replace").splitlines():
        parts = line.split()
        if len(parts) >= 2:
            try:
                ratings[parts[0]] = float(parts[1])
            except ValueError:
                pass
    out: list[dict] = []
    for jpg in (ds / "Images").glob("*.jpg"):
        if jpg.name not in ratings:
            continue
        r = ratings[jpg.name]
        out.append(
            {
                "dataset": "scut_fbp5500",
                "file": jpg.name,
                "rating_raw": r,
                "rating_0_100": scut_rating_to_0_100(r),
                "image_relpath": jpg.resolve().relative_to(REPO_ROOT).as_posix(),
            }
        )
    return out


def load_mebeauty_entries() -> list[dict]:
    repo = find_mebeauty_repo()
    if repo is None:
        return []
    csvs = score_csv_paths(repo)
    if not csvs:
        return []

    all_scores: list[float] = []
    rows_pre: list[tuple[str, float]] = []
    for csv_path in csvs:
        with csv_path.open(encoding="utf-8", errors="replace", newline="") as f:
            r = csv.DictReader(f)
            if not r.fieldnames or "image" not in r.fieldnames or "score" not in r.fieldnames:
                continue
            for row in r:
                try:
                    s = float(row["score"])
                except (KeyError, ValueError):
                    continue
                rows_pre.append((row["image"].strip(), s))
                all_scores.append(s)

    if not rows_pre:
        return []

    lo, hi = min(all_scores), max(all_scores)
    span = hi - lo if hi > lo else 1.0

    by_path: dict[str, tuple[float, float]] = {}
    for rel, s in rows_pre:
        p = (repo / rel).resolve()
        if not p.is_file():
            continue
        key = p.relative_to(REPO_ROOT).as_posix()
        by_path[key] = (s, (s - lo) / span * 100.0)

    entries: list[dict] = []
    for image_relpath, (s, y) in sorted(by_path.items()):
        entries.append(
            {
                "dataset": "mebeauty",
                "file": Path(image_relpath).name,
                "rating_raw": s,
                "rating_0_100": y,
                "image_relpath": image_relpath,
            }
        )
    return entries


def load_combined_training_entries(
    *,
    use_scut: bool = True,
    use_mebeauty: bool = True,
    scut_manifest: Path | None = None,
) -> list[dict]:
    out: list[dict] = []
    if use_scut:
        out.extend(load_scut_entries(manifest=scut_manifest))
    if use_mebeauty:
        out.extend(load_mebeauty_entries())
    return out
