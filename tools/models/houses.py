# Типовые дома Тель-Авива для 3D-квартала (Blender без окна, bpy).
#   python3 tools/models/houses.py [имя ...] [--render папка]
# Без имён строит всё. Пишет assets/models/houses.js (window.GEN_MODELS).
#
# Семь типов, у каждого несколько вариантов (свой seed): размеры, этажность,
# цвет штукатурки, балконы (открытые, закрытые, со ставнями-трисим), мазганы,
# бельё, растения и крыши (бойлеры, баки, перголы) — чтобы дома не повторялись:
#   bauhaus  — «Белый город»: скруглённые балконы, ленточные окна, «термометр» лестницы
#   shikun   — дом 1960–70-х на сваях: закрытые балконы, трисим, решётка лестницы, бойлеры
#   eclectic — эклектика 1920-х: арки лавок, высокие окна с зелёными ставнями, карниз
#   stone    — дом 1980–90-х в иерусалимском камне, угловые балконы, пентхаус
#   shops    — дом с лавками внизу (Алленби, Дизенгоф): витрины, маркизы, вывески
#   tama     — «ТАМА-38»: старый дом с надстройкой и стеклянной шахтой лифта
#   tower    — новая жилая башня: белые балконы и стекло
# Фасад к улице — −Y Blender, центр участка — начало координат.
import sys, os, math, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (reset, box, prism, arc_wall, plate, rect, arch, window, ac_unit, on_wall, SIDES,
                 export_data, render, RND)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PAL = {
    'white': (0.94, 0.93, 0.90), 'cream': (0.93, 0.88, 0.76), 'pink': (0.93, 0.78, 0.74), 'blue': (0.74, 0.82, 0.86),
    'beige': (0.85, 0.79, 0.68), 'grey': (0.70, 0.70, 0.68), 'ochre': (0.87, 0.70, 0.46), 'salmon': (0.90, 0.64, 0.52),
    'mint': (0.76, 0.86, 0.78), 'stone': (0.89, 0.82, 0.66), 'stoneD': (0.80, 0.72, 0.57), 'trim': (0.95, 0.92, 0.84),
    'concrete': (0.66, 0.65, 0.62), 'concreteD': (0.50, 0.49, 0.47), 'mosaic': (0.55, 0.47, 0.40),
    'glass': (0.20, 0.27, 0.32), 'glassB': (0.36, 0.52, 0.62), 'metal': (0.60, 0.62, 0.64), 'metalD': (0.25, 0.26, 0.28),
    'roof': (0.72, 0.70, 0.66), 'tar': (0.30, 0.30, 0.31), 'tiles': (0.72, 0.36, 0.22),
    'shutter': (0.86, 0.85, 0.80), 'shutterG': (0.24, 0.45, 0.32), 'wood': (0.45, 0.30, 0.18), 'rail': (0.30, 0.31, 0.32),
    'railW': (0.92, 0.92, 0.90), 'boiler': (0.20, 0.30, 0.45), 'tank': (0.90, 0.90, 0.88), 'dark': (0.12, 0.13, 0.15),
    'acwhite': (0.92, 0.92, 0.90), 'acgrille': (0.45, 0.46, 0.47), 'pipe': (0.85, 0.85, 0.83), 'frame': (0.86, 0.86, 0.84),
    'plant': (0.25, 0.48, 0.22), 'plantD': (0.17, 0.36, 0.17), 'bougain': (0.85, 0.22, 0.55), 'pot': (0.70, 0.38, 0.25),
    'cloth1': (0.85, 0.20, 0.20), 'cloth2': (0.20, 0.45, 0.80), 'cloth3': (0.95, 0.85, 0.30), 'cloth4': (0.95, 0.95, 0.95),
    'awn1': (0.80, 0.20, 0.18), 'awn2': (0.20, 0.50, 0.30), 'awn3': (0.20, 0.35, 0.65), 'signbg': (0.15, 0.30, 0.60),
    'numsign': (0.12, 0.30, 0.65), 'cladding': (0.30, 0.31, 0.33), 'tilesW': (0.88, 0.88, 0.86), 'graffiti': (0.6, 0.6, 0.6),
    'lamp': (1.0, 0.95, 0.8), 'brick': (0.70, 0.40, 0.28),
    **{f'shop{i}': (0.8, 0.8, 0.8) for i in range(1, 9)}, 'sign1': (0.9, 0.9, 0.9), 'sign2': (0.9, 0.9, 0.9),
}
MODELS = {}
R = random.Random(1)
FH = 3.0  # высота этажа


def model(name, *seeds):
    def deco(fn):
        for i, s in enumerate(seeds):
            MODELS[f'{name}_{i + 1}'] = (fn, s)
        return fn
    return deco


def pick(*a):
    return R.choice(a)


# ---------------------------------------------------------------- детали
def parapet(x0, y0, x1, y1, z, h, t, m):
    box(x0, y0, z, x1, y0 + t, z + h, m); box(x0, y1 - t, z, x1, y1, z + h, m)
    box(x0, y0 + t, z, x0 + t, y1 - t, z + h, m); box(x1 - t, y0 + t, z, x1, y1 - t, z + h, m)
    box(x0 - 0.05, y0 - 0.05, z + h, x1 + 0.05, y1 + 0.05, z + h + 0.06, 'trim')


def flat_roof(x0, y0, x1, y1, z, wall, ph=0.9):
    box(x0 + 0.1, y0 + 0.1, z, x1 - 0.1, y1 - 0.1, z + 0.05, pick('roof', 'tar', 'roof'))
    parapet(x0, y0, x1, y1, z, ph, 0.2, wall)


def solar(x, y, z, rot=0):
    """Солнечный бойлер (дуд шемеш): наклонная панель на раме и белый бак."""
    import math as m
    box(x - 0.95, y - 0.55, z + 0.05, x + 0.95, y + 0.35, z + 0.15, 'metalD')
    # панель наклонена к югу
    import bmesh
    from lib import _obj
    from mathutils import Vector
    bm = bmesh.new()
    q = [(x - 0.9, y - 0.5, z + 0.2), (x + 0.9, y - 0.5, z + 0.2), (x + 0.9, y + 0.4, z + 0.85), (x - 0.9, y + 0.4, z + 0.85)]
    v = [bm.verts.new(p) for p in q] + [bm.verts.new((a, b, c - 0.06)) for a, b, c in q]
    for f in [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _obj('panel', bm, 'boiler')
    prism(x, y + 0.75, z + 0.3, z + 1.25, 0.32, 0.32, 8, 'tank', rot=0)
    for sx in (-0.8, 0.8):
        box(x + sx - 0.03, y + 0.3, z, x + sx + 0.03, y + 0.4, z + 0.85, 'metalD')


def water_tank(x, y, z, r=0.6, h=1.2):
    prism(x, y, z, z + 0.3, 0.08, 0.08, 4, 'metalD')
    prism(x, y, z + 0.3, z + 0.3 + h, r, r, 10, pick('tank', 'concrete', 'metal'))


def roof_stuff(x0, y0, x1, y1, z, wall, n_boilers=None, room=True):
    flat_roof(x0, y0, x1, y1, z, wall)
    w, d = x1 - x0, y1 - y0
    if room:  # выход на крышу / машинное отделение лифта
        rw, rd = min(3.2, w * 0.3), min(3.0, d * 0.35)
        rx = x0 + w * pick(0.55, 0.62, 0.25)
        box(rx, y1 - rd - 0.5, z, rx + rw, y1 - 0.5, z + 2.6, wall)
        box(rx - 0.1, y1 - rd - 0.6, z + 2.6, rx + rw + 0.1, y1 - 0.4, z + 2.75, 'concrete')
        window((rx, y1 - rd - 0.5, rx + rw, y1 - 0.5), 'S', rw * 0.5, z + 0.1, 0.9, 2.1, 'door', frame='metal', sill=None)
    n = n_boilers if n_boilers is not None else R.randint(2, 6)
    for i in range(n):
        bx = x0 + 1.4 + (i % 4) * 2.2
        by = y0 + 1.2 + (i // 4) * 2.0
        if bx < x1 - 1.2:
            solar(bx, by, z + 0.05)
    if R.random() < 0.6:
        water_tank(x1 - 1.3, y0 + 1.3, z + 0.05)
    if R.random() < 0.5:  # антенна
        prism(x0 + 0.8, y1 - 0.8, z, z + 3.5, 0.03, 0.03, 4, 'metalD')
        box(x0 + 0.3, y1 - 0.83, z + 3.0, x0 + 1.3, y1 - 0.77, z + 3.05, 'metalD')


def plants(x, y, z, k=1.0):
    prism(x, y, z, z + 0.35, 0.2 * k, 0.25 * k, 6, 'pot')
    prism(x, y, z + 0.35, z + 0.35 + 0.6 * k, 0.32 * k, 0.12 * k, 6, pick('plant', 'plantD', 'plant'))


def laundry(x0, x1, y, z):
    """Сушилка с бельём на балконе / под окном."""
    box(x0, y - 0.02, z, x1, y + 0.02, z + 0.02, 'pipe')
    x = x0 + 0.15
    while x < x1 - 0.4:
        w = R.uniform(0.25, 0.55)
        box(x, y - 0.01, z - R.uniform(0.35, 0.7), x + w, y + 0.01, z, pick('cloth1', 'cloth2', 'cloth3', 'cloth4', 'cloth4'))
        x += w + R.uniform(0.08, 0.3)


def rail(x0, x1, y, z, h=1.0, m='rail'):
    """Металлические перила вдоль x."""
    box(x0, y - 0.03, z + h - 0.05, x1, y + 0.03, z + h, m)
    box(x0, y - 0.02, z + 0.1, x1, y + 0.02, z + 0.14, m)
    n = max(2, int((x1 - x0) / 0.9))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        box(x - 0.02, y - 0.02, z, x + 0.02, y + 0.02, z + h, m)


def entrance(cx, y, w=1.6, canopy=True, num=True):
    """Подъезд: стеклянная дверь в раме, козырёк, синяя табличка с номером дома."""
    plate(rect(w + 0.4, 2.6), (cx, y, 0), (1, 0, 0), (0, -1, 0), 0.04, 'trim')
    plate(rect(w, 2.3), (cx, y - 0.04, 0.05), (1, 0, 0), (0, -1, 0), 0.04, 'dark', 'door', lit=True)
    if canopy:
        box(cx - w / 2 - 0.5, y - 1.2, 2.7, cx + w / 2 + 0.5, y, 2.85, 'concrete')
    if num:
        plate(rect(0.45, 0.3), (cx + w / 2 + 0.55, y - 0.04, 1.8), (1, 0, 0), (0, -1, 0), 0.03, 'numsign')
    prism(cx - w / 2 - 0.35, y - 0.2, 2.25, 2.4, 0.08, 0.08, 6, 'lamp')


def side_windows(rect4, sides, nfl, z0, kind_pool, ac=0.4, w=1.1, h=1.3, step=3.2):
    """Окна по бокам и сзади с мазганами."""
    x0, y0, x1, y1 = rect4
    for s in sides:
        (ox, oy), u, n, L = SIDES[s](*rect4)
        k = max(1, int(L / step))
        for f in range(nfl):
            z = z0 + f * FH + 0.95
            for i in range(k):
                t = (i + 0.5) / k * L
                window(rect4, s, t, z, w, h, R.choice(kind_pool))
                if R.random() < ac:
                    ac_unit(rect4, s, t + w / 2 + 0.6 if t + w / 2 + 1.0 < L else t - w / 2 - 0.6, z - 0.4)


# ---------------------------------------------------------------- 1. баухауз
@model('bauhaus', 11, 12, 13, 14)
def bauhaus(seed):
    W = pick(13.0, 14.0, 15.5); D = pick(12.0, 13.0); nf = pick(3, 3, 4)
    wall = pick('white', 'cream', 'white', 'pink', 'blue', 'mint')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    pil = R.random() < 0.6           # на сваях (колонны внизу)
    z0 = 0.0
    if pil:
        for x in (x0 + 0.4, 0, x1 - 0.4):
            for y in (y0 + 0.4, y1 - 0.4):
                prism(x, y, 0, FH, 0.2, 0.2, 10, wall)
        box(-2.4, y0 + 1.6, 0, 2.4, y1 - 1.5, FH, pick('stone', 'tilesW', wall))
        entrance(0, y0 + 1.6)
        box(x0, y0, FH - 0.05, x1, y1, FH + 0.25, wall)
        z0 = FH
        nb = nf - 1
    else:
        box(x0, y0, 0, x1, y1, FH, wall)
        entrance(0, y0)
        for t in (2.2, W - 2.2):
            window((x0, y0, x1, y1), 'S', t, 0.9, 1.6, 1.3, pick('blinds', 'trisHalf'))
        nb = nf - 1
        z0 = FH
    zt = z0 + nb * FH
    box(x0, y0, z0, x1, y1, zt, wall)
    # «термометр» — вертикальное окно лестницы по центру фасада
    therm = R.random() < 0.7
    if therm:
        plate(rect(1.0, nb * FH - 0.6), (0, y0, z0 + 0.3), (1, 0, 0), (0, -1, 0), 0.06, 'dark', 'modern', lit=True)
        plate(rect(1.3, nb * FH - 0.3), (0, y0, z0 + 0.15), (1, 0, 0), (0, -1, 0), 0.03, 'trim')
    # балконы: по краям фасада — скруглённые («ленточные»)
    rounded = R.random() < 0.7
    bw = (W / 2 - 1.2) if therm else W / 2 - 0.4
    for f in range(nb):
        z = z0 + f * FH
        for sgn in (-1, 1):
            cx = sgn * (W / 2 - bw / 2)
            bx0, bx1 = cx - bw / 2, cx + bw / 2
            dep = 1.4
            box(bx0, y0 - dep, z, bx1, y0, z + 0.18, wall)
            box(bx0, y0 - dep, z + 0.18, bx1, y0 - dep + 0.15, z + 1.05, wall)
            if rounded:
                ex = bx1 if sgn > 0 else bx0
                a0, a1 = (-math.pi / 2, 0) if sgn > 0 else (math.pi, 1.5 * math.pi)
                prism(ex, y0, z, z + 0.18, dep, dep, 8, wall, a0=a0, a1=a1)
                arc_wall(ex, y0, z + 0.18, z + 1.05, dep, 0.15, a0, a1, 8, wall)
            else:
                box(bx0 if sgn < 0 else bx1 - 0.15, y0 - dep, z + 0.18, bx0 + 0.15 if sgn < 0 else bx1, y0, z + 1.05, wall)
            # двери на балкон и окно
            window((x0, y0, x1, y1), 'S', cx - bw * 0.2 + W / 2, z + 0.02, 1.0, 2.2, pick('door', 'curtain', 'blinds'), sill=None)
            window((x0, y0, x1, y1), 'S', cx + bw * 0.22 + W / 2, z + 1.0, 1.4, 1.2, pick('blinds', 'alu', 'trisHalf'))
            box(bx0, y0 - 0.25, z + FH - 0.25, bx1, y0, z + FH - 0.15, 'trim')   # козырёк-полка
            r = R.random()
            if r < 0.3:
                plants(cx + bw * 0.35, y0 - 0.5, z + 0.18)
            elif r < 0.45:
                laundry(bx0 + 0.3, bx1 - 0.3, y0 - 0.9, z + 1.9)
    # ленточные окна сзади и по бокам
    for s in 'NEW':
        (ox, oy), u, n, L = SIDES[s](x0, y0, x1, y1)
        for f in range(nb):
            z = z0 + f * FH + 0.9
            plate(rect(L * 0.7, 1.15), (ox + u[0] * L / 2, oy + u[1] * L / 2, z), u, n, 0.05, 'dark', pick('blinds', 'alu', 'blinds'))
            plate(rect(L * 0.74, 0.12), (ox + u[0] * L / 2, oy + u[1] * L / 2, z + 1.25), u, n, 0.3, 'trim')
            if R.random() < 0.5:
                ac_unit((x0, y0, x1, y1), s, L * 0.88, z - 0.3)
    # крыша: пергола на террасе, бойлеры
    roof_stuff(x0, y0, x1, y1, zt, wall, n_boilers=R.randint(2, 4))
    if R.random() < 0.5:
        for i in range(6):
            box(x0 + 0.6 + i * 0.7, y0 + 0.4, zt + 2.3, x0 + 0.68 + i * 0.7, y0 + 3.6, zt + 2.4, 'wood')
        for x in (x0 + 0.6, x0 + 4.1):
            for y in (y0 + 0.5, y0 + 3.5):
                box(x - 0.06, y - 0.06, zt, x + 0.06, y + 0.06, zt + 2.3, 'wood')
    return W, D


# ---------------------------------------------------------------- 2. шикун 60-х на сваях
@model('shikun', 21, 22, 23, 24)
def shikun(seed):
    W = pick(16.0, 18.0, 20.0); D = pick(12.0, 13.0); nf = pick(4, 4, 5)
    wall = pick('beige', 'grey', 'cream', 'grey', 'salmon')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    # сваи и парковка внизу; лобби и стена с почтовыми ящиками
    for x in [x0 + 0.5 + i * (W - 1) / 3 for i in range(4)]:
        for y in (y0 + 0.5, y1 - 0.5):
            box(x - 0.25, y - 0.25, 0, x + 0.25, y + 0.25, FH, 'concrete')
    box(-2.2, y0 + 2.0, 0, 2.2, y1 - 0.8, FH, pick('mosaic', 'stone', wall))
    entrance(0, y0 + 2.0, canopy=False)
    box(x0, y0, FH - 0.1, x1, y1, FH + 0.2, 'concrete')
    z0 = FH
    zt = z0 + (nf - 1) * FH
    box(x0, y0, z0, x1, y1, zt, wall)
    # лестница: решётка из бетонных блоков (выступ по центру фасада)
    box(-1.6, y0 - 0.35, z0, 1.6, y0, zt + 0.4, wall)
    for f in range(nf - 1):
        for i in range(4):
            for j in range(3):
                plate(rect(0.55, 0.55), (-1.2 + i * 0.8, y0 - 0.35, z0 + f * FH + 0.6 + j * 0.75), (1, 0, 0), (0, -1, 0), 0.05, 'concrete')
    # балконы по сторонам от лестницы: у каждого своя судьба
    bw = (W - 3.2) / 2 - 0.3
    for f in range(nf - 1):
        z = z0 + f * FH
        for sgn in (-1, 1):
            cx = sgn * (1.6 + 0.3 + bw / 2)
            bx0, bx1 = cx - bw / 2, cx + bw / 2
            dep = 1.5
            state = R.random()
            box(bx0, y0 - dep, z, bx1, y0, z + 0.2, 'concrete')
            par = pick('mosaic', 'concrete', wall, 'rail')
            if par == 'rail':
                rail(bx0, bx1, y0 - dep + 0.03, z + 0.2)
            else:
                box(bx0, y0 - dep, z + 0.2, bx1, y0 - dep + 0.12, z + 1.1, par)
            for side_x in (bx0, bx1 - 0.12):
                box(side_x, y0 - dep, z + 0.2, side_x + 0.12, y0, z + 1.1, 'concrete')
            if state < 0.55:
                # закрытый балкон (сгират мирпесет): алюминиевые окна и трисим
                n = max(2, int(bw / 1.3))
                for i in range(n):
                    t = bx0 + (i + 0.5) * bw / n
                    plate(rect(bw / n - 0.06, FH - 1.3), (t, y0 - dep + 0.12, z + 1.1), (1, 0, 0), (0, -1, 0), 0.04, 'dark',
                          pick('alu', 'trisHalf', 'trisShut', 'curtain', 'trisHalf'))
                box(bx0, y0 - dep, z + FH - 0.2, bx1, y0, z + FH, 'concrete')
            else:
                window((x0, y0, x1, y1), 'S', cx - bw * 0.2 + W / 2, z + 0.2, 1.2, 2.2, pick('door', 'trisHalf', 'trisShut'), sill=None)
                window((x0, y0, x1, y1), 'S', cx + bw * 0.28 + W / 2, z + 1.0, 1.1, 1.2, pick('alu', 'trisHalf'))
                if state < 0.75:
                    laundry(bx0 + 0.3, bx1 - 0.3, y0 - dep + 0.25, z + 1.4)
                elif state < 0.9:
                    plants(bx0 + 0.5, y0 - dep + 0.5, z + 0.2)
                    plants(bx1 - 0.6, y0 - dep + 0.5, z + 0.2, 0.8)
                if R.random() < 0.5:
                    ac_unit((x0, y0, x1, y1), 'S', cx - bw * 0.45 + W / 2, z + 2.2)
    side_windows((x0, y0, x1, y1), 'EWN', nf - 1, z0, ['alu', 'trisHalf', 'trisShut', 'blinds'], ac=0.45, step=3.0)
    roof_stuff(x0, y0, x1, y1, zt, wall, n_boilers=R.randint(5, 8))
    return W, D


# ---------------------------------------------------------------- 3. эклектика 1920-х
@model('eclectic', 31, 32, 33)
def eclectic(seed):
    W = pick(12.0, 13.0, 14.0); D = pick(11.0, 12.0); nf = pick(2, 3, 3)
    wall = pick('ochre', 'salmon', 'pink', 'cream')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    zt = nf * FH + 0.6
    box(x0, y0, 0, x1, y1, zt, wall)
    # цоколь и карнизы
    box(x0 - 0.08, y0 - 0.08, 0, x1 + 0.08, y1 + 0.08, 0.6, 'stoneD')
    for f in range(1, nf):
        box(x0 - 0.12, y0 - 0.12, f * FH + 0.3, x1 + 0.12, y1 + 0.12, f * FH + 0.55, 'trim')
    box(x0 - 0.25, y0 - 0.25, zt - 0.3, x1 + 0.25, y1 + 0.25, zt, 'trim')
    # первый этаж: арки — лавки или окна
    n = 3 if W < 13 else 4
    shops = R.random() < 0.6
    for i in range(n):
        t = (i + 0.5) / n * W
        p, u, nn, L = on_wall((x0, y0, x1, y1), 'S', t, 0)
        plate(arch(2.3, 3.3), p, u, nn, 0.06, 'trim')
        if shops and i != n // 2:
            plate(arch(2.0, 3.1), (p[0], p[1] - 0.06, 0), u, nn, 0.03, f'shop{R.randint(1, 8)}')
        elif i == n // 2:
            plate(arch(1.6, 2.9), (p[0], p[1] - 0.06, 0), u, nn, 0.03, 'wood')
            plate(rect(0.35, 0.25), (p[0] + 1.1, p[1] - 0.06, 1.9), u, nn, 0.03, 'numsign')
        else:
            plate(arch(1.4, 2.6), (p[0], p[1] - 0.06, 0.6), u, nn, 0.04, 'dark', 'shutterG')
    # верхние этажи: высокие окна с зелёными ставнями
    for f in range(1, nf):
        z = f * FH + 0.75
        for s in 'SNEW':
            (ox, oy), u, nn, L = SIDES[s](x0, y0, x1, y1)
            k = max(2, int(L / 2.8))
            for i in range(k):
                t = (i + 0.5) / k * L
                pp = (ox + u[0] * t, oy + u[1] * t, z)
                shut = R.random()
                plate(arch(1.25, 2.25), (pp[0], pp[1], z - 0.1), u, nn, 0.04, 'trim')
                plate(arch(1.0, 2.0), pp, u, nn, 0.06, 'dark', 'shutterG' if shut < 0.5 else pick('curtain', 'alu'))
                if shut >= 0.5:  # ставни распахнуты
                    for sg in (-1, 1):
                        plate(rect(0.5, 2.0), (pp[0] + u[0] * sg * 0.8, pp[1] + u[1] * sg * 0.8, z), u, nn, 0.08, 'shutterG')
        # кованый балкон по центру фасада
        bw = 3.4
        box(-bw / 2, y0 - 1.0, f * FH + 0.6, bw / 2, y0, f * FH + 0.75, 'stoneD')
        for x in (-bw / 2 + 0.2, bw / 2 - 0.2):
            box(x - 0.08, y0 - 0.5, f * FH + 0.3, x + 0.08, y0, f * FH + 0.6, 'trim')
        rail(-bw / 2, bw / 2, y0 - 0.97, f * FH + 0.75, 1.0, 'rail')
        if R.random() < 0.5:
            plants(bw / 2 - 0.4, y0 - 0.6, f * FH + 0.75, 0.7)
    # аттик с фронтоном и балюстрадой
    plate([(-2.2, 0), (2.2, 0), (2.2, 0.9), (0, 1.6), (-2.2, 0.9)], (0, y0 - 0.1, zt), (1, 0, 0), (0, -1, 0), 0.25, 'trim')
    for x in [x0 + 0.5 + i * 0.6 for i in range(int(W / 0.6) - 1)]:
        if abs(x) > 2.3:
            prism(x, y0 + 0.05, zt, zt + 0.7, 0.08, 0.06, 6, 'trim')
    box(x0, y0, zt + 0.7, -2.2, y0 + 0.2, zt + 0.82, 'trim'); box(2.2, y0, zt + 0.7, x1, y0 + 0.2, zt + 0.82, 'trim')
    box(x0 + 0.1, y0 + 0.3, zt, x1 - 0.1, y1 - 0.1, zt + 0.05, 'roof')
    parapet(x0, y0 + 0.2, x1, y1, zt, 0.6, 0.2, wall)
    if R.random() < 0.6:  # черепичная надстройка-мансарда
        from lib import _obj
        import bmesh
        bm = bmesh.new()
        a, b, c, d, h = x0 + 2, y0 + 2.5, x1 - 2, y1 - 1, 1.8
        v = [bm.verts.new(p) for p in [(a, b, zt), (c, b, zt), (c, d, zt), (a, d, zt), (a, (b + d) / 2, zt + h), (c, (b + d) / 2, zt + h)]]
        for f in [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (3, 2, 1, 0)]:
            bm.faces.new([v[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        _obj('roof', bm, 'tiles')
    else:
        solar(x1 - 2.0, y1 - 2.0, zt + 0.05)
    return W, D


# ---------------------------------------------------------------- 4. дом в иерусалимском камне
@model('stone', 41, 42, 43)
def stone(seed):
    W = pick(16.0, 17.0, 18.0); D = pick(14.0, 15.0); nf = pick(6, 7, 8)
    wall = pick('stone', 'stone', 'stoneD')
    acc = pick('white', 'grey', 'cream')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    # первый этаж: колонны, стеклянное лобби, парковка
    for x in (x0 + 0.4, x0 + W * 0.33, x0 + W * 0.66, x1 - 0.4):
        prism(x, y0 + 0.4, 0, FH, 0.28, 0.28, 10, wall)
    box(-3.0, y0 + 1.5, 0, 3.0, y1 - 1.0, FH, 'stoneD')
    plate(rect(5.4, 2.6), (0, y0 + 1.5, 0.05), (1, 0, 0), (0, -1, 0), 0.05, 'dark', 'modern', lit=True)
    plate(rect(0.45, 0.3), (3.3, y0 + 1.45, 1.9), (1, 0, 0), (0, -1, 0), 0.03, 'numsign')
    box(x0, y0, FH - 0.1, x1, y1, FH + 0.25, 'concrete')
    z0 = FH
    top = nf - 1                     # пентхаус — отдельный уровень
    zt = z0 + (top - 1) * FH
    box(x0, y0, z0, x1, y1, zt, wall)
    # угловые балконы с белыми перилами или стеклом, окна, мазганы
    cw = pick(4.5, 5.0)
    for f in range(top - 1):
        z = z0 + f * FH
        for sgn in (-1, 1):
            bx0, bx1 = (x0, x0 + cw) if sgn < 0 else (x1 - cw, x1)
            box(bx0 - (0.3 if sgn < 0 else 0), y0 - 1.6, z, bx1 + (0.3 if sgn > 0 else 0), y0, z + 0.22, acc)
            if R.random() < 0.5:
                rail(bx0, bx1, y0 - 1.55, z + 0.22, 1.0, 'railW')
            else:
                plate(rect(cw, 1.0), ((bx0 + bx1) / 2, y0 - 1.6, z + 0.22), (1, 0, 0), (0, -1, 0), 0.04, 'glassB')
            window((x0, y0, x1, y1), 'S', (bx0 + bx1) / 2 - x0, z + 0.25, 2.4, 2.2, pick('door', 'curtain', 'blinds', 'door'), sill=None)
            if R.random() < 0.35:
                plants(bx0 + 0.6, y0 - 1.0, z + 0.22)
        for t in (W * 0.42, W * 0.58):
            window((x0, y0, x1, y1), 'S', t, z + 1.0, 1.3, 1.3, pick('alu', 'blinds', 'trisHalf'), frame='metal')
        if R.random() < 0.6:
            ac_unit((x0, y0, x1, y1), 'S', W * 0.5, z + 0.6)
    side_windows((x0, y0, x1, y1), 'EWN', top - 1, z0, ['alu', 'blinds', 'trisHalf', 'curtain'], ac=0.5, step=3.4)
    # пентхаус с перголой и террасой
    box(x0, y0, zt, x1, y1, zt + 0.25, 'concrete')
    rail(x0, x1, y0 + 0.1, zt + 0.25, 1.1, 'railW')
    box(x0 + 2.5, y0 + 3.5, zt + 0.25, x1 - 1.5, y1 - 0.5, zt + 0.25 + FH, acc)
    plate(rect(W - 6, 2.4), (0.5, y0 + 3.5, zt + 0.3), (1, 0, 0), (0, -1, 0), 0.05, 'dark', 'modern')
    for i in range(int((W - 4) / 0.7)):
        box(x0 + 2.5 + i * 0.7, y0 + 0.6, zt + 2.9, x0 + 2.58 + i * 0.7, y0 + 3.5, zt + 3.0, pick('wood', 'metal'))
    for x in (x0 + 2.6, x1 - 1.6):
        box(x - 0.08, y0 + 0.6, zt + 0.25, x + 0.08, y0 + 0.76, zt + 2.9, 'metal')
    plants(x0 + 1.2, y0 + 1.0, zt + 0.25, 1.3)
    roof_stuff(x0 + 2.5, y0 + 3.5, x1 - 1.5, y1 - 0.5, zt + 0.25 + FH, acc, n_boilers=R.randint(3, 6), room=False)
    return W, D


# ---------------------------------------------------------------- 5. дом с лавками
@model('shops', 51, 52, 53, 54)
def shops(seed):
    W = pick(16.0, 18.0, 20.0); D = pick(13.0, 14.0); nf = pick(3, 4, 4)
    wall = pick('beige', 'grey', 'cream', 'white', 'salmon')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    zt = nf * FH + 0.6
    box(x0, y0, 0, x1, y1, zt, wall)
    # лавки: витрина-картинка, вывеска, маркиза, ночью свет
    n = int(W / 4.5)
    sw = W / n
    for i in range(n):
        cx = x0 + (i + 0.5) * sw
        if i == n // 2 and n > 2:
            entrance(cx, y0, 1.4, canopy=False)
            continue
        plate(rect(sw - 0.3, 3.0), (cx, y0, 0), (1, 0, 0), (0, -1, 0), 0.03, 'trim')
        plate(rect(sw - 0.6, 2.75), (cx, y0 - 0.03, 0.02), (1, 0, 0), (0, -1, 0), 0.03, f'shop{R.randint(1, 8)}')
        awn = pick('awn1', 'awn2', 'awn3', None)
        if awn:
            plate([(-(sw - 0.5) / 2, 0), ((sw - 0.5) / 2, 0), ((sw - 0.5) / 2, 0.08), (-(sw - 0.5) / 2, 0.08)], (cx, y0, 3.05), (1, 0, 0), (0, -1, 0), 1.2, awn)
            box(cx - (sw - 0.5) / 2, y0 - 1.25, 2.75, cx + (sw - 0.5) / 2, y0 - 1.2, 3.1, awn)
    box(x0 - 0.1, y0 - 0.15, 3.15, x1 + 0.1, y1 + 0.1, 3.4, 'concrete')
    # верхние этажи — вперемешку: балконы, закрытые балконы, окна, бельё, мазганы
    for f in range(1, nf):
        z = f * FH + 0.6
        k = int(W / 3.6)
        for i in range(k):
            t = (i + 0.5) / k * W
            cx = x0 + t
            r = R.random()
            if r < 0.35:
                bw = 3.0
                box(cx - bw / 2, y0 - 1.1, z - 0.2, cx + bw / 2, y0, z, 'concrete')
                rail(cx - bw / 2, cx + bw / 2, y0 - 1.07, z, 1.0, pick('rail', 'railW'))
                window((x0, y0, x1, y1), 'S', t, z + 0.02, 1.2, 2.2, pick('door', 'trisHalf', 'trisShut'), sill=None)
                if R.random() < 0.5:
                    laundry(cx - bw / 2 + 0.2, cx + bw / 2 - 0.2, y0 - 0.9, z + 1.8)
                elif R.random() < 0.5:
                    plants(cx + 1.0, y0 - 0.6, z)
            elif r < 0.55:
                bw = 3.0
                box(cx - bw / 2, y0 - 1.0, z - 0.2, cx + bw / 2, y0, z + FH - 0.4, pick(wall, 'grey', 'cream'))
                window((cx - bw / 2, y0 - 1.0, cx + bw / 2, y0), 'S', bw / 2, z + 0.9, bw - 0.4, 1.4, pick('alu', 'trisHalf', 'trisShut'), sill=None)
            else:
                window((x0, y0, x1, y1), 'S', t, z + 0.9, 1.3, 1.4, pick('alu', 'trisHalf', 'trisShut', 'curtain'))
                if R.random() < 0.5:
                    ac_unit((x0, y0, x1, y1), 'S', t + 1.2, z + 0.5)
    side_windows((x0, y0, x1, y1), 'EWN', nf - 1, FH + 0.6 - 0.95 + 0.95, ['alu', 'trisHalf', 'trisShut'], ac=0.5, step=3.2)
    if R.random() < 0.5:  # большая вывеска-реклама на крыше
        box(-3, y0 + 0.5, zt, -2.9, y0 + 0.6, zt + 1.6, 'metalD'); box(2.9, y0 + 0.5, zt, 3, y0 + 0.6, zt + 1.6, 'metalD')
        plate(rect(6.4, 2.4), (0, y0 + 0.45, zt + 1.4), (1, 0, 0), (0, -1, 0), 0.08, pick('sign1', 'sign2'))
    roof_stuff(x0, y0, x1, y1, zt, wall, n_boilers=R.randint(3, 7))
    return W, D


# ---------------------------------------------------------------- 6. ТАМА-38
@model('tama', 61, 62)
def tama(seed):
    W = pick(16.0, 18.0); D = 13.0; old = 4
    wall = pick('beige', 'grey', 'cream')
    new = pick('white', 'cladding', 'grey')
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    for x in [x0 + 0.5 + i * (W - 1) / 3 for i in range(4)]:
        for y in (y0 + 0.5, y1 - 0.5):
            box(x - 0.28, y - 0.28, 0, x + 0.28, y + 0.28, FH, 'concrete')
    box(-2.5, y0 + 2.2, 0, 2.5, y1 - 0.8, FH, 'stone')
    entrance(0, y0 + 2.2, canopy=False)
    box(x0, y0, FH - 0.1, x1, y1, FH + 0.2, 'concrete')
    zo = FH + (old - 1) * FH
    box(x0, y0, FH, x1, y1, zo, wall)
    # новые балконы на металлических консолях — прикручены к старому дому
    for f in range(old - 1):
        z = FH + f * FH
        for sgn in (-1, 1):
            cx = sgn * W / 4
            box(cx - 2.6, y0 - 1.8, z, cx + 2.6, y0, z + 0.2, 'cladding')
            plate(rect(5.2, 1.05), (cx, y0 - 1.8, z + 0.2), (1, 0, 0), (0, -1, 0), 0.03, 'glassB')
            window((x0, y0, x1, y1), 'S', cx + W / 2, z + 0.2, 2.6, 2.3, pick('door', 'modern', 'curtain'), frame='metalD', sill=None)
    side_windows((x0, y0, x1, y1), 'EWN', old - 1, FH, ['alu', 'trisHalf', 'modern'], ac=0.4)
    # надстройка: два этажа в другом стиле, большие окна
    zt = zo + 2 * FH
    box(x0 + 0.3, y0 + 0.3, zo, x1 - 0.3, y1 - 0.3, zt, new)
    for f in range(2):
        z = zo + f * FH
        k = int(W / 3)
        for i in range(k):
            window((x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.3), 'S', (i + 0.5) / k * (W - 0.6), z + 0.3, 2.2, 2.3, pick('modern', 'curtain', 'door'), frame='metalD', sill=None)
        box(x0 + 0.3, y0 - 0.9, z, x1 - 0.3, y0 + 0.3, z + 0.18, 'cladding')
        plate(rect(W - 0.6, 1.05), (0, y0 - 0.9, z + 0.18), (1, 0, 0), (0, -1, 0), 0.03, 'glassB')
    # стеклянная шахта лифта снаружи
    ex = pick(-1, 1) * (W / 2 - 1.4)
    box(ex - 1.1, y0 - 2.4, 0, ex + 1.1, y0 - 0.2, zt + 1.2, 'metalD')
    plate(rect(1.9, zt + 0.8), (ex, y0 - 2.4, 0.1), (1, 0, 0), (0, -1, 0), 0.03, 'glassB')
    roof_stuff(x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.3, zt, new, n_boilers=R.randint(4, 7))
    return W, D


# ---------------------------------------------------------------- 7. жилая башня
@model('tower', 71, 72)
def tower(seed):
    W = pick(20.0, 22.0); D = pick(18.0, 20.0); nf = pick(16, 18, 20)
    x0, y0, x1, y1 = -W / 2, -D / 2, W / 2, D / 2
    acc = pick('white', 'white', 'grey')
    # подиум с лобби
    box(x0 - 1, y0, 0, x1 + 1, y1, 0.3, 'stoneD')
    box(x0, y0 + 1.5, 0.3, x1, y1, FH * 1.5, pick('stone', 'cladding'))
    plate(rect(W - 4, FH * 1.5 - 0.6), (0, y0 + 1.5, 0.3), (1, 0, 0), (0, -1, 0), 0.05, 'dark', 'modern', lit=True)
    box(x0 - 0.5, y0, FH * 1.5, x1 + 0.5, y1, FH * 1.5 + 0.4, 'concrete')
    z0 = FH * 1.5 + 0.4
    zt = z0 + nf * FH
    box(x0 + 0.5, y0 + 0.5, z0, x1 - 0.5, y1 - 0.5, zt, 'glass')
    # каждый этаж: белая плита-балкон по периметру и стеклянные перила
    for f in range(nf):
        z = z0 + f * FH
        box(x0, y0 - 0.8, z, x1, y1 + 0.2, z + 0.3, acc)
        plate(rect(W, 1.0), (0, y0 - 0.8, z + 0.3), (1, 0, 0), (0, -1, 0), 0.02, 'glassB')
        for s in 'SNEW':
            (ox, oy), u, n, L = SIDES[s](x0 + 0.5, y0 + 0.5, x1 - 0.5, y1 - 0.5)
            k = int(L / 3.5)
            for i in range(k):
                t = (i + 0.5) / k * L
                plate(rect(3.0, 2.5), (ox + u[0] * t, oy + u[1] * t, z + 0.3), u, n, 0.02, 'dark', pick('modern', 'curtain', 'modern', 'blinds'))
    # белые вертикальные рёбра по углам и корона
    for x in (x0 + 0.5, x1 - 0.5):
        box(x - 0.4, y0 - 0.8, z0, x + 0.4, y0 + 0.2, zt + 3, acc)
    box(x0, y0 - 0.8, zt, x1, y1 + 0.2, zt + 0.5, acc)
    box(x0 + 2, y0 + 2, zt + 0.5, x1 - 2, y1 - 2, zt + 3.5, acc)
    for i in range(10):
        box(x0 + 0.5 + i * (W - 1) / 9, y0 - 0.8, zt + 2.5, x0 + 0.7 + i * (W - 1) / 9, y1 + 0.2, zt + 2.7, acc)
    prism(x0 + 3, y1 - 3, zt + 3.5, zt + 9, 0.05, 0.05, 4, 'metalD')
    return W, D


# ---------------------------------------------------------------- сборка
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_dir = sys.argv[sys.argv.index('--render') + 1] if '--render' in sys.argv else None
    if out_dir in args:
        args.remove(out_dir)
    names = [n for n in MODELS if not args or any(n.startswith(a) for a in args)]
    path = os.path.join(ROOT, 'assets', 'models', 'houses.js')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = {}
    if os.path.exists(path) and args:
        txt = open(path).read()
        data = json.loads(txt[txt.index('|| {}, ') + 7:txt.rindex(');')])
    for name in names:
        fn, seed = MODELS[name]
        reset(PAL)
        R.seed(seed); RND.seed(seed)
        w, d = fn(seed)
        e = export_data()
        e['w'], e['d'], e['kind'] = w, d, name.rsplit('_', 1)[0]
        data[name] = e
        print(f'{name}: {e["tris"]} треугольников, {w}×{d} м, высота {e["top"]} м')
        if out_dir:
            render(os.path.join(out_dir, name + '.png'), 'hero', 520)
    with open(path, 'w') as f:
        f.write('// Сгенерировано tools/models/houses.py — не править руками\n')
        f.write('window.GEN_MODELS = Object.assign(window.GEN_MODELS || {}, ' + json.dumps(data, sort_keys=True, separators=(',', ':')) + ');\n')


main()
