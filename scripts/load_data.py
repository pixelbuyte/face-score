#!/usr/bin/env python3
"""Print stats for SCUT-FBP5500 + MEBeauty (see dataset_entries.py for loaders)."""

from __future__ import annotations

import sys
from pathlib import Path as _Path

_SCRIPTS = _Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import argparse
from pathlib import Path

from dataset_entries import (  # noqa: E402
    load_combined_training_entries,
    load_mebeauty_entries,
    load_scut_entries,
)
from scut_paths import SCUT_ROOT  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scut-manifest",
        type=Path,
        default=SCUT_ROOT / "prepared" / "scut_manifest.json",
    )
    parser.add_argument("--scut-only", action="store_true")
    parser.add_argument("--mebeauty-only", action="store_true")
    args = parser.parse_args()

    print("=== load_data ===\n")

    if not args.mebeauty_only:
        scut_entries = load_scut_entries(args.scut_manifest if args.scut_manifest.is_file() else None)
        src = f"manifest {args.scut_manifest}" if args.scut_manifest.is_file() else "direct scan"
        print("--- SCUT-FBP5500 ---")
        print(f"Source: {src}")
        print(f"Loaded: {len(scut_entries)}")
        if scut_entries:
            rs = [e["rating_raw"] for e in scut_entries]
            print(f"Raw rating range: {min(rs):.3f} .. {max(rs):.3f}")
            for e in scut_entries[:2]:
                print(f"  {e['image_relpath']}  raw={e['rating_raw']:.3f}  y={e['rating_0_100']:.1f}")
        print()

    if not args.scut_only:
        mb_entries = load_mebeauty_entries()
        print("--- MEBeauty ---")
        if mb_entries:
            print(f"Source: cloned repo under mebeauty/_repo")
            print(f"Loaded: {len(mb_entries)}")
            ys = [e["rating_0_100"] for e in mb_entries]
            print(f"Normalized y_0_100 range: {min(ys):.1f} .. {max(ys):.1f}")
            for e in mb_entries[:2]:
                print(
                    f"  {e['image_relpath']}  raw={e['rating_raw']:.3f}  y={e['rating_0_100']:.1f}"
                )
        else:
            print("Not found. Clone: git clone https://github.com/fbplab/MEBeauty-database.git")
            print("  data/training/real_rated/mebeauty/_repo")
        print()

    if args.scut_only or args.mebeauty_only:
        return

    combined = load_combined_training_entries(
        use_scut=True,
        use_mebeauty=True,
        scut_manifest=args.scut_manifest if args.scut_manifest.is_file() else None,
    )
    print(f"--- Combined (for training) ---\nTotal samples: {len(combined)}")


if __name__ == "__main__":
    main()
