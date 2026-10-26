# Общие детали для моделей (Blender как модуль Python: pip install bpy).
# Основа — tools/models/lib.py из GTA-original-2027 («ХАМСИН»): те же коробки,
# призмы, плашки окон и экспорт в JS, который игра читает и с диска (file://).
#
# Единицы — метры, ось Z вверх. Фасад к улице — −Y Blender (в игре — +z, «юг»).
# Материал = имя из палитры; у материала может быть текстура (TEX), иначе цвет.
import bpy, bmesh, math, os, json, base64, struct, random
from mathutils import Vector

PAL = {}
RND = random.Random(7)

# Атлас окон (assets/textures/win_atlas): 8 видов по горизонтали, 2 ряда:
# нижний ряд (v 0..0.5) — тёмные ночью, верхний (v 0.5..1) — горят ночью.
WIN_KINDS = 8
WIN = {'alu': 0, 'trisHalf': 1, 'trisShut': 2, 'shutterG': 3, 'modern': 4, 'curtain': 5, 'door': 6, 'blinds': 7}

# Материал → (текстура, метров на повтор, яркость). Нет картинки — цвет из палитры.
# Полный список текстур и промпты — CLAUDE_CHROME_TEXTURES.md / js/texlist.js.
TEX = {
    'white': ('pl_white', 3.0, 1.0), 'cream': ('pl_cream', 3.0, 1.0), 'pink': ('pl_pink', 3.0, 1.0),
    'blue': ('pl_blue', 3.0, 1.0), 'beige': ('pl_beige', 3.0, 1.0), 'grey': ('pl_grey', 3.0, 1.0),
    'ochre': ('pl_ochre', 3.0, 1.0), 'salmon': ('pl_salmon', 3.0, 1.0), 'mint': ('pl_mint', 3.0, 1.0),
    'stone': ('jstone', 2.4, 1.0), 'stoneD': ('jstone', 2.4, 0.85), 'trim': ('trim', 2.0, 1.0),
    'concrete': ('concrete', 4.0, 1.0), 'concreteD': ('concrete', 4.0, 0.75), 'mosaic': ('mosaic', 2.0, 1.0),
    'glass': ('glass_dark', 4.0, 1.0), 'glassB': ('glass_blue', 6.0, 1.0), 'metal': ('metal', 2.0, 1.0),
    'roof': ('roof_flat', 4.0, 1.0), 'tar': ('roof_tar', 4.0, 1.0), 'tiles': ('roof_tiles', 2.5, 1.0),
    'shutter': ('trisim', 1.6, 1.0), 'wood': ('wood_old', 1.5, 1.0), 'rail': ('railing', 1.2, 1.0),
    'boiler': ('solar_panel', 2.0, 1.0), 'awn1': ('awning_red', 2.0, 1.0), 'awn2': ('awning_green', 2.0, 1.0),
    'awn3': ('awning_blue', 2.0, 1.0), 'graffiti': ('graffiti', 4.0, 1.0), 'tilesW': ('wall_tiles', 1.5, 1.0),
    'cladding': ('cladding', 3.0, 1.0), 'brick': ('brick', 2.0, 1.0),
    # витрины лавок: картинка на всю плашку (fit)
    **{f'shop{i}': (f'shop_{i}', 1.0, 1.0) for i in range(1, 9)},
    'sign1': ('sign_1', 1.0, 1.0), 'sign2': ('sign_2', 1.0, 1.0),
}
FIT = {f'shop{i}' for i in range(1, 9)} | {'sign1', 'sign2'}


def reset(palette):
    """Новая пустая сцена и палитра {имя: (r, g, b)} в sRGB 0..1."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PAL.clear()
    PAL.update(palette)
    for k, c in palette.items():
        mat(k)


def mat(k):
    if k in bpy.data.materials:
        return bpy.data.materials[k]
    c = PAL.get(k, (0.5, 0.5, 0.5))
    m = bpy.data.materials.new(k)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[x ** 2.2 for x in c], 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def _obj(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat(material))
    return o


def box(x0, y0, z0, x1, y1, z1, m):
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    return _obj('box', bm, m)


def prism(cx, cy, z0, z1, r0, r1, n, m, rot=None, cap=True, a0=0.0, a1=None, sy=1.0):
    """n-угольная призма / усечённый конус; a0..a1 — дуга (полуцилиндр балкона), sy — сплющить по Y."""
    full = a1 is None
    if rot is None:
        rot = math.pi / n if full else 0
    a1 = a0 + 2 * math.pi if full else a1
    k = n if full else n + 1
    bm = bmesh.new()
    ang = lambda i: a0 + rot + i * (a1 - a0) / n
    ring = lambda r, z: [bm.verts.new((cx + r * math.cos(ang(i)), cy + sy * r * math.sin(ang(i)), z)) for i in range(k)]
    lo, hi = ring(r0, z0), ring(r1, z1)
    for i in range(n):
        j = (i + 1) % k
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    if cap:
        if not full:
            lo.append(bm.verts.new((cx, cy, z0))); hi.append(bm.verts.new((cx, cy, z1)))
            bm.faces.new((lo[-2], lo[-1], hi[-1], hi[-2])); bm.faces.new((lo[-1], lo[0], hi[0], hi[-1]))
        bm.faces.new(hi)
        bm.faces.new(list(reversed(lo)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj('prism', bm, m)


def arc_wall(cx, cy, z0, z1, r, t, a0, a1, n, m):
    """Скруглённое ограждение балкона: стенка толщиной t по дуге."""
    bm = bmesh.new()
    pts = lambda rr, z: [bm.verts.new((cx + rr * math.cos(a0 + (a1 - a0) * i / n), cy + rr * math.sin(a0 + (a1 - a0) * i / n), z)) for i in range(n + 1)]
    oL, oH, iL, iH = pts(r, z0), pts(r, z1), pts(r - t, z0), pts(r - t, z1)
    for i in range(n):
        bm.faces.new((oL[i], oL[i + 1], oH[i + 1], oH[i]))
        bm.faces.new((iL[i + 1], iL[i], iH[i], iH[i + 1]))
        bm.faces.new((oH[i], oH[i + 1], iH[i + 1], iH[i]))
    for e in (0, n):
        bm.faces.new((oL[e], oH[e], iH[e], iL[e]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj('arc', bm, m)


def plate(pts2d, origin, u, normal, depth, m, kind=None, lit=None):
    """Плоская фигура на стене: (u вдоль стены, z вверх), выдавлена наружу на depth.
    kind — вид окна из атласа (WIN), lit — горит ли ночью (иначе случайно)."""
    o, u, n = Vector(origin), Vector(u), Vector(normal)
    bm = bmesh.new()
    back = [bm.verts.new(o + u * x + Vector((0, 0, z))) for x, z in pts2d]
    front = [bm.verts.new(o + u * x + Vector((0, 0, z)) + n * depth) for x, z in pts2d]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    k = len(pts2d)
    for i in range(k):
        bm.faces.new((back[i], back[(i + 1) % k], front[(i + 1) % k], front[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _obj('plate', bm, m)
    if kind is not None:
        ob['win'] = WIN[kind] if isinstance(kind, str) else kind
        ob['lit'] = int(RND.random() < 0.38) if lit is None else int(lit)
    return ob


def rect(w, h):
    return [(-w / 2, 0), (w / 2, 0), (w / 2, h), (-w / 2, h)]


def arch(w, h, n=5):
    """Полукруглая арка (u, z) от земли."""
    s = h - w / 2
    pts = [(-w / 2, 0), (w / 2, 0)]
    for i in range(n + 1):
        a = i / n * math.pi
        pts.append((w / 2 * math.cos(a), s + w / 2 * math.sin(a)))
    return pts


SIDES = {
    # сторона: (начало стены, направление вдоль, наружная нормаль, длина) для прямоугольника
    'S': lambda x0, y0, x1, y1: ((x0, y0), (1, 0, 0), (0, -1, 0), x1 - x0),
    'N': lambda x0, y0, x1, y1: ((x1, y1), (-1, 0, 0), (0, 1, 0), x1 - x0),
    'W': lambda x0, y0, x1, y1: ((x0, y1), (0, -1, 0), (-1, 0, 0), y1 - y0),
    'E': lambda x0, y0, x1, y1: ((x1, y0), (0, 1, 0), (1, 0, 0), y1 - y0),
}


def on_wall(rect4, side, t, z):
    """Точка на стене: t — метры от начала стороны; возвращает (точка, u, n, длина)."""
    (ox, oy), u, n, L = SIDES[side](*rect4)
    return (ox + u[0] * t, oy + u[1] * t, z), u, n, L


def window(rect4, side, t, z, w, h, kind='alu', frame='white', sill='trim', depth=0.05, lit=None):
    """Окно с рамой и подоконником на стене."""
    p, u, n, L = on_wall(rect4, side, t, z)
    if frame:
        plate(rect(w + 0.16, h + 0.14), (p[0], p[1], z - 0.07), u, n, depth * 0.6, frame)
    plate(rect(w, h), p, u, n, depth, 'dark', kind, lit)
    if sill:
        plate(rect(w + 0.3, 0.07), (p[0], p[1], z - 0.12), u, n, 0.14, sill)


def ac_unit(rect4, side, t, z):
    """Кондиционер (мазган) на стене: белый короб, решётка, трубка."""
    p, u, n, L = on_wall(rect4, side, t, z)
    plate(rect(0.8, 0.55), p, u, n, 0.28, 'acwhite')
    plate(rect(0.5, 0.42), (p[0] + u[0] * 0.08, p[1] + u[1] * 0.08, z + 0.06), u, n, 0.285, 'acgrille')
    plate(rect(0.04, 1.2), (p[0] - u[0] * 0.33, p[1] - u[1] * 0.33, z - 1.2), u, n, 0.05, 'pipe')


def export_data():
    """Геометрия сцены для игры: x — восток, y — высота, z — юг (= −Y Blender).
    Треугольники по материалам (groups: [материал, начало, вершин, текстура, яркость]).
    Сжатие: позиции — Int16 в сантиметрах, нормали — Int8, uv — Int16 (×512)."""
    by = {}
    lo = Vector((1e9, 1e9, 1e9)); hi = -lo
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.name.startswith('_'):
            continue
        name0 = o.data.materials[0].name
        sc = TEX.get(name0, (None, 3.0))[1]
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.normal_update()
        win = 'win' in o
        fit = name0 in FIT
        if win or fit:
            # развёртка на всю фигуру по её главной плоскости
            nrm = (o.matrix_world.to_3x3() @ max(bm.faces, key=lambda f: f.calc_area()).normal).normalized()
            wax = max(range(3), key=lambda i: abs(nrm[i]))
            sgn = 1 if nrm[wax] > 0 else -1
            # u растёт слева направо, если смотреть на фасад снаружи
            if wax == 0:
                pick = lambda p: (p.y * sgn, p.z)
            elif wax == 1:
                pick = lambda p: (-p.x * sgn, p.z)
            else:
                pick = lambda p: (p.x, p.y)
            pts = [pick(o.matrix_world @ v.co) for v in bm.verts]
            u0, u1 = min(p[0] for p in pts), max(p[0] for p in pts)
            w0, w1 = min(p[1] for p in pts), max(p[1] for p in pts)
        name_w = 'win' if win else name0
        for f in bm.faces:
            n = (o.matrix_world.to_3x3() @ f.normal).normalized()
            ax = max(range(3), key=lambda i: abs(n[i]))
            front = (win or fit) and ax == wax
            name = name_w if (front or not (win or fit)) else ('frame' if win else 'trim')
            if name == 'frame' and 'frame' not in PAL:
                PAL['frame'] = (0.85, 0.85, 0.83)
            L = by.setdefault(name, {'pos': [], 'nor': [], 'uv': []})
            for v in f.verts:
                p = o.matrix_world @ v.co
                lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
                L['pos'] += [p.x, p.z, -p.y]
                L['nor'] += [n.x, n.z, -n.y]
                if front:
                    u, w = pick(p)
                    fu = (u - u0) / ((u1 - u0) or 1); fw = (w - w0) / ((w1 - w0) or 1)
                    if win:
                        col, row = o['win'], o['lit']
                        L['uv'] += [(col + 0.03 + fu * 0.94) / WIN_KINDS, (row + 0.03 + fw * 0.94) / 2]
                    else:
                        L['uv'] += [fu, fw]
                    continue
                if ax == 0:
                    u, w = (p.y if n.x > 0 else -p.y), p.z
                elif ax == 1:
                    u, w = (-p.x if n.y > 0 else p.x), p.z
                else:
                    u, w = p.x, p.y
                L['uv'] += [u / sc, w / sc]
        bm.free()
    pos, nor, uv, groups = [], [], [], []
    for name in sorted(by):
        L = by[name]
        t = TEX.get(name)
        c = PAL.get(name, (0.6, 0.6, 0.6))
        groups.append([name, len(pos) // 3, len(L['pos']) // 3, t[0] if t else None, t[2] if t else 1.0,
                       [round(x, 3) for x in c]])
        pos += L['pos']; nor += L['nor']; uv += L['uv']
    e = pack_indexed(pos, nor, uv, groups, 100, 512)
    e.update({'top': round(hi.z, 2), 'box': [round(lo.x, 2), round(-hi.y, 2), round(hi.x, 2), round(-lo.y, 2)]})
    return e


def pack_indexed(pos, nor, uv, groups, ps, us):
    """Общие вершины (одинаковые позиция, нормаль, uv) и индексы. Позиции Int16 (×ps),
    нормали Int8, uv Int16 (×us). Группы: [имя, начало индексов, число индексов, …]."""
    cl = lambda x, a: max(-a, min(a, x))
    key, P, N, U, idx = {}, [], [], [], []
    g2 = []
    for g in groups:
        s0 = len(idx)
        for i in range(g[1], g[1] + g[2]):
            p = tuple(cl(round(x * ps), 32767) for x in pos[i * 3:i * 3 + 3])
            n = tuple(cl(round(x * 127), 127) for x in nor[i * 3:i * 3 + 3])
            u = tuple(cl(round(x * us), 32767) for x in uv[i * 2:i * 2 + 2])
            k = (g[0], p, n, u)
            if k not in key:
                key[k] = len(P) // 3
                P += p; N += n; U += u
            idx.append(key[k])
        g2.append([g[0], s0, len(idx) - s0] + list(g[3:]))
    big = len(P) // 3 > 65535
    b = lambda fmt, a: base64.b64encode(struct.pack('<%d%s' % (len(a), fmt), *a)).decode()
    return {'tris': len(idx) // 3, 'groups': g2, 'pos': b('h', P), 'nor': b('b', N), 'uv': b('h', U),
            'idx': b('I' if big else 'H', idx), 'big': big}


def render(path, kind='hero', size=640):
    """Превью: hero — вид 3/4 с улицы, top — сверху под углом."""
    sc = bpy.context.scene
    objs = [o for o in sc.objects if o.type == 'MESH' and not o.name.startswith('_')]
    lo = Vector((1e9, 1e9, 1e9)); hi = -lo
    for o in objs:
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    c = (lo + hi) / 2
    R = max((hi - lo).length, 10)
    if '_ground' not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=R * 4, location=(c.x, c.y, 0))
        g = bpy.context.active_object; g.name = '_ground'
        gm = bpy.data.materials.new('_ground'); gm.use_nodes = True
        gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.33, 0.30, 1)
        g.data.materials.append(gm)
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.7, 0.9, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
        sun = bpy.data.objects.new('_sun', bpy.data.lights.new('sun', 'SUN'))
        sun.data.energy = 4.0; sun.rotation_euler = (math.radians(45), 0, math.radians(-30))
        sc.collection.objects.link(sun)
        cam = bpy.data.objects.new('_cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
        sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'CYCLES'
        if sc.render.engine == 'CYCLES':
            sc.cycles.samples = 16; sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = size
    cam = bpy.data.objects['_cam']
    if kind == 'hero':
        loc = c + Vector((0.55, -1.0, 0.0)).normalized() * R * 1.15
        loc.z = 1.7 + R * 0.25
        tgt = Vector((c.x, c.y, hi.z * 0.45))
    else:
        loc = Vector((c.x + R * 0.3, c.y - R * 0.6, R * 1.3 + hi.z))
        tgt = Vector((c.x, c.y, 0))
    cam.location = loc; cam.data.lens = 28
    cam.rotation_euler = (tgt - loc).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
