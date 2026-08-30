#!/usr/bin/env python3
"""生成小程序 tabBar 图标（81×81 PNG，透明底）"""
from pathlib import Path
from PIL import Image, ImageDraw

SIZE = 81
OUT = Path(__file__).resolve().parent.parent / 'static' / 'tab'
COLOR_NORMAL = '#909399'
COLOR_ACTIVE = '#409eff'


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def canvas():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))


def stroke(draw, color, width=4):
    return dict(fill=hex_rgb(color), width=width)


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name, 'PNG', optimize=True)


def icon_home(color):
    img = canvas()
    d = ImageDraw.Draw(img)
    c = hex_rgb(color)
    # 屋顶
    d.polygon([(40, 16), (18, 36), (62, 36)], outline=c, fill=None, width=4)
    # 墙体
    d.rounded_rectangle([22, 36, 58, 62], radius=3, outline=c, width=4)
    # 门
    d.rounded_rectangle([35, 46, 45, 62], radius=2, fill=c)
    return img


def icon_shop(color):
    img = canvas()
    d = ImageDraw.Draw(img)
    c = hex_rgb(color)
    # 袋身
    d.rounded_rectangle([24, 30, 56, 62], radius=6, outline=c, width=4)
    # 提手
    d.arc([30, 14, 50, 34], start=200, end=-20, fill=c, width=4)
    # 装饰线
    d.line([(24, 42), (56, 42)], fill=c, width=3)
    return img


def icon_chat(color):
    img = canvas()
    d = ImageDraw.Draw(img)
    c = hex_rgb(color)
    d.rounded_rectangle([18, 18, 58, 50], radius=10, outline=c, width=4)
    d.polygon([(28, 50), (34, 62), (38, 50)], fill=c)
    # 三个点
    for x in (30, 40, 50):
        d.ellipse([x - 2, 30, x + 2, 34], fill=c)
    return img


def icon_user(color):
    img = canvas()
    d = ImageDraw.Draw(img)
    c = hex_rgb(color)
    d.ellipse([30, 16, 50, 36], outline=c, width=4)
    d.arc([22, 34, 58, 68], start=200, end=-20, fill=c, width=4)
    return img


ICONS = [
    ('home', icon_home),
    ('shop', icon_shop),
    ('chat', icon_chat),
    ('user', icon_user),
]

if __name__ == '__main__':
    for name, fn in ICONS:
        save(fn(COLOR_NORMAL), f'{name}.png')
        save(fn(COLOR_ACTIVE), f'{name}-active.png')
    print(f'Generated {len(ICONS) * 2} icons -> {OUT}')
