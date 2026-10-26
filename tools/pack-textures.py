#!/usr/bin/env python3
"""Упаковка текстур в assets/textures/bundle.js (WebP как data-URL).

Игра берёт картинки только из bundle.js: так WebGL принимает их и при открытии
index.html с диска (file://). Картинки лежат в assets/textures/src/<имя>.(png|jpg|webp),
имена — из списка tools/texlist.py (задание CLAUDE_CHROME_TEXTURES.md).
Нет картинки — игра рисует похожую текстуру сама (js/textures.js).

    python3 tools/pack-textures.py            # пересобрать bundle.js из src/
    python3 tools/pack-textures.py <папка>    # сначала забрать картинки из папки
                                              # (имена «123_name.png» или «name.png»)
Нужен Pillow (pip install pillow).
"""
import base64, io, os, re, shutil, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'textures', 'src')
OUT = os.path.join(ROOT, 'assets', 'textures', 'bundle.js')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texlist import TEXTURES

BY_NUM = {t['n']: t['name'] for t in TEXTURES}
BY_NAME = {t['name']: t for t in TEXTURES}


def take(folder):
    """Картинки из папки (скачанные из Google Flow) → src/ под именами из списка."""
    n = 0
    for f in sorted(os.listdir(folder)):
        base, ext = os.path.splitext(f)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        m = re.match(r'^(\d+)[_\-\s]*(.*)$', base)
        name = BY_NUM.get(int(m.group(1))) if m else None
        name = name or (base if base in BY_NAME else None)
        if not name:
            print('не узнал файл:', f)
            continue
        for old in os.listdir(SRC):
            if os.path.splitext(old)[0] == name:
                os.remove(os.path.join(SRC, old))
        shutil.copy(os.path.join(folder, f), os.path.join(SRC, name + ext.lower()))
        n += 1
    print('забрал картинок:', n)


def key_magenta(im):
    """Пурпурный фон (#FF00FF) → прозрачность, розовая кайма по краю убирается."""
    import numpy as np
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.minimum(r, b) - g                      # насколько пиксель «пурпурный»
    alpha = np.clip(255 - (mag - 60) * 3, 0, 255)
    alpha = np.where(a[..., 3] < 255, np.minimum(alpha, a[..., 3]), alpha)
    m = np.minimum(np.minimum(r, b), g + 20)
    edge = (alpha < 255) & (mag > 20)
    a[..., 0] = np.where(edge, m, r)
    a[..., 2] = np.where(edge, m, b)
    a[..., 3] = alpha
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def encode(path, name):
    t = BY_NAME.get(name, {})
    side = t.get('px', 512)
    im = Image.open(path)
    alpha = t.get('alpha', False)
    im = im.convert('RGBA' if alpha else 'RGB')
    if alpha:
        im = key_magenta(im)
    k = min(1.0, side / max(im.size))
    if k < 1:
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=84, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    os.makedirs(SRC, exist_ok=True)
    if len(sys.argv) > 1:
        take(sys.argv[1])
    out = {}
    for f in sorted(os.listdir(SRC)):
        name, ext = os.path.splitext(f)
        if ext.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
            out[name] = encode(os.path.join(SRC, f), name)
    with open(OUT, 'w') as fo:
        fo.write('// Собрано tools/pack-textures.py из assets/textures/src — не править руками\n')
        fo.write('window.TEX_BUNDLE = {\n')
        for k in sorted(out):
            fo.write(f'"{k}":"{out[k]}",\n')
        fo.write('};\n')
    missing = [t['name'] for t in TEXTURES if t['name'] not in out]
    print(f'bundle.js: {len(out)} текстур, {os.path.getsize(OUT) // 1024} КБ')
    if missing:
        print('ещё нет картинок (игра рисует сама):', ', '.join(missing))


if __name__ == '__main__':
    main()
