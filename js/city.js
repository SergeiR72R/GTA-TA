// Квартал Тель-Авива: улицы, кварталы, участки домов, светофоры, полосы движения,
// тротуары для прохожих, столкновения. Только данные — меши строит js/cityview.js.
// Метры; x — восток, z — юг (вниз на карте), y — вверх. Движение правостороннее.
'use strict';
(() => {
  const C = G.City = {};
  const R = G.rng(2027);

  // улицы север-юг (x) и запад-восток (z)
  const VX = [-180, -90, 0, 90, 180];
  const HZ = [-135, -45, 45, 135];
  C.VX = VX; C.HZ = HZ;
  C.SIDE = 4.5;       // ширина тротуара
  C.CURB = 0.15;      // высота бордюра

  // профиль улицы: median — полуширина бульвара посередине, carr — ширина проезжей части
  // с каждой стороны, lane — смещение середины полосы от оси, park — середина парковочной полосы
  const STREET = { median: 0, carr: 5.5, lane: 2.0, park: 4.6 };
  const BLVD = { median: 8, carr: 6.5, lane: 10.0, park: 13.4 };
  const profV = x => x === 0 ? BLVD : STREET;
  const profH = () => STREET;
  C.profV = profV; C.profH = profH;
  const half = p => p.median + p.carr + C.SIDE;      // от оси до края тротуара
  const road = p => p.median + p.carr;               // от оси до бордюра
  C.half = half; C.road = road;

  C.names = {
    v: { '-180': 'ул. а-Яркон', '-90': 'ул. Бен-Иегуда', '0': 'бульвар Ротшильд', '90': 'ул. Дизенгоф', '180': 'ул. Ибн-Гвироль' },
    h: { '-135': 'ул. Арлозоров', '-45': 'ул. Алленби', '45': 'ул. Фришман', '135': 'ул. Жаботинский' },
  };
  C.zoneName = (x, z) => {
    if (x < -195) return x < -215 ? 'Пляж Гордон' : 'Набережная';
    if (Math.abs(x) < 21 && Math.abs(z) < 150) return 'Бульвар Ротшильд';
    if (Math.abs(z + 45) < 12 && Math.abs(x) < 190) return 'Алленби';
    if (z < -45) return x < 0 ? 'Белый город' : 'Лев а-Ир';
    return x < 0 ? 'Неве-Цедек' : 'Флорентин';
  };

  // ---------------------------------------------------------------- кварталы
  // block: {x0,z0,x1,z1 — участок без тротуаров; ox0..oz1 — с тротуарами; sides — какие стороны к улице}
  C.blocks = [];
  for (let i = 0; i < VX.length - 1; i++) for (let j = 0; j < HZ.length - 1; j++) {
    const b = { x0: VX[i] + half(profV(VX[i])), x1: VX[i + 1] - half(profV(VX[i + 1])), z0: HZ[j] + half(profH()), z1: HZ[j + 1] - half(profH()) };
    b.ox0 = b.x0 - C.SIDE; b.ox1 = b.x1 + C.SIDE; b.oz0 = b.z0 - C.SIDE; b.oz1 = b.z1 + C.SIDE;
    b.sides = 'NSEW'; b.inner = true;
    // какой улицей окружена каждая сторона
    b.street = { W: VX[i], E: VX[i + 1], N: HZ[j], S: HZ[j + 1] };
    C.blocks.push(b);
  }
  // внешний ряд: север, юг, восток — дома смотрят на кольцевую улицу
  const H0 = HZ[0] - half(STREET), H1 = HZ[3] + half(STREET);
  const V1 = VX[4] + half(STREET);
  const outer = [
    { x0: VX[0] - half(STREET), x1: V1, z0: H0 - 38, z1: H0, sides: 'S', street: { S: HZ[0] } },
    { x0: VX[0] - half(STREET), x1: V1, z0: H1, z1: H1 + 38, sides: 'N', street: { N: HZ[3] } },
    { x0: V1, x1: V1 + 40, z0: H0 - 38, z1: H1 + 38, sides: 'W', street: { W: VX[4] } },
  ];
  for (const b of outer) {
    b.ox0 = b.x0 - (b.sides.includes('W') ? C.SIDE : 0); b.ox1 = b.x1 + (b.sides.includes('E') ? C.SIDE : 0);
    b.oz0 = b.z0 - (b.sides.includes('N') ? C.SIDE : 0); b.oz1 = b.z1 + (b.sides.includes('S') ? C.SIDE : 0);
    b.outer = true;
    C.blocks.push(b);
  }
  // набережная и пляж на западе
  C.promenade = { x0: VX[0] - half(STREET) - 14, x1: VX[0] - road(STREET), z0: H0 - 38, z1: H1 + 38 };
  C.beach = { x0: C.promenade.x0 - 55, x1: C.promenade.x0, z0: H0 - 38, z1: H1 + 38 };
  C.seaX = C.beach.x0;
  C.bounds = { x0: C.seaX - 8, x1: V1 + 40, z0: H0 - 38, z1: H1 + 38 };

  // бульвар: отрезки разделительной аллеи между перекрёстками
  C.medians = [];
  for (let j = 0; j < HZ.length - 1; j++) {
    C.medians.push({ x0: -BLVD.median, x1: BLVD.median, z0: HZ[j] + road(STREET) + 4, z1: HZ[j + 1] - road(STREET) - 4 });
  }

  // приподнятые площадки (тротуар + участок): высота земли
  C.raised = [];
  for (const b of C.blocks) C.raised.push([b.ox0, b.oz0, b.ox1, b.oz1]);
  for (const m of C.medians) C.raised.push([m.x0, m.z0, m.x1, m.z1]);
  C.raised.push([C.promenade.x0, C.promenade.z0, C.promenade.x1, C.promenade.z1]);

  // ---------------------------------------------------------------- столкновения (сетка 10 м)
  const CELL = 10;
  const grid = new Map();
  const gkey = (cx, cz) => cx * 73856 + cz;
  C.colliders = [];
  C.addBox = (x0, z0, x1, z1, h = 30, tag = 'wall') => {
    const c = { t: 'box', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, tag };
    C.colliders.push(c);
    for (let cx = Math.floor(c.x0 / CELL); cx <= Math.floor(c.x1 / CELL); cx++)
      for (let cz = Math.floor(c.z0 / CELL); cz <= Math.floor(c.z1 / CELL); cz++) {
        const k = gkey(cx, cz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
      }
    return c;
  };
  C.addCircle = (x, z, r, h = 3, tag = 'pole') => {
    const c = { t: 'circle', x, z, r, h, tag };
    C.colliders.push(c);
    const k = gkey(Math.floor(x / CELL), Math.floor(z / CELL));
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
    return c;
  };
  C.query = (x, z, r, out = []) => {
    out.length = 0;
    const seen = C._seen || (C._seen = new Set());
    seen.clear();
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        const L = grid.get(gkey(cx, cz));
        if (L) for (const c of L) if (!seen.has(c)) { seen.add(c); out.push(c); }
      }
    return out;
  };

  // высота земли: на тротуарах и участках — бордюр
  const rgrid = new Map();
  for (const r of C.raised) {
    for (let cx = Math.floor(r[0] / CELL); cx <= Math.floor(r[2] / CELL); cx++)
      for (let cz = Math.floor(r[1] / CELL); cz <= Math.floor(r[3] / CELL); cz++) {
        const k = gkey(cx, cz); if (!rgrid.has(k)) rgrid.set(k, []); rgrid.get(k).push(r);
      }
  }
  C.groundY = (x, z) => {
    if (x < C.promenade.x0 && x > C.seaX) return 0.15 + G.clamp((x - C.seaX) / 55, 0, 1) * 0.0;
    const L = rgrid.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (L) for (const r of L) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return C.CURB;
    return 0;
  };

  // ---------------------------------------------------------------- участки домов
  const M = window.GEN_MODELS || {};
  const byKind = {};
  for (const k in M) (byKind[M[k].kind] = byKind[M[k].kind] || []).push(k);
  C.houseKinds = byKind;
  const STYLE = {
    blvd: ['bauhaus', 'bauhaus', 'eclectic', 'stone', 'tama', 'bauhaus'],
    shops: ['shops', 'shops', 'shops', 'eclectic', 'shops'],
    normal: ['shikun', 'bauhaus', 'stone', 'tama', 'eclectic', 'shikun', 'shops'],
    outer: ['stone', 'shikun', 'tower', 'tama', 'stone', 'tower'],
  };
  C.buildings = [];
  let lastPicks = [];
  function pickModel(style, maxW, maxD) {
    const kinds = STYLE[style].slice();
    for (let tries = 0; tries < 12; tries++) {
      const kind = R.pick(kinds);
      const list = (byKind[kind] || []).filter(n => M[n].w <= maxW && M[n].d <= maxD && !lastPicks.includes(n));
      if (list.length) { const n = R.pick(list); lastPicks = [n, ...lastPicks].slice(0, 3); return n; }
    }
    const all = Object.keys(M).filter(n => M[n].w <= maxW && M[n].d <= maxD && M[n].kind !== 'tower');
    return all.length ? R.pick(all) : null;
  }
  const yawFor = s => ({ S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 })[s];
  const SETBACK = 3.2;
  function styleFor(b, side) {
    if (b.outer) return 'outer';
    const st = b.street[side];
    if ((side === 'E' || side === 'W') && st === 0) return 'blvd';
    if ((side === 'N' || side === 'S') && st === -45) return 'shops';
    return 'normal';
  }
  // стороны: вдоль какой оси идём, нормаль наружу
  for (const b of C.blocks) {
    const W = b.x1 - b.x0, D = b.z1 - b.z0;
    const depthNS = Math.min(22, (D - 6) / 2), depthEW = Math.min(22, (W - 6) / 2);
    const used = { N: 0, S: 0 };
    for (const side of ['N', 'S', 'E', 'W']) {
      if (!b.sides.includes(side)) continue;
      const style = styleFor(b, side);
      let len, maxD, start = 2;
      if (side === 'N' || side === 'S') { len = W; maxD = b.outer ? D - SETBACK - 2 : depthNS - SETBACK; }
      else { len = D; maxD = b.outer ? W - SETBACK - 2 : depthEW - SETBACK; }
      let end = len - 2;
      // вдоль E идём с севера, вдоль W — с юга: не залезаем на дома северной и южной сторон
      if (!b.outer && side === 'E') { start = used.N + 3; end = len - used.S - 3; }
      if (!b.outer && side === 'W') { start = used.S + 3; end = len - used.N - 3; }
      let t = start;
      let maxDepthHere = 0;
      while (end - t > 10) {
        const name = pickModel(style, end - t, maxD);
        if (!name) break;
        const m = M[name];
        const c = t + m.w / 2;
        // центр участка
        let x, z;
        const off = SETBACK + m.d / 2;
        if (side === 'N') { x = b.x0 + c; z = b.z0 + off; }
        else if (side === 'S') { x = b.x1 - c; z = b.z1 - off; }
        else if (side === 'W') { z = b.z1 - c; x = b.x0 + off; }
        else { z = b.z0 + c; x = b.x1 - off; }
        // фасад к улице: модель смотрит на +z
        const yaw = yawFor(side === 'N' ? 'N' : side === 'S' ? 'S' : side === 'E' ? 'E' : 'W');
        C.buildings.push({ name, x, z, yaw, side, style, tint: R.int(0, 5), seed: R.int(0, 1e6) });
        maxDepthHere = Math.max(maxDepthHere, m.d + SETBACK);
        t += m.w + R.range(2.5, 5);
      }
      if (side === 'N' || side === 'S') used[side] = maxDepthHere;
    }
  }
  // фасадом к улице: N-сторона квартала смотрит на север (−z)
  // (модель смотрит на +z; поворот π разворачивает её на −z)
  for (const bd of C.buildings) {
    const m = M[bd.name];
    const [bx0, bz0, bx1, bz1] = m.box;
    const pts = [[bx0, bz0], [bx1, bz1]].map(([px, pz]) => {
      const c = Math.cos(bd.yaw), s = Math.sin(bd.yaw);
      return [bd.x + px * c + pz * s, bd.z - px * s + pz * c];
    });
    bd.col = C.addBox(pts[0][0], pts[0][1], pts[1][0], pts[1][1], m.top, 'building');
    bd.top = m.top;
  }
  // небоскрёбы на горизонте (без столкновений)
  C.skyline = [];
  for (let i = 0; i < 9; i++) {
    const towers = byKind.tower || [];
    if (!towers.length) break;
    C.skyline.push({ name: R.pick(towers), x: C.bounds.x1 + 60 + R.range(0, 160), z: -170 + i * 42 + R.range(-10, 10), yaw: R.pick([0, Math.PI / 2, Math.PI]), scale: R.range(1.0, 1.6) });
  }

  // ---------------------------------------------------------------- перекрёстки и светофоры
  C.nodes = [];
  const nodeAt = {};
  for (let i = 0; i < VX.length; i++) for (let j = 0; j < HZ.length; j++) {
    const n = { i, j, x: VX[i], z: HZ[j], out: [], hx: road(profV(VX[i])), hz: road(profH()), id: C.nodes.length,
      offset: R.range(0, 34), lights: false };
    C.nodes.push(n); nodeAt[i + ',' + j] = n;
  }
  C.node = (i, j) => nodeAt[i + ',' + j];
  // цикл 34 с: ось NS (машины по улицам x=const) — зелёный 0–11, мигает 11–13, жёлтый 13–15;
  // EW — зелёный 17–28, мигает 28–30, жёлтый 30–32; перед зелёным — красный с жёлтым 1.5 с
  const T = 34;
  C.light = (node, axis, time) => {
    if (!node.lights) return 'green';
    const t = ((time + node.offset) % T + T) % T;
    const s = axis === 'ns' ? t : (t + T - 17) % T;
    if (s < 11) return 'green';
    if (s < 13) return 'blink';
    if (s < 15) return 'yellow';
    if (s > T - 1.5) return 'redyellow';
    return 'red';
  };

  // ---------------------------------------------------------------- полосы движения
  // ребро графа: от узла a к узлу b, направление d, полоса справа
  C.edges = [];
  function addEdge(a, b, axis) {
    const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
    const p = axis === 'ns' ? profV(a.x) : profH();
    const rx = -dz, rz = dx;      // правая сторона
    const sa = (axis === 'ns' ? a.hz : a.hx) + 4.5, sb = (axis === 'ns' ? b.hz : b.hx) + 4.5;
    const e = { a, b, axis, dx, dz, lane: p.lane, park: p.park,
      x0: a.x + dx * sa + rx * p.lane, z0: a.z + dz * sa + rz * p.lane,
      x1: b.x - dx * sb + rx * p.lane, z1: b.z - dz * sb + rz * p.lane, id: C.edges.length };
    e.len = Math.hypot(e.x1 - e.x0, e.z1 - e.z0);
    e.heading = Math.atan2(-dx, -dz);   // машина смотрит вдоль −z модели
    C.edges.push(e); a.out.push(e);
  }
  for (let i = 0; i < VX.length; i++) for (let j = 0; j < HZ.length - 1; j++) {
    addEdge(C.node(i, j), C.node(i, j + 1), 'ns'); addEdge(C.node(i, j + 1), C.node(i, j), 'ns');
  }
  for (let j = 0; j < HZ.length; j++) for (let i = 0; i < VX.length - 1; i++) {
    addEdge(C.node(i, j), C.node(i + 1, j), 'ew'); addEdge(C.node(i + 1, j), C.node(i, j), 'ew');
  }
  for (const n of C.nodes) n.lights = n.out.length >= 3;

  // поворот на перекрёстке: кривая от конца входящей полосы к началу исходящей
  C.turnPath = (ein, eout) => {
    const p0 = [ein.x1, ein.z1], p2 = [eout.x0, eout.z0];
    let c;
    if (ein.dx * eout.dx + ein.dz * eout.dz > 0.5) c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
    else if (ein.dx !== 0) c = [p2[0], p0[1]];
    else c = [p0[0], p2[1]];
    const pts = [];
    const N = 8;
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = 1 - t;
      pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]]);
    }
    return pts;
  };
  C.nextEdges = e => e.b.out.filter(o => !(o.b === e.a));
  // кратчайшие расстояния между перекрёстками (Флойд — Уоршелл, узлов мало)
  {
    const N = C.nodes.length;
    const D = C.ndist = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => i === j ? 0 : 1e9));
    for (const e of C.edges) D[e.a.id][e.b.id] = Math.min(D[e.a.id][e.b.id], e.len + 15);
    for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
  }
  C.nearestNode = (x, z) => { let b = null, bd = 1e18; for (const n of C.nodes) { const d = G.dist2(x, z, n.x, n.z); if (d < bd) { bd = d; b = n; } } return b; };
  // ближайшая полоса: расстояние до отрезка + штраф за встречное направление
  C.nearestEdge = (x, z, heading) => {
    let best = null, bd = 1e18, bs = 0;
    for (const e of C.edges) {
      const s = G.clamp((x - e.x0) * e.dx + (z - e.z0) * e.dz, 0, e.len);
      const px = e.x0 + e.dx * s, pz = e.z0 + e.dz * s;
      let d = G.dist2(x, z, px, pz);
      if (heading !== undefined) d += Math.abs(G.wrapAngle(e.heading - heading)) * 40;
      if (d < bd) { bd = d; best = e; bs = s; }
    }
    return [best, bs];
  };

  // парковочные места вдоль бордюров (машины стоят у тротуара)
  C.parking = [];
  for (const e of C.edges) {
    if (e.len < 20) continue;
    const rx = -e.dz, rz = e.dx;
    const step = 6.2;
    for (let s = 8; s < e.len - 8; s += step) {
      // не у пешеходных переходов и не у автобусной остановки
      const x = e.x0 + e.dx * s + rx * (e.park - e.lane), z = e.z0 + e.dz * s + rz * (e.park - e.lane);
      C.parking.push({ x, z, heading: e.heading, edge: e, seed: R.int(0, 1e9), filled: R() < 0.5 });
    }
  }

  C.walkNear = (x, z, maxD = 1e9) => {
    let best = null, bd = maxD * maxD;
    for (const n of C.walk) { const d = G.dist2(x, z, n.x, n.z); if (d < bd) { bd = d; best = n; } }
    return best;
  };

  // ---------------------------------------------------------------- тротуары для прохожих
  // у каждого квартала — линия по середине тротуара; узлы у переходов помечены corner,
  // переходы через улицы связывают такие узлы по разные стороны перекрёстка
  C.walk = [];         // узлы {x, z, links: [{to, cross: узел светофора, axis}]}
  const wmap = new Map();
  const wnode = (x, z, corner) => {
    const k = Math.round(x * 2) + ',' + Math.round(z * 2);
    let n = wmap.get(k);
    if (!n) { n = { x, z, links: [], id: C.walk.length, corner: false }; C.walk.push(n); wmap.set(k, n); }
    if (corner) n.corner = true;
    return n;
  };
  const link = (a, b, cross = null, axis = null) => {
    if (a === b || a.links.some(l => l.to === b)) return;
    a.links.push({ to: b, cross, axis }); b.links.push({ to: a, cross, axis });
  };
  const hs = C.SIDE / 2;
  // координаты переходов: по x — у улиц север-юг, по z — у улиц запад-восток
  const crossX = []; for (const x of VX) crossX.push(x - road(profV(x)) - hs, x + road(profV(x)) + hs);
  const crossZ = []; for (const z of HZ) crossZ.push(z - road(STREET) - hs, z + road(STREET) + hs);
  // линия тротуара от (x0,z0) до (x1,z1) вдоль оси; узлы — через ~14 м и на переходах
  function walkLine(x0, z0, x1, z1) {
    const alongX = Math.abs(z1 - z0) < 0.01;
    const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    const ts = new Set([lo, hi]);
    for (const c of (alongX ? crossX : crossZ)) if (c > lo + 0.5 && c < hi - 0.5) ts.add(c);
    const sorted = [...ts].sort((p, q) => p - q);
    const pts = [];
    for (let i = 0; i < sorted.length; i++) {
      pts.push([sorted[i], true]);
      if (i < sorted.length - 1) {
        const k = Math.floor((sorted[i + 1] - sorted[i]) / 14);
        for (let j = 1; j <= k; j++) pts.push([sorted[i] + (sorted[i + 1] - sorted[i]) * j / (k + 1), false]);
      }
    }
    let prev = null;
    for (const [t, corner] of pts) {
      const n = alongX ? wnode(t, z0, corner) : wnode(x0, t, corner);
      if (prev) link(prev, n);
      prev = n;
    }
  }
  for (const b of C.blocks) {
    const xa = b.x0 - hs, xb = b.x1 + hs, za = b.z0 - hs, zb = b.z1 + hs;
    if (b.sides.includes('N')) walkLine(xa, za, xb, za);
    if (b.sides.includes('S')) walkLine(xa, zb, xb, zb);
    if (b.sides.includes('W')) walkLine(xa, za, xa, zb);
    if (b.sides.includes('E')) walkLine(xb, za, xb, zb);
  }
  // набережная — вдоль улицы а-Яркон, у моря
  walkLine(VX[0] - road(STREET) - hs, C.promenade.z0 + 4, VX[0] - road(STREET) - hs, C.promenade.z1 - 4);
  {
    let prev = null;
    for (let z = C.promenade.z0 + 6; z <= C.promenade.z1 - 6; z += 16) {
      const n = wnode(C.promenade.x0 + 4, z, false);
      if (prev) link(prev, n);
      if (Math.round(z / 16) % 3 === 0) link(n, C.walkNear(VX[0] - road(STREET) - hs, z, 12) || n);
      prev = n;
    }
  }
  // переходы у перекрёстков
  for (const n of C.nodes) {
    const corners = C.walk.filter(c => c.corner && Math.abs(c.x - n.x) < 30 && Math.abs(c.z - n.z) < 30);
    for (let a = 0; a < corners.length; a++) for (let b = a + 1; b < corners.length; b++) {
      const p = corners[a], q = corners[b];
      const sameZ = Math.abs(p.z - q.z) < 0.6, sameX = Math.abs(p.x - q.x) < 0.6;
      const dzn = Math.abs(p.z - n.z), dxn = Math.abs(p.x - n.x);
      // через улицу север-юг (идём по x, рядом с перекрёстком) — ждём красного для оси ns
      if (sameZ && (p.x - n.x) * (q.x - n.x) < 0 && dzn > 3 && dzn < n.hz + C.SIDE + 1 && Math.abs(Math.abs(p.x - n.x) - (n.hx + hs)) < 1 && Math.abs(Math.abs(q.x - n.x) - (n.hx + hs)) < 1) link(p, q, n, 'ns');
      else if (sameX && (p.z - n.z) * (q.z - n.z) < 0 && dxn > 3 && dxn < n.hx + C.SIDE + 1 && Math.abs(Math.abs(p.z - n.z) - (n.hz + hs)) < 1 && Math.abs(Math.abs(q.z - n.z) - (n.hz + hs)) < 1) link(p, q, n, 'ew');
    }
  }
  // границы мира
  C.addBox(C.bounds.x0 - 5, C.bounds.z0 - 5, C.bounds.x1 + 5, C.bounds.z0, 50, 'bound');
  C.addBox(C.bounds.x0 - 5, C.bounds.z1, C.bounds.x1 + 5, C.bounds.z1 + 5, 50, 'bound');
  C.addBox(C.bounds.x1, C.bounds.z0, C.bounds.x1 + 5, C.bounds.z1, 50, 'bound');
  C.addBox(C.bounds.x0 - 5, C.bounds.z0, C.bounds.x0, C.bounds.z1, 50, 'bound');
})();
