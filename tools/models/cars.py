# Машины тель-авивских улиц — детальные модели из Blender (bpy, без окна).
#   python3 tools/models/cars.py [имя ...] [--render папка]
# Пишет assets/models/cars.js (window.GEN_CARS).
#
# Кузов — лофт по поперечным сечениям (профиль сбоку и в плане задаётся
# параметрами), сглаженный Catmull-Clark: капот, крылья с арками колёс,
# багажник или дверь хэтчбека. Над ним — «теплица» салона: лобовое и заднее
# стекло, боковые окна, стойки A/B/C. Детали (фары, фонари, решётка, номера,
# поворотники, ручки, швы дверей) проецируются на поверхность кузова лучами,
# зеркала, щётки, антенна, выхлоп — отдельные части. Колёса: шина с профилем,
# диск со спицами. В салоне — сиденья, торпедо и руль (видны сквозь стекло).
# Ось Y Blender — вперёд (в игре −z), Z — вверх, начало координат — центр машины на земле.
import sys, os, math, json, base64, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

# материалы: цвет (sRGB 0..1); paint — перекрашивается в игре
PAL = {
    'paint': (0.8, 0.8, 0.8), 'paint2': (0.15, 0.25, 0.6), 'glass': (0.10, 0.13, 0.16), 'trim': (0.06, 0.06, 0.07),
    'bumper': (0.12, 0.12, 0.13), 'under': (0.05, 0.05, 0.05), 'chrome': (0.80, 0.82, 0.85), 'headlight': (0.62, 0.68, 0.74),
    'taillight': (0.75, 0.05, 0.05), 'indicator': (1.0, 0.55, 0.05), 'grille': (0.08, 0.08, 0.09), 'plate': (0.98, 0.82, 0.10),
    'plateR': (0.98, 0.82, 0.10), 'tire': (0.07, 0.07, 0.07), 'rim': (0.72, 0.74, 0.76), 'hub': (0.35, 0.36, 0.38),
    'seat': (0.10, 0.10, 0.11), 'dash': (0.08, 0.08, 0.09), 'mirrorG': (0.6, 0.7, 0.8), 'taxisign': (1.0, 0.85, 0.15),
    'lightbarR': (0.9, 0.05, 0.05), 'lightbarB': (0.05, 0.25, 1.0), 'reverse': (0.95, 0.95, 0.95), 'cargo': (0.30, 0.30, 0.31),
    'stripe': (0.10, 0.30, 0.75), 'stripe2': (0.85, 0.70, 0.10),
}
# детали с картинкой на всю плашку (assets/textures: car_*)
TEXFIT = {'headlight': 'car_headlight', 'taillight': 'car_taillight', 'grille': 'car_grille', 'plate': 'car_plate_il',
          'plateR': 'car_plate_il', 'taxisign': 'car_taxi_sign', 'rim': 'car_rim'}

CARS = {}


def car(name, **kw):
    CARS[name] = kw


# ---------------------------------------------------------------- израильский автопарк (названия вымышленные)
# L, W, H — габариты; wb — база; r — радиус колеса; hood — высота капота у стекла;
# nose — высота носа; belt — линия окон; ws — y основания лобового стекла (от центра);
# wsTop, roofEnd, rearEnd — y верха лобового, конца крыши, низа заднего стекла;
# trunk — высота крышки багажника (седан), tail — высота кормы
car('pikante', title='Кия «Пиканте»', L=3.6, W=1.6, H=1.49, wb=2.4, r=0.29, hood=0.86, nose=0.66, belt=0.95,
    ws=0.75, wsTop=-0.05, roofEnd=-1.25, rearEnd=-1.72, tail=0.98, clear=0.15, shift=0.05, colors='small')
car('ai20', title='Хюндай «Ай-20»', L=4.05, W=1.75, H=1.46, wb=2.58, r=0.31, hood=0.88, nose=0.66, belt=0.97,
    ws=0.92, wsTop=0.0, roofEnd=-1.35, rearEnd=-1.92, tail=1.0, clear=0.15, shift=0.08, colors='small')
car('corola', title='Тойота «Корола»', L=4.62, W=1.78, H=1.44, wb=2.7, r=0.31, hood=0.86, nose=0.64, belt=0.96,
    ws=1.0, wsTop=0.2, roofEnd=-0.95, rearEnd=-1.62, trunk=1.0, tail=0.94, clear=0.14, shift=0.1, colors='sedan')
car('oktavia', title='Шкода «Октавиа»', L=4.68, W=1.81, H=1.46, wb=2.69, r=0.32, hood=0.88, nose=0.66, belt=0.98,
    ws=1.05, wsTop=0.22, roofEnd=-1.0, rearEnd=-1.65, trunk=1.02, tail=0.96, clear=0.14, shift=0.12, colors='sedan')
car('taxi', base='oktavia', title='Монит (такси)', taxi=True, paint=(0.97, 0.97, 0.95))
car('tusan', title='Хюндай «Тусан»', L=4.5, W=1.85, H=1.66, wb=2.67, r=0.36, hood=1.02, nose=0.80, belt=1.12,
    ws=0.95, wsTop=0.15, roofEnd=-1.55, rearEnd=-2.05, tail=1.18, clear=0.20, shift=0.08, colors='suv', rails=True)
car('police', base='tusan', title='Мишмерет (полиция)', police=True, paint=(0.96, 0.96, 0.96))
car('dimaks', title='Исузу «Ди-Макс»', L=5.2, W=1.86, H=1.78, wb=3.1, r=0.38, hood=1.10, nose=0.86, belt=1.2,
    ws=1.25, wsTop=0.55, roofEnd=-0.55, rearEnd=-0.75, tail=1.12, clear=0.24, shift=0.15, pickup=True, colors='work')
car('tranzit', title='Форд «Транзит»', L=5.3, W=2.0, H=2.3, wb=3.3, r=0.36, hood=1.15, nose=0.85, belt=1.25,
    ws=1.75, wsTop=1.15, roofEnd=-2.55, rearEnd=-2.62, tail=2.2, clear=0.18, shift=0.25, van=True, colors='work')
car('sherut', base='tranzit', title='Шерут (маршрутка)', sherut=True, paint=(0.97, 0.85, 0.15))
car('susita', title='«Сусита» 1970', L=3.9, W=1.55, H=1.42, wb=2.3, r=0.28, hood=0.82, nose=0.70, belt=0.92,
    ws=0.7, wsTop=0.05, roofEnd=-0.75, rearEnd=-1.35, trunk=0.95, tail=0.9, clear=0.17, shift=0.0, colors='old', boxy=True)


# ---------------------------------------------------------------- материалы и меш
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for k, c in PAL.items():
        m = bpy.data.materials.new(k)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[x ** 2.2 for x in c], 1)
        b.inputs['Roughness'].default_value = 0.3 if k in ('paint', 'paint2', 'glass', 'chrome') else 0.7
        if k in ('chrome', 'rim'):
            b.inputs['Metallic'].default_value = 1.0


def mk(name, verts, faces, mats, smooth=True):
    """Меш из списков: faces — индексы, mats — имя материала на грань."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    names = sorted(set(mats))
    for n in names:
        me.materials.append(bpy.data.materials[n])
    for p, m in zip(me.polygons, mats):
        p.material_index = names.index(m)
        p.use_smooth = smooth
    me.validate()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def box(x0, y0, z0, x1, y1, z1, m, smooth=False):
    v = [(x, y, z) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
    return mk('box', v, f, [m] * 6, smooth)


def cyl(c, axis, r, h, n, m, r2=None, cap=True):
    """Цилиндр вдоль оси axis (вектор) с центром основания c."""
    c, a = Vector(c), Vector(axis).normalized()
    t = a.orthogonal().normalized(); b = a.cross(t)
    r2 = r if r2 is None else r2
    v = [c + (t * math.cos(i * 2 * math.pi / n) + b * math.sin(i * 2 * math.pi / n)) * r for i in range(n)]
    v += [c + a * h + (t * math.cos(i * 2 * math.pi / n) + b * math.sin(i * 2 * math.pi / n)) * r2 for i in range(n)]
    f = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    ms = [m] * n
    if cap:
        f += [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
        ms += [m, m]
    return mk('cyl', v, f, ms)


def apply_subdiv(o, levels):
    mod = o.modifiers.new('sub', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier=mod.name)


# ---------------------------------------------------------------- профили кузова
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def build(spec):
    L, W, H, wb, r = spec['L'], spec['W'], spec['H'], spec['wb'], spec['r']
    yF, yR = L / 2, -L / 2
    sh = spec.get('shift', 0.0)
    axF, axR = wb / 2 + sh, -wb / 2 + sh            # оси колёс
    wz = r                                          # центр колеса над землёй
    clear = spec['clear']
    belt, hood, nose = spec['belt'], spec['hood'], spec['nose']
    ws, wsTop, roofEnd, rearEnd = spec['ws'], spec['wsTop'], spec['roofEnd'], spec['rearEnd']
    trunk = spec.get('trunk')
    tail = spec.get('tail', belt)
    boxy = spec.get('boxy', False)
    van = spec.get('van', False)
    pickup = spec.get('pickup', False)
    arch_r = r + 0.07

    def zbot(y):
        z = clear
        for ax in (axF, axR):
            d = abs(y - ax)
            if d < arch_r:
                z = max(z, wz + math.sqrt(arch_r * arch_r - d * d) * 0.98)
        # свесы бамперов поднимаются
        if y > axF + arch_r:
            z = max(z, clear + (y - axF - arch_r) * 0.35)
        if y < axR - arch_r:
            z = max(z, clear + (axR - arch_r - y) * 0.35)
        return z

    def ztop(y):
        """Верх нижней части кузова: капот, пояс, багажник/корма."""
        if y >= ws:
            t = (y - ws) / (yF - ws)
            z = belt + (hood - belt) * smoothstep(0, 0.35, t) + (nose - hood) * smoothstep(0.75, 1.0, t) ** 1.3
            return z
        if trunk is not None and y < rearEnd:
            t = (rearEnd - y) / (rearEnd - yR)
            return trunk + (tail - trunk) * smoothstep(0.7, 1.0, t)
        if van or (trunk is None and y < rearEnd):
            return belt + (tail - belt) * smoothstep(rearEnd, yR, y) if not van else belt
        return belt

    def hw(y):
        """Полуширина в плане со скруглением углов."""
        k = 0.12 if boxy else 0.18
        e = (L / 2 - abs(y - 0.0)) / (L * 0.12)
        f = 1.0 - k * (1 - min(1.0, max(0.0, e)) ** 0.5)
        return W / 2 * f * (0.985 if not van else 1.0)

    # станции вдоль машины: гуще у колёс и стекла
    ys = set()
    n0 = 20
    for i in range(n0 + 1):
        ys.add(round(yR + (yF - yR) * i / n0, 3))
    for ax in (axF, axR):
        for k in range(-4, 5):
            ys.add(round(ax + k / 4 * arch_r * 0.98, 3))
    ys |= {round(ws, 3), round(rearEnd, 3), round(yF - 0.06, 3), round(yR + 0.06, 3)}
    ys = sorted(y for y in ys if yR <= y <= yF)

    # ---- нижняя часть: замкнутое кольцо из 14 точек
    verts, faces, mats = [], [], []
    rings = []
    for y in ys:
        zb, zt, w = zbot(y), ztop(y), hw(y)
        if zt < zb + 0.12:
            zt = zb + 0.12
        R = [(w * 0.80, zb), (w * 0.97, zb + 0.05), (w, zb + 0.35 * (zt - zb)), (w, zb + 0.7 * (zt - zb)),
             (w * 0.985, zt - 0.06), (w * 0.93, zt - 0.005), (w * 0.55, zt + 0.03)]
        ring = [(0, zb)] + R + [(0, zt + 0.04)] + [(-x, z) for x, z in reversed(R)]
        rings.append([len(verts) + i for i in range(len(ring))])
        verts += [(x, y, z) for x, z in ring]
    NR = len(rings[0])
    nearF = lambda y: y > axF + arch_r - 0.05
    nearR = lambda y: y < axR - arch_r + 0.05
    for s in range(len(ys) - 1):
        a, b = rings[s], rings[s + 1]
        ym = (ys[s] + ys[s + 1]) / 2
        for j in range(NR):
            k = (j + 1) % NR
            faces.append((a[j], b[j], b[k], a[k]))
            # 0..1 и 15..0 — дно; нижние полосы на свесах — бампер
            jj = min(j, NR - 1 - j)
            if jj == 0:
                m = 'under'
            elif jj <= 1 and (nearF(ym) or nearR(ym)):
                m = 'bumper'
            elif jj == 1:
                m = 'trim' if not boxy else 'paint'
            else:
                m = 'paint'
            mats.append(m)
    faces.append(tuple(reversed(rings[0]))); mats.append('paint')
    faces.append(tuple(rings[-1])); mats.append('paint')
    body = mk('body', verts, faces, mats)
    # грани смотрят наружу
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(body.data); bm.free()

    # ---- салон («теплица»)
    if pickup:
        cab_end = roofEnd - 0.2
    else:
        cab_end = rearEnd
    def zroof(y):
        if y >= wsTop:
            t = (y - wsTop) / (ws - wsTop)
            return H - (H - belt) * (t ** 1.15) - 0.02 * math.sin(t * math.pi)
        if y >= roofEnd:
            t = (wsTop - y) / max(0.01, wsTop - roofEnd)
            return H - 0.03 * (t - 0.5) ** 2 * 4 + 0.03
        t = (roofEnd - y) / max(0.01, roofEnd - cab_end)
        endz = tail if (trunk is None and not pickup) else (trunk if trunk else belt)
        if van:
            endz = tail
        return H - (H - endz) * (t ** (0.9 if trunk else 1.6)) + 0.0
    cys = [ws, ws - (ws - wsTop) * 0.35, ws - (ws - wsTop) * 0.7, wsTop]
    nroof = 8 if not van else 12
    bpil = wsTop + (roofEnd - wsTop) * (0.42 if not van else 0.25)
    for i in range(1, nroof):
        cys.append(wsTop + (roofEnd - wsTop) * i / nroof)
    cys += [bpil - 0.07, bpil + 0.07, roofEnd]
    if cab_end < roofEnd:
        cys += [roofEnd - (roofEnd - cab_end) * 0.4, roofEnd - (roofEnd - cab_end) * 0.75, cab_end]
    cys = sorted(set(round(y, 3) for y in cys), reverse=True)
    cverts, cfaces, cmats = [], [], []
    crings = []
    for y in cys:
        zb = ztop(y) - 0.07
        zr = max(zroof(y), zb + 0.02)
        w = hw(y)
        wb_ = w * 0.95
        wr = w * (0.78 if not van else 0.92)
        side = [(wb_, zb), (wb_ * 0.985, zb + 0.08), (wb_ * 0.95 + (wr - wb_ * 0.95) * 0.5, zb + 0.55 * (zr - zb)),
                (wr, zr - 0.07), (wr * 0.82, zr)]
        ring = [(-x, z) for x, z in side] + [(0, zr + 0.012)] + [(x, z) for x, z in reversed(side)]
        crings.append([len(cverts) + i for i in range(len(ring))])
        cverts += [(x, y, z) for x, z in ring]
    NC = len(crings[0])
    for s in range(len(cys) - 1):
        a, b = crings[s], crings[s + 1]
        y0, y1 = cys[s], cys[s + 1]
        ym = (y0 + y1) / 2
        for j in range(NC - 1):
            cfaces.append((a[j], a[j + 1], b[j + 1], b[j]))
            band = min(j, NC - 2 - j)          # 0 — низ борта, 1,2 — окна, 3,4 — край крыши и крыша
            if ym > wsTop:                       # лобовое
                m = 'glass' if band >= 2 else ('paint' if band == 1 else 'paint')
                if band == 2 and ym > ws - (ws - wsTop) * 0.12:
                    m = 'paint'
            elif ym > roofEnd:
                if band == 0:
                    m = 'trim'
                elif band in (1, 2):
                    m = 'trim' if abs(ym - bpil) < 0.071 else 'glass'
                    if van and ym < bpil - 0.5:
                        m = 'paint' if not spec.get('sherut') else 'glass'
                else:
                    m = 'paint'
            else:                                 # заднее стекло и стойка C
                m = 'glass' if band >= 3 else 'paint'
                if pickup:
                    m = 'glass' if band >= 2 else 'paint'
            cmats.append(m)
    cab = mk('cabin', cverts, cfaces, cmats)
    bm = bmesh.new(); bm.from_mesh(cab.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # нормали — наружу (вверх у крыши)
    up = sum((f.normal.z for f in bm.faces), 0)
    if up < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(cab.data); bm.free()

    # кузов пикапа: кузов-корыто позади кабины
    if pickup:
        y0, y1 = yR + 0.08, cab_end - 0.05
        w = W / 2 - 0.06
        box(-w + 0.06, y0 + 0.08, belt + 0.0, w - 0.06, y1, belt + 0.035, 'cargo')
        for sx in (-1, 1):   # борта кузова
            box(sx * w - (0.06 if sx > 0 else 0), y0, belt, sx * w + (0.06 if sx < 0 else 0), y1, belt + 0.12, 'paint')
        box(-w, y0, belt, w, y0 + 0.08, belt + 0.12, 'paint')
    return body, cab, dict(axF=axF, axR=axR, wz=wz, r=r, ztop=ztop, hw=hw, zbot=zbot, cys=cys, zroof=zroof, yF=yF, yR=yR)


# ---------------------------------------------------------------- проекция деталей
class Surf:
    def __init__(self, objs):
        deps = bpy.context.evaluated_depsgraph_get()
        bm = bmesh.new()
        for o in objs:
            m = o.evaluated_get(deps).to_mesh()
            tmp = bmesh.new(); tmp.from_mesh(m)
            tmp.transform(o.matrix_world)
            me = bpy.data.meshes.new('t'); tmp.to_mesh(me); tmp.free()
            bm.from_mesh(me)
            bpy.data.meshes.remove(me)
        self.bvh = BVHTree.FromBMesh(bm)
        bm.free()

    def hit(self, origin, d):
        p, n, i, dist = self.bvh.ray_cast(Vector(origin), Vector(d).normalized(), 10.0)
        return p, n


def decal(S, mat, center, d, u, w, h, off=0.006, nu=4, nv=2, shape=None):
    """Плашка, обтекающая кузов: сетка nu×nv, каждая точка — луч по направлению d.
    center — точка на плоскости вне кузова, u — ось «вправо», w×h — размер;
    shape — четыре угла в долях (u, v) для трапеций."""
    d = Vector(d).normalized(); u = Vector(u).normalized()
    v = d.cross(u).normalized() * -1
    if v.z < 0:
        v = -v
    corners = shape or [(-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)]
    verts, uvs = [], []
    for j in range(nv + 1):
        for i in range(nu + 1):
            a, b = i / nu, j / nv
            # билинейно по углам
            (x0, y0), (x1, y1), (x2, y2), (x3, y3) = corners
            x = (x0 * (1 - a) + x1 * a) * (1 - b) + (x3 * (1 - a) + x2 * a) * b
            y = (y0 * (1 - a) + y1 * a) * (1 - b) + (y3 * (1 - a) + y2 * a) * b
            o = Vector(center) + u * (x * w) + v * (y * h) - d * 0.6
            p, n = S.hit(o, d)
            verts.append(None if p is None else p + n * off)
            uvs.append((a, b))
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    faces = [f for f in faces if all(verts[k] is not None for k in f)]
    if not faces:
        return None
    # плоские дыры (промахи) заполняем точкой центра плоскости, но граней у них нет
    verts = [v if v is not None else Vector(center) for v in verts]
    o = mk('decal', verts, faces, [mat] * len(faces))
    # нормали наружу
    if o.data.polygons[0].normal.dot(-d) < 0:
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
        uvs = uvs  # uv по вершинам не меняются
    o['fituv'] = json.dumps(uvs)
    return o


# ---------------------------------------------------------------- колесо
def wheel(r, width, name='wheel'):
    """Колесо в начале координат, ось — X (наружная сторона +X): шина, диск, ступица."""
    n = 24
    rim_r = r * 0.62
    prof = [(rim_r, -width / 2), (r * 0.93, -width / 2), (r, -width * 0.32), (r, width * 0.32), (r * 0.93, width / 2), (rim_r, width / 2)]
    verts, faces, mats = [], [], []
    for i in range(n):
        a = i * 2 * math.pi / n
        for rr, x in prof:
            verts.append((x, rr * math.cos(a), rr * math.sin(a)))
    P = len(prof)
    for i in range(n):
        for j in range(P - 1):
            a0, a1 = i * P + j, ((i + 1) % n) * P + j
            faces.append((a0, a1, a1 + 1, a0 + 1)); mats.append('tire')
    tire = mk('tire', verts, faces, mats)
    bm = bmesh.new(); bm.from_mesh(tire.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(tire.data); bm.free()
    # диск: тарелка с картинкой (спицы рисует текстура car_rim) и выпуклая ступица
    k = 20
    xo = width / 2 - 0.03
    dv = [(xo - 0.02, 0, 0)] + [(xo, rim_r * math.cos(i * 2 * math.pi / k), rim_r * math.sin(i * 2 * math.pi / k)) for i in range(k)]
    df = [(0, 1 + i, 1 + (i + 1) % k) for i in range(k)]
    disc = mk('rim', dv, df, ['rim'] * k, smooth=False)
    disc['rimuv'] = rim_r
    bm = bmesh.new(); bm.from_mesh(disc.data); bm.faces.ensure_lookup_table(); bm.normal_update()
    if bm.faces[0].normal.x < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(disc.data); bm.free()
    # внутренняя заглушка (за диском темно)
    iv = [(-width / 2 + 0.02, rim_r * math.cos(i * 2 * math.pi / k), rim_r * math.sin(i * 2 * math.pi / k)) for i in range(k)]
    mk('rimIn', iv, [tuple(range(k))], ['hub'], smooth=False)
    cyl((xo - 0.01, 0, 0), (1, 0, 0), rim_r * 0.22, 0.035, 10, 'hub')
    for i in range(5):  # гайки
        a = i * 2 * math.pi / 5
        cyl((xo, rim_r * 0.33 * math.cos(a), rim_r * 0.33 * math.sin(a)), (1, 0, 0), 0.012, 0.012, 6, 'chrome', cap=True)


# ---------------------------------------------------------------- сборка машины
def details(spec, info):
    L, W, H = spec['L'], spec['W'], spec['H']
    yF, yR = info['yF'], info['yR']
    ztop, hw, zbot = info['ztop'], info['hw'], info['zbot']
    belt = spec['belt']
    body = bpy.data.objects['body']; cab = bpy.data.objects['cabin']
    S = Surf([body, cab])
    zl = max(spec['nose'] + 0.02, (spec['nose'] + spec['hood']) / 2 - 0.02)
    # фары — по краям носа, фонари — по краям кормы
    for sx in (-1, 1):
        x = sx * (W / 2 - 0.30)
        decal(S, 'headlight', (x, yF + 0.5, zl), (0, -1, 0), (-sx, 0, 0) if sx < 0 else (1, 0, 0), 0.36, 0.13,
              shape=[(-0.5, -0.5), (0.5, -0.35), (0.5, 0.5), (-0.5, 0.45)] if sx > 0 else [(-0.5, -0.35), (0.5, -0.5), (0.5, 0.45), (-0.5, 0.5)])
        tz = (spec.get('trunk') or spec.get('tail', belt)) - 0.16
        if spec.get('van'):
            tz = 1.0
        decal(S, 'taillight', (x, yR - 0.5, tz), (0, 1, 0), (1, 0, 0), 0.32, 0.14)
        decal(S, 'reverse', (sx * (W / 2 - 0.55), yR - 0.5, tz - 0.02), (0, 1, 0), (1, 0, 0), 0.1, 0.06, off=0.009, nu=1, nv=1)
        # поворотник на переднем крыле
        decal(S, 'indicator', (sx * (W / 2 + 0.5), info['axF'] + info['r'] + 0.18, ztop(info['axF']) - 0.1), (-sx, 0, 0), (0, sx, 0), 0.07, 0.03, nu=1, nv=1)
        # зеркало: ножка и корпус у основания стойки A
        my = spec['ws'] - 0.18
        mz = belt + 0.02
        mx = sx * hw(my) * 0.9
        ox = mx + sx * 0.19
        box(min(mx, mx + sx * 0.08), my - 0.03, mz - 0.02, max(mx, mx + sx * 0.08), my + 0.03, mz + 0.02, 'trim')
        box(min(mx + sx * 0.06, ox), my - 0.05, mz - 0.05, max(mx + sx * 0.06, ox), my + 0.05, mz + 0.09, 'paint')
        box(min(mx + sx * 0.07, ox - sx * 0.01), my - 0.055, mz - 0.04, max(mx + sx * 0.07, ox - sx * 0.01), my - 0.045, mz + 0.08, 'mirrorG')
        # швы дверей и ручки
        doors = [spec['ws'] - 0.05, info['cys'][0] - (info['cys'][0] - info['cys'][-1]) * 0.45] if not spec.get('van') else [spec['ws'] - 0.05]
        if not spec.get('pickup') and spec['L'] > 3.8 and not spec.get('van'):
            doors.append(spec['roofEnd'] + 0.05)
        for dy in doors:
            z0, z1 = zbot(dy) + 0.06, belt - 0.03
            decal(S, 'trim', (sx * (W / 2 + 0.5), dy, (z0 + z1) / 2), (-sx, 0, 0), (0, sx, 0), 0.012, z1 - z0, off=0.003, nu=1, nv=4)
            decal(S, 'chrome', (sx * (W / 2 + 0.5), dy - 0.22, belt - 0.13), (-sx, 0, 0), (0, sx, 0), 0.16, 0.035, off=0.008, nu=2, nv=1)
    # решётка и номера (израильские — жёлтые)
    decal(S, 'grille', (0, yF + 0.5, zl - 0.02), (0, -1, 0), (1, 0, 0), W * 0.42, 0.14)
    decal(S, 'grille', (0, yF + 0.5, spec['clear'] + 0.18), (0, -1, 0), (1, 0, 0), W * 0.5, 0.1)
    decal(S, 'plate', (0, yF + 0.5, spec['clear'] + 0.32), (0, -1, 0), (1, 0, 0), 0.52, 0.11, off=0.012)
    pz = (spec.get('trunk') or spec.get('tail', belt)) - 0.42 if not spec.get('van') else 0.62
    decal(S, 'plateR', (0, yR - 0.5, max(pz, spec['clear'] + 0.3)), (0, 1, 0), (1, 0, 0), 0.52, 0.11, off=0.012)
    # щётки на лобовом
    for sx in (-0.35, 0.3):
        y = spec['ws'] - 0.08
        box(sx * W / 2 - 0.25, y - 0.02, belt + 0.03, sx * W / 2 + 0.25, y + 0.02, belt + 0.05, 'trim')
    # антенна-плавник и выхлоп
    ry = spec['roofEnd'] + 0.15
    rz = info['zroof'](ry)
    box(-0.03, ry - 0.08, rz, 0.03, ry + 0.08, rz + 0.05, 'trim')
    cyl((0.45 * W / 2, yR + 0.25, spec['clear'] + 0.08), (0, -1, 0), 0.035, 0.3, 8, 'chrome')
    # салон: сиденья, торпедо, руль (руль слева — правостороннее движение)
    seat_z = spec['clear'] + 0.32
    fy = spec['ws'] - 0.55 if not spec.get('van') else spec['ws'] - 0.6
    for sx in (-0.38, 0.38):
        box(sx * W / 2 * 1.0 - 0.24, fy - 0.5, seat_z, sx * W / 2 + 0.24, fy, seat_z + 0.12, 'seat')
        box(sx * W / 2 - 0.24, fy - 0.55, seat_z, sx * W / 2 + 0.24, fy - 0.45, seat_z + 0.65, 'seat')
    if spec['L'] > 3.8 and not spec.get('pickup'):
        by = fy - 0.95
        box(-W / 2 + 0.2, by - 0.45, seat_z, W / 2 - 0.2, by, seat_z + 0.12, 'seat')
        box(-W / 2 + 0.2, by - 0.5, seat_z, W / 2 - 0.2, by - 0.4, seat_z + 0.6, 'seat')
    box(-W / 2 + 0.15, spec['ws'] - 0.35, belt - 0.25, W / 2 - 0.15, spec['ws'], belt + 0.02, 'dash')
    sw = cyl((-0.38 * W / 2, spec['ws'] - 0.42, belt - 0.02), (0, -1, 0.35), 0.17, 0.03, 14, 'dash', cap=False)
    return S


def extras(spec, info):
    W, belt, H = spec['W'], spec['belt'], spec['H']
    ry0, ry1 = spec['wsTop'], spec['roofEnd']
    if spec.get('rails'):
        for sx in (-1, 1):
            x = sx * W / 2 * 0.72
            box(x - 0.025, ry1 + 0.05, H + 0.05, x + 0.025, ry0 - 0.05, H + 0.08, 'trim')
            for y in (ry1 + 0.08, ry0 - 0.08):
                box(x - 0.03, y - 0.04, H - 0.01, x + 0.03, y + 0.04, H + 0.06, 'trim')
    if spec.get('taxi'):
        y = (ry0 + ry1) / 2 + 0.2
        box(-0.38, y - 0.12, H + 0.02, 0.38, y + 0.12, H + 0.06, 'trim')
        v = [(-0.36, y - 0.1, H + 0.06), (0.36, y - 0.1, H + 0.06), (0.30, y - 0.06, H + 0.26), (-0.30, y - 0.06, H + 0.26),
             (-0.36, y + 0.1, H + 0.06), (0.36, y + 0.1, H + 0.06), (0.30, y + 0.06, H + 0.26), (-0.30, y + 0.06, H + 0.26)]
        f = [(0, 1, 2, 3), (5, 4, 7, 6), (3, 2, 6, 7), (1, 5, 6, 2), (4, 0, 3, 7)]
        o = mk('taxisign', v, f, ['taxisign', 'taxisign', 'taxisign', 'taxisign', 'taxisign'], smooth=False)
        o['fitface'] = 1
    if spec.get('police'):
        y = (ry0 + ry1) / 2 + 0.25
        box(-0.6, y - 0.13, H + 0.03, 0.6, y + 0.13, H + 0.07, 'trim')
        box(-0.58, y - 0.11, H + 0.07, -0.02, y + 0.11, H + 0.18, 'lightbarB')
        box(0.02, y - 0.11, H + 0.07, 0.58, y + 0.11, H + 0.18, 'lightbarR')
    if spec.get('sherut'):
        y = spec['ws'] - 0.3
        box(-0.5, y - 0.1, H + 0.0, 0.5, y + 0.1, H + 0.25, 'taxisign')


def stripes(spec, info, S):
    """Полосы на бортах: полиция — синяя и жёлто-зелёная, такси — без."""
    if not spec.get('police'):
        return
    W = spec['W']
    for sx in (-1, 1):
        for m, z in (('stripe', spec['belt'] - 0.2), ('stripe2', spec['belt'] - 0.31)):
            y0, y1 = info['yR'] + 0.15, info['yF'] - 0.25
            decal(S, m, (sx * (W / 2 + 0.5), (y0 + y1) / 2, z), (-sx, 0, 0), (0, sx, 0), y1 - y0, 0.1, off=0.004, nu=24, nv=1)


# ---------------------------------------------------------------- экспорт
def pack_indexed(pos, nor, uv, groups, ps, us):
    """Вершины с одинаковыми позицией, нормалью и uv — общие (индексы Uint16/Uint32).
    Позиции Int16 (×ps), нормали Int8, uv Int16 (×us). Группы: [имя, начало индексов, число индексов, …]."""
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


def export(spec, info):
    """Группы по материалам. Колёса — отдельная геометрия (одна на машину, ось X)."""
    C3 = lambda p: (p.x, p.z, -p.y)
    out = {}
    for part in ('body', 'wheel'):
        by = {}
        for o in bpy.context.scene.objects:
            if o.type != 'MESH' or (o.get('part', 'body') != part):
                continue
            fit = json.loads(o['fituv']) if 'fituv' in o else None
            bm = bmesh.new(); bm.from_mesh(o.data)
            uvmap = {}
            if fit:
                for v, uv in zip(bm.verts, fit):
                    uvmap[v.index] = uv
            bmesh.ops.triangulate(bm, faces=bm.faces)
            bm.normal_update()
            mw = o.matrix_world; n3 = mw.to_3x3()
            for f in bm.faces:
                mat = o.data.materials[f.material_index].name
                L = by.setdefault(mat, {'pos': [], 'nor': [], 'uv': []})
                for lp in f.loops:
                    v = lp.vert
                    p = mw @ v.co
                    n = (n3 @ (v.normal if f.smooth else f.normal)).normalized()
                    L['pos'] += C3(p); L['nor'] += C3(n)
                    if fit:
                        L['uv'] += list(uvmap.get(v.index, (0, 0)))
                    elif 'rimuv' in o:
                        rr = o['rimuv']
                        L['uv'] += [0.5 + p.y / rr / 2, 0.5 + p.z / rr / 2]
                    elif 'fitface' in o:
                        # вывеска такси: картинка на передней и задней грани
                        L['uv'] += [(p.x + 0.36) / 0.72, (p.z - spec['H'] - 0.06) / 0.2]
                    else:
                        L['uv'] += [p.x, p.y]
            bm.free()
        pos, nor, uv, groups = [], [], [], []
        for name in sorted(by):
            L = by[name]
            groups.append([name, len(pos) // 3, len(L['pos']) // 3, TEXFIT.get(name), [round(x, 3) for x in PAL[name]]])
            pos += L['pos']; nor += L['nor']; uv += L['uv']
        out[part] = pack_indexed(pos, nor, uv, groups, 1000, 4096)
    W = spec['W']
    tw = spec['W'] / 2 - 0.13
    out['wheels'] = [[s * tw, info['wz'], -y] for y in (info['axF'], info['axR']) for s in (-1, 1)]
    out['r'] = info['r']
    out['size'] = [spec['W'], spec['H'], spec['L']]
    out['seat'] = [-0.38 * W / 2, spec['clear'] + 0.32, -(spec['ws'] - 0.8)]
    out['door'] = [-(W / 2 + 0.45), 0, -(spec['ws'] - 0.8)]
    out['lights'] = {'head': [[s * (W / 2 - 0.3), spec['nose'] + 0.05, -info['yF']] for s in (-1, 1)],
                     'tail': [[s * (W / 2 - 0.3), (spec.get('trunk') or spec.get('tail', spec['belt'])) - 0.16, -info['yR']] for s in (-1, 1)]}
    out['title'] = spec['title']
    out['kind'] = spec.get('colors', 'sedan')
    for k in ('taxi', 'police', 'sherut'):
        if spec.get(k):
            out[k] = True
    if spec.get('paint'):
        out['paint'] = list(spec['paint'])
    return out


def make(name, spec, lod=0):
    reset()
    body, cab, info = build(spec)
    if lod == 0:
        apply_subdiv(body, 1)
        apply_subdiv(cab, 1)
    S = details(spec, info)
    extras(spec, info)
    stripes(spec, info, S)
    for o in bpy.context.scene.objects:
        o['part'] = 'body'
    before = set(bpy.context.scene.objects)
    wheel(spec['r'], 0.2 + spec['r'] * 0.2)
    for o in bpy.context.scene.objects:
        if o not in before:
            o['part'] = 'wheel'
    return info


def render(path, spec, info):
    sc = bpy.context.scene
    # колёса на свои места для превью
    tw = spec['W'] / 2 - 0.13
    wheel_objs = [o for o in sc.objects if o.get('part') == 'wheel']
    for y in (info['axF'], info['axR']):
        for s in (-1, 1):
            for o in wheel_objs:
                c = o.copy(); c.data = o.data
                sc.collection.objects.link(c)
                c.matrix_world = Matrix.Translation((s * tw, y, info['wz'])) @ (Matrix.Rotation(math.pi, 4, 'Z') if s < 0 else Matrix())
                c['part'] = 'preview'
    for o in wheel_objs:
        o.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=30)
    g = bpy.context.active_object
    gm = bpy.data.materials.new('g'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.25, 0.26, 1)
    g.data.materials.append(gm)
    w = bpy.data.worlds.new('w'); sc.world = w
    try:
        w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.7, 0.85, 1)
    except Exception:
        pass
    sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); sun.data.energy = 3.5
    sun.rotation_euler = (0.8, 0.2, 2.4); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 45
    for k, d in (('a', (0.9, 1.0, 0.45)), ('b', (-1.0, -0.8, 0.5))):
        cam.location = Vector(d).normalized() * spec['L'] * 1.55 + Vector((0, 0, 0.3))
        cam.rotation_euler = (Vector((0, 0, spec['H'] * 0.45)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.engine = 'CYCLES'; sc.cycles.samples = 24
        sc.render.resolution_x, sc.render.resolution_y = 560, 380
        sc.render.filepath = path.replace('.png', f'_{k}.png')
        bpy.ops.render.render(write_still=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_dir = sys.argv[sys.argv.index('--render') + 1] if '--render' in sys.argv else None
    if out_dir in args:
        args.remove(out_dir)
    names = args or list(CARS)
    path = os.path.join(ROOT, 'assets', 'models', 'cars.js')
    data = {}
    if os.path.exists(path) and args:
        txt = open(path).read()
        data = json.loads(txt[txt.index('= ') + 2:txt.rindex(';')])
    for name in names:
        spec = dict(CARS[name])
        if 'base' in spec:
            b = dict(CARS[spec.pop('base')]); b.update(spec); spec = b
        info = make(name, spec, 1)
        lo = export(spec, info)['body']             # дальний вид: без сглаживания
        info = make(name, spec)
        e = export(spec, info)
        e['body_lo'] = lo
        data[name] = e
        print(f'{name}: кузов {e["body"]["tris"]} (вдали {lo["tris"]}) + колесо {e["wheel"]["tris"]}×4 треугольников')
        if out_dir:
            render(os.path.join(out_dir, name + '.png'), spec, info)
    with open(path, 'w') as f:
        f.write('// Сгенерировано tools/models/cars.py — не править руками\n')
        f.write('window.GEN_CARS = ' + json.dumps(data, separators=(',', ':')) + ';\n')


main()
