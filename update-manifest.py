#!/usr/bin/env python3
import glob
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
EXTENSIONS = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP")

for folder in ("before-after", "reviews"):
    path = os.path.join(BASE, "akzhan", "images", folder)
    files = set()

    for pattern in EXTENSIONS:
        files.update(os.path.basename(file) for file in glob.glob(os.path.join(path, pattern)))

    manifest_path = os.path.join(path, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(sorted(files), handle, ensure_ascii=False, indent=2)

    print(f"{folder}: {len(files)} image(s) -> {manifest_path}")
