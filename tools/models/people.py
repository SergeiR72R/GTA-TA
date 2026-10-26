# Люди: игрок и прохожие из бесплатных моделей Quaternius (CC0):
#   Universal Base Characters (мужчина и женщина со скелетом) и
#   Universal Animation Library (ходьба, бег, удары, смерть, вождение…).
# Скрипт (Blender как модуль Python, pip install bpy):
#   1) упрощает тела (Decimate), объединяет кости пальцев с кистью;
#   2) «одевает» людей: одежда рисуется в текстуре по частям тела —
#      футболки, майки, рубашки, шорты, джинсы, платья, форма ЦАХАЛа, сандалии;
#   3) переносит анимации на скелеты (поворот каждой кости в мире — как в анимации);
#   4) пишет assets/models/people.js (window.GEN_PEOPLE) — игра читает его и с диска.
#   python3 tools/models/people.py <папка с паками Quaternius> [--render папка]
# В папке: «Universal Base Characters[Standard]» и «Universal Animation Library[Standard]».
import sys, os, math, json, base64, struct, io, random
import bpy, bmesh
import numpy as np
from mathutils import Matrix, Vector, Quaternion
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = [a for a in sys.argv[1:] if not a.startswith('--')][0]
UBC = os.path.join(SRC, 'Universal Base Characters[Standard]')
UAL = os.path.join(SRC, 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')
OUT_DIR = sys.argv[sys.argv.index('--render') + 1] if '--render' in sys.argv else None

BODY_TRIS = 3500
HAIR_TRIS = 500
TEX = 512

# кости, которые остаются (пальцы сливаются с кистью)
KEEP = ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head']
for s in 'lr':
    KEEP += [f'clavicle_{s}', f'upperarm_{s}', f'lowerarm_{s}', f'hand_{s}', f'thigh_{s}', f'calf_{s}', f'foot_{s}', f'ball_{s}']
MERGE = lambda n: ('hand_' + n[-1]) if any(n.startswith(p) for p in ('index', 'middle', 'ring', 'pinky', 'thumb')) else ('ball_' + n[-1] if n.startswith('ball_leaf') else n)

# анимации: имя в игре ← имя в библиотеке, шаг кадров
ANIMS = {
    'idle': 'Idle_Loop', 'talk': 'Idle_Talking_Loop', 'walk': 'Walk_Loop', 'walk2': 'Walk_Formal_Loop',
    'jog': 'Jog_Fwd_Loop', 'run': 'Sprint_Loop', 'drive': 'Driving_Loop', 'death': 'Death01',
    'jab': 'Punch_Jab', 'cross': 'Punch_Cross', 'hit': 'Hit_Chest', 'hitHead': 'Hit_Head',
    'jumpStart': 'Jump_Start', 'jump': 'Jump_Loop', 'land': 'Jump_Land', 'pistolIdle': 'Pistol_Idle_Loop',
    'shoot': 'Pistol_Shoot', 'aim': 'Pistol_Aim_Neutral', 'sit': 'Sitting_Idle_Loop', 'dance': 'Dance_Loop',
    'interact': 'Interact', 'crouch': 'Crouch_Idle_Loop', 'roll': 'Roll',
}
FPS = 15

C3 = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))   # Blender (x, y, z) → игра (x, z, −y)
C4 = C3.to_4x4()
conj = lambda M: C4 @ M @ C4.inverted()

# ---------------------------------------------------------------- одежда
# Цвета sRGB 0..255. Каждый наряд: тело (m/f), кожа (light/dark), волосы, цвет волос,
# верх (tee/tank/long/shirt/none), низ (long/shorts/skirt/dress), обувь (sneakers/sandals/boots/shoes)
OUTFITS = {
    # игрок: Лёва Гольдман — тельняшка-майка, джинсы, кеды, русые волосы, щетина
    'leva': dict(body='m', skin='light', hair='Hair_SimpleParted', hc=(120, 82, 48), beard=True,
                 top='tank', tc=(245, 245, 245), pat=('stripes', (30, 50, 110)), bottom='long', bc=(52, 72, 110), jeans=True,
                 shoes='sneakers', sc=(40, 40, 44)),
    'tlv_shorts': dict(body='m', skin='light', hair='Hair_Buzzed', hc=(40, 30, 25),
                       top='tee', tc=(220, 70, 60), bottom='shorts', bc=(200, 180, 140), shoes='sandals', sc=(70, 50, 35)),
    'hipster': dict(body='m', skin='light', hair='Hair_Buns', hc=(70, 45, 25), beard=True,
                    top='tee', tc=(45, 95, 60), bottom='long', bc=(35, 38, 45), jeans=True, shoes='sneakers', sc=(235, 235, 230)),
    'office': dict(body='m', skin='light', hair='Hair_SimpleParted', hc=(25, 20, 18),
                   top='shirt', tc=(235, 240, 245), bottom='long', bc=(40, 42, 50), shoes='shoes', sc=(30, 25, 22), belt=True),
    'soldier': dict(body='m', skin='dark', hair='Hair_Buzzed', hc=(20, 16, 14),
                    top='long', tc=(98, 104, 66), bottom='long', bc=(98, 104, 66), shoes='boots', sc=(28, 26, 24), belt=True),
    'ethiopian': dict(body='m', skin='dark', hair='Hair_Buzzed', hc=(15, 12, 10),
                      top='tee', tc=(240, 200, 60), bottom='long', bc=(60, 80, 120), jeans=True, shoes='sneakers', sc=(200, 40, 40)),
    'grandpa': dict(body='m', skin='light', hair='Hair_Buzzed', hc=(190, 190, 185), beard=True,
                    top='shirt', tc=(170, 190, 210), pat=('plaid', (120, 140, 170)), bottom='long', bc=(120, 105, 80), shoes='sandals', sc=(90, 60, 40), belt=True),
    'runner': dict(body='m', skin='light', hair='Hair_Buzzed', hc=(60, 40, 25),
                   top='tank', tc=(40, 120, 200), bottom='shorts', bc=(25, 25, 30), shoes='sneakers', sc=(240, 90, 40)),
    'arsit': dict(body='f', skin='light', hair='Hair_Long', hc=(25, 18, 14),
                  top='tank', tc=(240, 240, 240), bottom='long', bc=(25, 25, 30), shoes='sneakers', sc=(245, 245, 245)),
    'summer': dict(body='f', skin='light', hair='Hair_Long', hc=(200, 160, 90),
                   top='dress', tc=(240, 130, 150), pat=('dots', (250, 240, 240)), bottom='dress', bc=(240, 130, 150), shoes='sandals', sc=(160, 110, 70)),
    'student': dict(body='f', skin='light', hair='Hair_Buns', hc=(90, 50, 30),
                    top='tee', tc=(90, 150, 210), bottom='long', bc=(60, 85, 130), jeans=True, shoes='sneakers', sc=(240, 240, 240)),
    'soldierF': dict(body='f', skin='light', hair='Hair_Long', hc=(40, 28, 20),
                     top='long', tc=(98, 104, 66), bottom='long', bc=(98, 104, 66), shoes='boots', sc=(28, 26, 24), belt=True),
    'mom': dict(body='f', skin='dark', hair='Hair_Buns', hc=(20, 15, 12),
                top='tee', tc=(150, 60, 130), bottom='skirt', bc=(30, 30, 40), shoes='shoes', sc=(40, 30, 30)),
    'yogini': dict(body='f', skin='dark', hair='Hair_BuzzedFemale', hc=(30, 22, 18),
                   top='tank', tc=(80, 200, 170), bottom='long', bc=(60, 40, 90), shoes='sneakers', sc=(240, 240, 240)),
    # полиция (Мишмерет): тёмно-синяя рубашка, тёмные брюки, ботинки
    'cop': dict(body='m', skin='light', hair='Hair_Buzzed', hc=(30, 22, 18),
                top='shirt', tc=(38, 52, 92), bottom='long', bc=(28, 32, 48), shoes='boots', sc=(20, 20, 22), belt=True),
    'copF': dict(body='f', skin='light', hair='Hair_Buns', hc=(40, 28, 20),
                 top='shirt', tc=(38, 52, 92), bottom='long', bc=(28, 32, 48), shoes='boots', sc=(20, 20, 22), belt=True),
    'savta': dict(body='f', skin='light', hair='Hair_Buns', hc=(205, 205, 200),
                  top='long', tc=(150, 110, 150), bottom='skirt', bc=(70, 70, 90), shoes='shoes', sc=(50, 40, 40)),
}


# ---------------------------------------------------------------- загрузка
def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def apply_mod(o, mod):
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o], selected_editable_objects=[o]):
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
        bpy.ops.object.modifier_apply(modifier=mod.name)


def decimate(o, tris):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n > tris:
        m = o.modifiers.new('dec', 'DECIMATE')
        m.ratio = tris / n
        m.use_collapse_triangulate = True
        apply_mod(o, m)
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def load_body(kind):
    name = 'Superhero_Male_FullBody' if kind == 'm' else 'Superhero_Female_FullBody'
    objs = import_gltf(os.path.join(UBC, 'Base Characters', 'Godot - UE', name + '.gltf'))
    arm = [o for o in objs if o.type == 'ARMATURE'][0]
    meshes = [o for o in objs if o.type == 'MESH' and o.parent == arm]
    body = max(meshes, key=lambda o: len(o.data.polygons))
    eyes = [o for o in meshes if o is not body and 'Eye' in o.name and 'brow' not in o.name.lower()]
    for o in objs:
        if o.type == 'MESH' and o.parent != arm:
            bpy.data.objects.remove(o)
    return arm, body, eyes[0] if eyes else None


def b64(b):
    return base64.b64encode(b).decode()


# ---------------------------------------------------------------- скелет
def skeleton(arm):
    bones = []
    W = {b.name: conj(b.matrix_local) for b in arm.data.bones}
    for n in KEEP:
        b = arm.data.bones[n]
        p = b.parent.name if b.parent else None
        while p and p not in KEEP:
            p = arm.data.bones[p].parent.name if arm.data.bones[p].parent else None
        L = (W[p].inverted() @ W[n]) if p else W[n]
        t, q, _ = L.decompose()
        bones.append({'name': n, 'parent': KEEP.index(p) if p else -1,
                      'p': [round(x, 5) for x in t], 'q': [round(x, 6) for x in (q.x, q.y, q.z, q.w)]})
    return bones


# ---------------------------------------------------------------- геометрия со скином
def part_of(bname):
    n = MERGE(bname)
    if n in ('Head', 'neck_01'):
        return 'head'
    if n.startswith(('spine', 'clavicle')) or n == 'pelvis_up':
        return 'torso'
    if n == 'pelvis':
        return 'pelvis'
    for k in ('upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'):
        if n.startswith(k):
            return k
    return 'torso'


def mesh_data(o, arm, rigid_bone=None):
    """Вершины с разрезом по UV: позиции и нормали (в осях игры), uv, 4 кости и веса.
    Плюс для раскраски: позиции в осях Blender и часть тела у каждого треугольника."""
    me = o.data
    me.calc_loop_triangles()
    uvl = me.uv_layers.active.data
    gname = {g.index: g.name for g in o.vertex_groups}
    M = o.matrix_world
    N3 = M.to_3x3().inverted().transposed()
    try:
        cn = me.corner_normals
        lnor = lambda li: cn[li].vector
    except AttributeError:
        me.calc_normals_split()
        lnor = lambda li: me.loops[li].normal
    key, verts, idx, tri_part, bl = {}, [], [], [], []
    for lt in me.loop_triangles:
        tri = []
        wsum = {}
        for li in lt.loops:
            vi = me.loops[li].vertex_index
            uv = uvl[li].uv
            nrm = (N3 @ lnor(li)).normalized()
            k = (vi, round(uv.x, 4), round(uv.y, 4), round(nrm.x, 2), round(nrm.y, 2), round(nrm.z, 2))
            if k not in key:
                v = me.vertices[vi]
                if rigid_bone:
                    ws = [(KEEP.index(rigid_bone), 1.0)]
                else:
                    acc = {}
                    for g in v.groups:
                        bn = gname.get(g.group)
                        if bn is None or g.weight <= 0:
                            continue
                        bn = MERGE(bn)
                        if bn not in KEEP:
                            continue
                        acc[bn] = acc.get(bn, 0) + g.weight
                    ws = sorted(((KEEP.index(b), w) for b, w in acc.items()), key=lambda t: -t[1])[:4] or [(KEEP.index('pelvis'), 1.0)]
                p = M @ v.co
                key[k] = len(verts)
                verts.append((p, nrm, (uv.x, uv.y), ws))
            tri.append(key[k])
            for bi, w in verts[key[k]][3]:
                wsum[bi] = wsum.get(bi, 0) + w
        idx += tri
        tri_part.append(part_of(KEEP[max(wsum, key=wsum.get)]))
    pos = [c for p, *_ in verts for c in (C3 @ p)]
    nor = [c for _, n, *_ in verts for c in (C3 @ n)]
    uv = [c for *_, u, _ in verts for c in u]
    si, sw = [], []
    for *_, ws in verts:
        tot = sum(w for _, w in ws)
        q = [int(round(w / tot * 255)) for _, w in ws]
        q[0] += 255 - sum(q)
        ws4 = [b for b, _ in ws] + [0] * (4 - len(ws))
        q += [0] * (4 - len(q))
        si += ws4; sw += q
    clamp = lambda x: max(-32767, min(32767, x))
    data = {
        'n': len(verts),
        'pos': b64(struct.pack('<%dh' % len(pos), *[clamp(round(x * 1000)) for x in pos])),
        'nor': b64(struct.pack('<%db' % len(nor), *[max(-127, min(127, round(x * 127))) for x in nor])),
        'uv': b64(struct.pack('<%dH' % len(uv), *[max(0, min(65535, round(x * 65535))) for x in uv])),
        'si': b64(bytes(si)), 'sw': b64(bytes(sw)),
        'idx': b64(struct.pack('<%dH' % len(idx), *idx)),
    }
    raster = {'p': np.array([[v[0].x, v[0].y, v[0].z] for v in verts]), 'uv': np.array([v[2] for v in verts]),
              'tri': np.array(idx).reshape(-1, 3), 'part': tri_part}
    return data, raster


# ---------------------------------------------------------------- раскраска одежды
def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def paint(base, raster, o, size, H):
    """Красит одежду поверх кожи. base — RGB float 0..255 (size × size).
    H — опорные высоты тела (z в метрах): шея, талия, колено, щиколотка, плечо."""
    img = base.copy()
    L = lum(base)
    mean = np.median(L[L > 30])
    shade = np.clip((L / mean) ** 0.8, 0.55, 1.3)
    rng = np.random.default_rng(hash(o['top'] + o['bottom']) & 0xffff)
    noise = rng.normal(1.0, 0.035, L.shape)
    P, UV, T = raster['p'], raster['uv'], raster['tri']
    tc, bc, sc = np.array(o['tc'], float), np.array(o['bc'], float), np.array(o['sc'], float)
    pat = o.get('pat')
    for ti, (a, b, c) in enumerate(T):
        part = raster['part'][ti]
        uv = UV[[a, b, c]] * [size, size]
        uv[:, 1] = size - uv[:, 1]
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, size - 1), min(y1, size - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = uv
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-9:
            continue
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
        w2 = 1 - w0 - w1
        e = -0.02
        inside = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not inside.any():
            continue
        wp = w0[..., None] * P[a] + w1[..., None] * P[b] + w2[..., None] * P[c]
        X, Y, Z = np.abs(wp[..., 0]), wp[..., 1], wp[..., 2]
        col = np.full(wp.shape, np.nan)
        # ---- верх
        top = o['top']
        torso_z = (Z < H['neck'] - 0.02) & (Z > H['waist'] - (0.12 if top == 'dress' else 0.0))
        if top != 'none':
            m = np.zeros(Z.shape, bool)
            if part in ('torso', 'pelvis'):
                m = torso_z.copy()
                if top in ('tank', 'dress'):
                    m &= ~((X > H['shx'] - 0.06) & (Z > H['shz'] - 0.06))      # плечи открыты
                    m &= ~((Z > H['neck'] - 0.12) & (X < 0.09) & (Y < 0))        # вырез
                elif top in ('tee', 'shirt', 'long'):
                    m &= ~((Z > H['neck'] - 0.06) & (X < 0.07) & (Y < 0))
            elif part == 'upperarm' and top in ('tee', 'shirt', 'long'):
                m = X < (H['shx'] + 0.17 if top == 'tee' else 9)
            elif part == 'lowerarm' and top in ('long', 'shirt'):
                m = X < (H['elbx'] + 0.08 if top == 'shirt' else H['wrx'] - 0.02)
            if m.any():
                cc = np.broadcast_to(tc, wp.shape).copy()
                if pat:
                    kind, pc = pat
                    pc = np.array(pc, float)
                    if kind == 'stripes':
                        s = (np.floor(Z / 0.045) % 2 == 0)
                    elif kind == 'plaid':
                        s = ((np.floor(Z / 0.06) + np.floor((X + Y) / 0.06)) % 2 == 0)
                    else:
                        s = (((Z * 30) % 1 - 0.5) ** 2 + ((X * 30 + 0.5 * np.floor(Z * 30)) % 1 - 0.5) ** 2) < 0.06
                    cc[s] = pc
                if top == 'shirt':  # планка с пуговицами
                    cc[(X < 0.012) & (Y < 0) & (part in ('torso', 'pelvis'))] *= 0.85
                col[m] = cc[m]
        # ---- низ
        bot = o['bottom']
        if part in ('pelvis', 'thigh', 'calf', 'torso'):
            lo = {'long': H['ankle'] + 0.02, 'shorts': H['knee'] + 0.08, 'skirt': H['knee'] - 0.05, 'dress': H['knee'] + 0.02}[bot]
            hi = H['waist'] + (0.0 if bot != 'dress' else 0.5)
            m = (Z > lo) & (Z < hi)
            if part == 'torso' and bot != 'dress':
                m &= Z < H['waist']
            if m.any():
                cc = np.broadcast_to(bc if bot != 'dress' else tc, wp.shape).copy()
                if o.get('jeans'):
                    cc = cc * (1 + 0.08 * np.sin((wp[..., 0] + Z) * 900))[..., None]
                    seam = (np.abs(X - 0.0) < 0.006) & (Y > 0)
                    cc[seam] *= 1.25
                if bot == 'dress' and pat:
                    kind, pc = pat
                    s = (((Z * 30) % 1 - 0.5) ** 2 + ((X * 30) % 1 - 0.5) ** 2) < 0.06
                    cc[s] = np.array(pc, float)
                col[m] = cc[m]
                if o.get('belt'):
                    bm = m & (np.abs(Z - H['waist'] + 0.02) < 0.022)
                    col[bm] = (35, 28, 22)
        # ---- обувь
        if part in ('foot', 'ball', 'calf'):
            sh = o['shoes']
            topz = {'boots': H['ankle'] + 0.16, 'sneakers': H['ankle'] + 0.02, 'shoes': H['ankle'] - 0.01, 'sandals': 0.035}[sh]
            m = Z < topz
            if sh == 'sandals':
                strap = (Z < 0.03) | ((np.abs(Z - 0.075) < 0.012) & (Y < 0.06))
                m = strap | (Z < 0.025)
            if m.any():
                cc = np.broadcast_to(sc, wp.shape).copy()
                if sh == 'sneakers':
                    cc[Z < 0.035] = (238, 238, 232)
                col[m] = cc[m]
        ok = inside & ~np.isnan(col[..., 0])
        if not ok.any():
            continue
        yy, xx = np.nonzero(ok)
        Yi, Xi = yy + y0, xx + x0
        img[Yi, Xi] = col[ok] * (shade[Yi, Xi] * noise[Yi, Xi])[:, None]
    return np.clip(img, 0, 255)


def body_marks(raster):
    """Опорные высоты тела по вершинам (метры, Z вверх)."""
    P = raster['p']
    top = P[:, 2].max()
    s = top / 1.85
    H = {'neck': 1.52 * s, 'waist': 1.0 * s, 'knee': 0.52 * s, 'ankle': 0.11 * s, 'shz': 1.47 * s, 'shx': 0.2 * s,
         'elbx': 0.45 * s, 'wrx': 0.66 * s}
    return H


def webp(img, q=82, mode='RGB'):
    buf = io.BytesIO()
    Image.fromarray(img.astype('uint8'), mode).save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + b64(buf.getvalue())


# ---------------------------------------------------------------- анимации
def bake_anims(char_arm, anim_arm):
    """Ретаргет: мировой поворот каждой кости = поворот в анимации относительно её покоя."""
    Rc = {n: char_arm.data.bones[n].matrix_local.to_quaternion() for n in KEEP}
    Ra = {n: anim_arm.data.bones[n].matrix_local.to_quaternion() for n in KEEP}
    hc = char_arm.data.bones['pelvis'].matrix_local.translation.z
    ha = anim_arm.data.bones['pelvis'].matrix_local.translation.z
    par = {}
    for n in KEEP:
        b = char_arm.data.bones[n]
        p = b.parent.name if b.parent else None
        while p and p not in KEEP:
            p = char_arm.data.bones[p].parent.name if char_arm.data.bones[p].parent else None
        par[n] = p
    Cq = C3.to_quaternion()
    out = {}
    ad = anim_arm.animation_data or anim_arm.animation_data_create()
    for tr in ad.nla_tracks:
        tr.mute = True
    for key, an in ANIMS.items():
        act = bpy.data.actions.get(an)
        if not act:
            print('нет анимации', an); continue
        ad.action = act
        try:
            if act.slots:
                ad.action_slot = act.slots[0]
        except AttributeError:
            pass
        f0, f1 = act.frame_range
        scene_fps = 30
        n = max(1, int(round((f1 - f0) / scene_fps * FPS)) + 1)
        Q, Pp = [], []
        for i in range(n):
            f = f0 + i * scene_fps / FPS
            bpy.context.scene.frame_set(int(f), subframe=f - int(f))
            bpy.context.view_layer.update()
            Wq = {}
            for nm in KEEP:
                pa = anim_arm.pose.bones[nm].matrix.to_quaternion()
                Wq[nm] = pa @ Ra[nm].inverted() @ Rc[nm]
            for nm in KEEP:
                p = par[nm]
                lq = (Wq[p].inverted() @ Wq[nm]) if p else Wq[nm]
                g = Cq @ lq @ Cq.inverted()
                if g.w < 0:
                    g = -g
                Q += [g.x, g.y, g.z, g.w]
            pp = anim_arm.pose.bones['pelvis'].matrix.translation * (hc / ha)
            rootM = char_arm.data.bones['root'].matrix_local
            lp = C3 @ (rootM.inverted() @ pp)
            Pp += list(lp)
        out[key] = {'n': n, 'fps': FPS, 'loop': an.endswith('_Loop'),
                    'q': b64(struct.pack('<%dh' % len(Q), *[round(max(-1, min(1, x)) * 32767) for x in Q])),
                    'p': b64(struct.pack('<%df' % len(Pp), *Pp))}
        print(f'  {key}: {n} кадров')
    return out


# ---------------------------------------------------------------- волосы
def hair_mesh(name, arm):
    objs = import_gltf(os.path.join(UBC, 'Hairstyles', 'Origin at 0', 'glTF (Godot)', name + '.gltf'))
    ms = [o for o in objs if o.type == 'MESH']
    o = ms[0]
    if len(ms) > 1:
        with bpy.context.temp_override(active_object=o, selected_editable_objects=ms, selected_objects=ms):
            bpy.ops.object.join()
    for x in objs:
        if x.name in bpy.data.objects and x != o:
            bpy.data.objects.remove(x)
    t = decimate(o, HAIR_TRIS)
    d, _ = mesh_data(o, arm, rigid_bone='Head')
    bpy.data.objects.remove(o)
    print(f'  волосы {name}: {t} треугольников')
    return d


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    anim_objs = import_gltf(UAL)
    anim_arm = [o for o in anim_objs if o.type == 'ARMATURE'][0]
    for o in anim_objs:
        if o.type == 'MESH':
            bpy.data.objects.remove(o)
    res = {'bodies': {}, 'hair': {}, 'outfits': {}, 'anims': {}, 'credits': 'Quaternius (CC0): Universal Base Characters, Universal Animation Library'}
    rasters = {}
    for kind in ('m', 'f'):
        arm, body, eyes = load_body(kind)
        arm.data.pose_position = 'REST'
        bpy.context.view_layer.update()
        t = decimate(body, BODY_TRIS)
        print(f'тело {kind}: {t} треугольников')
        d, r = mesh_data(body, arm)
        rasters[kind] = r
        entry = {'body': d, 'bones': skeleton(arm), 'marks': body_marks(r)}
        if eyes:
            decimate(eyes, 300)
            ed, _ = mesh_data(eyes, arm)
            entry['eyes'] = ed
            eimg = Image.open(os.path.join(UBC, 'Base Characters', 'Textures', 'T_Eye_Brown.png')).convert('RGB').resize((128, 128), Image.LANCZOS)
            entry['eyesTex'] = webp(np.asarray(eimg, float), 80)
        brows = 'Eyebrows_Regular' if kind == 'm' else 'Eyebrows_Female'
        entry['brows'] = hair_mesh(brows, arm)
        res['bodies'][kind] = entry
        arm.data.pose_position = 'POSE'
        res['anims'][kind] = bake_anims(arm, anim_arm)
        # хватит одной копии волос: размеры голов у мужчины и женщины близки — берём для своего тела
        for hn in sorted({o['hair'] for o in OUTFITS.values() if o['body'] == kind} | ({'Hair_Beard'} if kind == 'm' else set())):
            res['hair'][hn + '_' + kind] = hair_mesh(hn, arm)
        for x in [o for o in bpy.data.objects if o not in (anim_arm,)]:
            if x.name in bpy.data.objects and x not in anim_objs:
                bpy.data.objects.remove(x)
    # текстуры кожи и одежды
    htex = Image.open(os.path.join(UBC, 'Hairstyles', 'Textures', 'T_Hair_1_BaseColor.png')).convert('L').resize((256, 256), Image.LANCZOS)
    res['hairTex'] = webp(np.asarray(htex.convert('RGB'), float), 80)
    skins = {}
    for kind, nm in (('m', 'T_Superhero_Male_{}.png'), ('f', 'T_Superhero_Female_{}_BaseColor.png')):
        for sk, fn in (('light', 'Ligh' if kind == 'm' else 'Light'), ('dark', 'Dark')):
            im = Image.open(os.path.join(UBC, 'Base Characters', 'Textures', nm.format(fn))).convert('RGB').resize((TEX, TEX), Image.LANCZOS)
            skins[kind, sk] = np.asarray(im, float)
    for name, o in OUTFITS.items():
        H = res['bodies'][o['body']]['marks']
        img = paint(skins[o['body'], o['skin']], rasters[o['body']], o, TEX, H)
        res['outfits'][name] = {'body': o['body'], 'hair': o['hair'] + '_' + o['body'], 'hc': o['hc'], 'beard': bool(o.get('beard')),
                                'tex': webp(img, 84)}
        if OUT_DIR:
            Image.fromarray(img.astype('uint8')).save(os.path.join(OUT_DIR, f'outfit_{name}.png'))
        print('наряд', name)
    path = os.path.join(ROOT, 'assets', 'models', 'people.js')
    with open(path, 'w') as f:
        f.write('// Сгенерировано tools/models/people.py из моделей Quaternius (CC0) — не править руками\n')
        f.write('window.GEN_PEOPLE = ' + json.dumps(res, separators=(',', ':')) + ';\n')
    print('people.js:', os.path.getsize(path) // 1024, 'КБ')


main()
