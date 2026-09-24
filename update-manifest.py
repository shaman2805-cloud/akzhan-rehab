"""Run after adding photos to akzhan/images/before-after or reviews.
Rebuilds the static galleries and manifests. Pillow is optional.
"""
from pathlib import Path
from html import escape
import json
import re
try:
    from PIL import Image, ImageOps
except ImportError:
    Image = ImageOps = None

ROOT = Path(__file__).resolve().parent
ARROW = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>'
page = (ROOT / 'index.html').read_text(encoding='utf-8')
for group, label, kind, tab in [
    ('before-after', 'Фотографии результатов', 'Результат работы', 'results'),
    ('reviews', 'Фотографии отзывов', 'Отзыв клиента', 'reviews'),
]:
    folder = ROOT / 'akzhan/images' / group
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'} and not p.name.startswith('.'))
    if not files:
        raise SystemExit(f'No images in {folder}; existing page has not been replaced.')
    (folder / 'manifest.json').write_text(json.dumps([p.name for p in files], ensure_ascii=False, indent=2), encoding='utf-8')
    cards = []
    for i, path in enumerate(files, 1):
        original = path.relative_to(ROOT).as_posix()
        preview = original
        if Image is not None:
            thumb = ROOT / 'assets/images' / f'{group}-{i:02}.webp'
            thumb.parent.mkdir(parents=True, exist_ok=True)
            image = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
            image.thumbnail((600, 1050))
            image.save(thumb, quality=82, method=6)
            preview = thumb.relative_to(ROOT).as_posix()
        cards.append(f'<li class="gallery-item"><a class="gallery-card" href="{escape(original,quote=True)}" target="_blank" rel="noopener noreferrer" data-full="{escape(original,quote=True)}" aria-label="{kind} {i}. Открыть фотографию"><img src="{escape(preview,quote=True)}" alt="{kind} {i}" width="600" height="990" loading="lazy" decoding="async"><span class="gallery-zoom" aria-hidden="true">{ARROW}</span></a></li>')
    replacement = f'<ul class="gallery-track" aria-label="{label}">' + '\n'.join(cards) + '</ul>'
    page, count = re.subn(r'<ul class="gallery-track" aria-label="' + re.escape(label) + r'">.*?</ul>', lambda _: replacement, page, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one {group} gallery; page not replaced.')
    page = re.sub(r'(data-tab="' + tab + r'">[^<]*<span>)\d+', lambda match: match[1] + str(len(files)), page)
    if group == 'before-after':
        page = re.sub(r'(class="gallery-counter"[^>]*>)\d+ / \d+', lambda match: match[1] + f'01 / {len(files)}', page)
(ROOT / 'index.html').write_text(page, encoding='utf-8')
print('Galleries and manifests updated.')
