// Меши квартала: дома (слиты по материалам и участкам — мало вызовов отрисовки),
// земля, тротуары, бордюры, разметка, деревья, фонари, светофоры, киоск, пляж и море.
'use strict';
(() => {
  const C = G.City;
  const V = G.CityView = {};
  const R = G.rng(77);

  // перекраска штукатурки: у каждого дома своя (тот же каркас — другой цвет)
  const RECOLOR = {
    bauhaus: ['white', 'cream', 'pink', 'mint', 'blue', 'white'], shikun: ['beige', 'grey', 'cream', 'salmon'],
    eclectic: ['ochre', 'salmon', 'pink', 'cream', 'blue'], shops: ['beige', 'grey', 'cream', 'white', 'salmon'],
    tama: ['beige', 'grey', 'cream'], stone: ['white', 'grey', 'cream'], tower: ['white', 'grey'],
  };
  const TINTS = [[1, 1, 1], [1.0, 0.97, 0.92], [0.96, 0.97, 1.0], [1.02, 0.97, 0.9], [0.93, 0.93, 0.91], [1.0, 0.95, 0.95]];

  // ---------------------------------------------------------------- сборщик слитой геометрии
  class Merger {
    constructor() { this.b = {}; }
    get(key) { return this.b[key] || (this.b[key] = { pos: [], nor: [], uv: [], col: [], idx: [] }); }
    // part: {pos, nor, uv, idx}; x,z,yaw — положение; scale; tint
    add(key, part, x, y, z, yaw, tint = [1, 1, 1], scale = 1) {
      const B = this.get(key);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const base = B.pos.length / 3;
      const P = part.pos, N = part.nor;
      for (let i = 0; i < P.length; i += 3) {
        const px = P[i] * scale, py = P[i + 1] * scale, pz = P[i + 2] * scale;
        B.pos.push(x + px * c + pz * s, y + py, z - px * s + pz * c);
        B.nor.push(N[i] * c + N[i + 2] * s, N[i + 1], -N[i] * s + N[i + 2] * c);
        B.col.push(tint[0], tint[1], tint[2]);
      }
      for (let i = 0; i < part.uv.length; i++) B.uv.push(part.uv[i]);
      for (const k of part.idx) B.idx.push(base + k);
    }
    // прямоугольник в плоскости: 4 угла (по часовой при взгляде снаружи), uv по метрам
    quad(key, a, b, c, d, n, uvs, tint = [1, 1, 1]) {
      const B = this.get(key);
      const base = B.pos.length / 3;
      for (const p of [a, b, c, d]) { B.pos.push(p[0], p[1], p[2]); B.nor.push(n[0], n[1], n[2]); B.col.push(...tint); }
      for (const u of uvs) B.uv.push(u[0], u[1]);
      B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // горизонтальный прямоугольник сверху, uv = мир / scale
    flat(key, x0, z0, x1, z1, y, scale, tint) {
      this.quad(key, [x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0],
        [[x0 / scale, -z0 / scale], [x0 / scale, -z1 / scale], [x1 / scale, -z1 / scale], [x1 / scale, -z0 / scale]], tint);
    }
    // вертикальная стенка от (x0,z0) до (x1,z1), нормаль — вправо от направления
    wall(key, x0, z0, x1, z1, y0, y1, uscale, vscale = 1, tint) {
      const L = Math.hypot(x1 - x0, z1 - z0);
      const nx = (z1 - z0) / L, nz = -(x1 - x0) / L;
      this.quad(key, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [nx, 0, nz],
        [[0, 0], [L / uscale, 0], [L / uscale, (y1 - y0) / vscale], [0, (y1 - y0) / vscale]], tint);
    }
    box(key, x0, y0, z0, x1, y1, z1, scale = 1, tint) {
      this.flat(key, x0, z0, x1, z1, y1, scale, tint);
      this.wall(key, x0, z1, x1, z1, y0, y1, scale, scale, tint);
      this.wall(key, x1, z0, x0, z0, y0, y1, scale, scale, tint);
      this.wall(key, x0, z0, x0, z1, y0, y1, scale, scale, tint);
      this.wall(key, x1, z1, x1, z0, y0, y1, scale, scale, tint);
    }
    build(scene, matFor, opts = {}) {
      const meshes = [];
      for (const key in this.b) {
        const B = this.b[key];
        if (!B.idx.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
        g.setIndex(B.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.idx, 1) : new THREE.Uint16BufferAttribute(B.idx, 1));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, matFor(key));
        m.castShadow = opts.cast !== false; m.receiveShadow = true;
        m.matrixAutoUpdate = false;
        scene.add(m); meshes.push(m);
      }
      this.b = {};
      return meshes;
    }
  }
  V.Merger = Merger;

  // ---------------------------------------------------------------- инстансы мелочей
  class Instancer {
    constructor() { this.kinds = {}; }
    // kind — набор частей [{geo, mat, cast}]; каждая часть — свой InstancedMesh
    def(name, parts) { this.kinds[name] = { parts, list: [] }; }
    add(name, x, y, z, yaw = 0, s = 1, sy = s) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, sy, s));
      this.kinds[name].list.push(m);
      return this.kinds[name].list.length - 1;
    }
    build(scene) {
      const out = {};
      for (const name in this.kinds) {
        const k = this.kinds[name];
        if (!k.list.length) continue;
        out[name] = k.parts.map(p => {
          const im = new THREE.InstancedMesh(p.geo, p.mat, k.list.length);
          k.list.forEach((m, i) => im.setMatrixAt(i, m));
          im.castShadow = p.cast !== false; im.receiveShadow = p.receive !== false;
          im.computeBoundingSphere && im.computeBoundingSphere();
          scene.add(im);
          return im;
        });
      }
      return out;
    }
  }

  // ---------------------------------------------------------------- геометрия мелочей
  const lam = (o) => new THREE.MeshLambertMaterial(o);
  const tr = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s))); return g; };
  function merge(geos) {
    // простое слияние геометрий без индексов
    const out = { pos: [], nor: [], uv: [] };
    for (let g of geos) {
      g = g.index ? g.toNonIndexed() : g;
      out.pos.push(...g.attributes.position.array); out.nor.push(...g.attributes.normal.array);
      out.uv.push(...(g.attributes.uv ? g.attributes.uv.array : new Float32Array(g.attributes.position.count * 2)));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
    return g;
  }
  function lumpy(r, n, seed) {
    // крона фикуса: много неровных комков, сплюснутая сверху
    const rr = G.rng(seed), gs = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.IcosahedronGeometry(r * rr.range(0.34, 0.52), 0);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const f = 1 + (rr() - 0.5) * 0.35; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.75, p.getZ(k) * f); }
      const a = rr() * Math.PI * 2, d = r * Math.sqrt(rr()) * 0.75;
      gs.push(tr(g, Math.cos(a) * d, rr.range(-0.5, 0.7) * r * 0.45, Math.sin(a) * d));
    }
    const g = merge(gs);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i) * 0.7) / 1.3, p.getY(i) / 1.3);
    g.computeVertexNormals();
    // нормали «наружу от центра кроны» — мягкий свет, как у листвы
    const nn = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i) * 1.6, p.getZ(i)).normalize(); nn.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  function cards(r, n, seed) {
    // рваный край кроны: плоскости с вырезанными листьями
    const rr = G.rng(seed), gs = [];
    for (let i = 0; i < n; i++) {
      const s = r * rr.range(0.55, 0.85);
      const g = new THREE.PlaneGeometry(s * 2, s * 1.6);
      const a = rr() * Math.PI * 2, d = r * rr.range(0.55, 0.85);
      gs.push(tr(g, Math.cos(a) * d, rr.range(-0.3, 0.6) * r * 0.5, Math.sin(a) * d, rr.range(-0.3, 0.3), -a + Math.PI / 2, 0));
    }
    const g = merge(gs);
    const p = g.attributes.position, nn = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i) + r * 0.5, p.getZ(i)).normalize(); nn.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  function frondsGeo() {
    // крона пальмы: 16 изогнутых листьев (по 3 сегмента)
    const pos = [], uv = [], nor = [];
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + (i % 2) * 0.2;
      const up = i % 3 === 0 ? 0.5 : i % 3 === 1 ? 0.15 : -0.25;
      const L = 3.2, W = 0.9;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts = [];
      for (let k = 0; k <= 3; k++) {
        const t = k / 3;
        const r = L * t, y = up * L * t - 1.6 * t * t;
        pts.push([ca * r, y, sa * r]);
      }
      for (let k = 0; k < 3; k++) {
        const p0 = pts[k], p1 = pts[k + 1];
        const w0 = W * (1 - k / 3 * 0.6), w1 = W * (1 - (k + 1) / 3 * 0.6);
        const sx = -sa, sz = ca;
        const quad = [[p0[0] - sx * w0, p0[1], p0[2] - sz * w0], [p0[0] + sx * w0, p0[1], p0[2] + sz * w0], [p1[0] + sx * w1, p1[1], p1[2] + sz * w1], [p1[0] - sx * w1, p1[1], p1[2] - sz * w1]];
        const u0 = k / 3, u1 = (k + 1) / 3;
        const qu = [[u0, 0], [u0, 1], [u1, 1], [u1, 0]];
        for (const j of [0, 1, 2, 0, 2, 3]) { pos.push(...quad[j]); uv.push(...qu[j]); nor.push(0, 1, 0); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }

  // ---------------------------------------------------------------- сборка
  V.build = scene => {
    const M = new Merger();
    // ---- дома: слиты по клеткам 110 м и материалам
    const CH = 160;
    const chunks = {};
    const add = (bd, scale = 1) => {
      const parts = G.houseParts(bd.name);
      const kind = GEN_MODELS[bd.name].kind;
      const rr = G.rng(bd.seed || 1);
      const swap = {};
      const pal = RECOLOR[kind] || ['white'];
      const tint = TINTS[(bd.tint || 0) % TINTS.length];
      const key0 = Math.floor(bd.x / CH) + ',' + Math.floor(bd.z / CH);
      const ch = chunks[key0] || (chunks[key0] = new Merger());
      for (const p of parts) {
        let mat = p.mat;
        if (G.isPlaster(mat)) {
          if (!(mat in swap)) swap[mat] = rr() < 0.65 ? rr.pick(pal) : mat;
          mat = swap[mat];
        } else if (/^(shop|sign)\d$/.test(mat)) {
          // витрины и рекламные щиты — у каждого дома свои
          if (!(mat in swap)) swap[mat] = mat.slice(0, 4) + rr.int(1, 8);
          mat = swap[mat];
        }
        const pm = mat === p.mat ? p : { ...p, mat };
        if (!G.houseMat._info) G.houseMat._info = {};
        G.houseMat._info[mat] = G.houseMat._info[mat] || (mat === p.mat ? p : { mat, tex: ({ white: 'pl_white', cream: 'pl_cream', pink: 'pl_pink', blue: 'pl_blue', beige: 'pl_beige', grey: 'pl_grey', ochre: 'pl_ochre', salmon: 'pl_salmon', mint: 'pl_mint' })[mat] || mat.replace(/(\d)$/, '_$1'), bright: 1, color: [0.9, 0.9, 0.9] });
        ch.add(mat, pm, bd.x, 0.15, bd.z, bd.yaw, G.isPlaster(mat) ? tint : [1, 1, 1], scale);
      }
    };
    for (const bd of C.buildings) add(bd);
    for (const s of C.skyline) add({ ...s, seed: 9, tint: 0 }, s.scale);
    const houseMatFor = key => { const i = G.houseMat._info[key]; return G.houseMat(key, i.tex, i.bright, i.color); };
    V.houseMeshes = [];
    for (const k in chunks) V.houseMeshes.push(...chunks[k].build(scene, houseMatFor));

    // ---- земля
    const B = C.bounds;
    const matG = {
      asphalt: lam({ map: G.tex('asphalt'), vertexColors: true }),
      sidewalk: lam({ map: G.tex('sidewalk'), vertexColors: true }),
      plaza: lam({ map: G.tex('plaza'), vertexColors: true }),
      grass: lam({ map: G.tex('grass'), vertexColors: true }),
      dirt: lam({ map: G.tex('dirt'), vertexColors: true }),
      sand: lam({ map: G.tex('sand'), vertexColors: true }),
      curb: lam({ map: G.tex('curb'), vertexColors: true }),
      curb_bw: lam({ map: G.tex('curb_bw'), vertexColors: true }),
      curb_rw: lam({ map: G.tex('curb_rw'), vertexColors: true }),
      deck: lam({ map: G.tex('deck'), vertexColors: true }),
      wallW: lam({ map: G.tex('trim'), vertexColors: true }),
      hedge: lam({ map: G.tex('hedge'), vertexColors: true }),
      mark: new THREE.MeshLambertMaterial({ color: 0xe8e8e2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      markY: new THREE.MeshLambertMaterial({ color: 0xe8c22a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    };
    const g = new Merger();
    g.flat('asphalt', B.x0 + 55, B.z0, B.x1, B.z1, 0, 7);
    // кварталы: тротуар-кольцо, двор, бордюр
    const curbTex = (b, side) => {
      if (b.outer) return 'curb_bw';
      return R() < 0.75 ? 'curb_bw' : 'curb_rw';
    };
    for (const b of C.blocks) {
      const y = C.CURB;
      g.flat('sidewalk', b.ox0, b.oz0, b.ox1, b.z0, y, 1.8);
      g.flat('sidewalk', b.ox0, b.z1, b.ox1, b.oz1, y, 1.8);
      g.flat('sidewalk', b.ox0, b.z0, b.x0, b.z1, y, 1.8);
      g.flat('sidewalk', b.x1, b.z0, b.ox1, b.z1, y, 1.8);
      g.flat(b.outer ? 'dirt' : 'grass', b.x0, b.z0, b.x1, b.z1, y, 6);
      // бордюр по внешнему краю (сине-белый — платная парковка)
      g.wall(curbTex(b, 'N'), b.ox1, b.oz0, b.ox0, b.oz0, 0, y, 4, 0.15);
      g.wall(curbTex(b, 'S'), b.ox0, b.oz1, b.ox1, b.oz1, 0, y, 4, 0.15);
      g.wall(curbTex(b, 'W'), b.ox0, b.oz0, b.ox0, b.oz1, 0, y, 4, 0.15);
      g.wall(curbTex(b, 'E'), b.ox1, b.oz1, b.ox1, b.oz0, 0, y, 4, 0.15);
    }
    for (const m of C.medians) {
      g.flat('plaza', m.x0, m.z0, m.x1, m.z1, C.CURB, 2.5);
      g.flat('dirt', -3.5, m.z0 + 2, 3.5, m.z1 - 2, C.CURB + 0.01, 6);
      g.wall('curb', m.x1, m.z0, m.x0, m.z0, 0, C.CURB, 4, 0.15);
      g.wall('curb', m.x0, m.z1, m.x1, m.z1, 0, C.CURB, 4, 0.15);
      g.wall('curb', m.x0, m.z0, m.x0, m.z1, 0, C.CURB, 4, 0.15);
      g.wall('curb', m.x1, m.z1, m.x1, m.z0, 0, C.CURB, 4, 0.15);
    }
    const P = C.promenade;
    g.flat('deck', P.x0, P.z0, P.x0 + 6, P.z1, C.CURB, 3);
    g.flat('plaza', P.x0 + 6, P.z0, P.x1, P.z1, C.CURB, 2.5);
    g.wall('curb_rw', P.x1, P.z1, P.x1, P.z0, 0, C.CURB, 4, 0.15);
    g.flat('sand', C.beach.x0 - 6, C.beach.z0, C.beach.x1, C.beach.z1, C.CURB - 0.02, 6);
    // разметка: прерывистая ось, стоп-линии, зебры
    for (const e of C.edges) {
      const p = e.axis === 'ns' ? C.profV(e.a.x) : C.profH();
      const rx = -e.dz, rz = e.dx;
      const ax = (e.x0 - rx * e.lane), az = (e.z0 - rz * e.lane);   // ось улицы у начала полосы
      if (p.median === 0 && (e.dx > 0 || e.dz > 0)) {
        for (let s = 0; s < e.len; s += 6) {
          const s1 = Math.min(e.len, s + 3);
          const x0 = ax + e.dx * s, z0 = az + e.dz * s, x1 = ax + e.dx * s1, z1 = az + e.dz * s1;
          const wx = rx * 0.07, wz = rz * 0.07;
          g.flat('mark', Math.min(x0, x1) - Math.abs(wx), Math.min(z0, z1) - Math.abs(wz), Math.max(x0, x1) + Math.abs(wx), Math.max(z0, z1) + Math.abs(wz), 0.012, 1);
        }
      }
      // стоп-линия перед перекрёстком b (на своей половине)
      if (e.b.lights) {
        const sx = e.x1, sz = e.z1;
        const from = p.median, to = p.median + p.carr;
        const xa = sx - rx * e.lane + rx * from, za = sz - rz * e.lane + rz * from;
        const xb = sx - rx * e.lane + rx * to, zb = sz - rz * e.lane + rz * to;
        g.flat('mark', Math.min(xa, xb) - Math.abs(e.dx) * 0.2, Math.min(za, zb) - Math.abs(e.dz) * 0.2, Math.max(xa, xb) + Math.abs(e.dx) * 0.2, Math.max(za, zb) + Math.abs(e.dz) * 0.2, 0.013, 1);
      }
      // зебра у перекрёстка b — по всей ширине улицы (рисуем один раз на пару направлений)
      if (e.dx > 0 || e.dz > 0) {
        for (const [node, sgn] of [[e.b, -1], [e.a, 1]]) {
          const cross = (e.axis === 'ns' ? node.hz : node.hx) + 2.25;
          const cx = node.x + e.dx * sgn * cross, cz = node.z + e.dz * sgn * cross;
          const W = p.median + p.carr;
          for (let o = -W + 0.4; o < W - 0.3; o += 1.0) {
            if (Math.abs(o) < p.median) continue;
            const x = cx + rx * o, z = cz + rz * o;
            const hx = Math.abs(e.dx) * 1.5 + Math.abs(rx) * 0.25, hz = Math.abs(e.dz) * 1.5 + Math.abs(rz) * 0.25;
            g.flat('mark', x - hx, z - hz, x + hx, z + hz, 0.013, 1);
          }
        }
      }
    }
    // заборчики перед домами: низкая белёная стенка с проходом к подъезду
    for (const bd of C.buildings) {
      if (bd.style === 'outer' && R() < 0.3) continue;
      const m = GEN_MODELS[bd.name];
      const c = Math.cos(bd.yaw), s = Math.sin(bd.yaw);
      // линия забора — на краю участка, вдоль фасада
      const off = m.d / 2 + 3.2 - 0.1;
      const fx = bd.x + s * off, fz = bd.z + c * off;
      const ux = c, uz = -s;
      const w = m.w / 2 + 1;
      const hgt = 0.85;
      const tint = R.pick([[1, 1, 1], [1, 0.96, 0.9], [0.95, 0.95, 0.95]]);
      for (const [a, b2] of [[-w, -1.2], [1.2, w]]) {
        const x0 = fx + ux * a, z0 = fz + uz * a, x1 = fx + ux * b2, z1 = fz + uz * b2;
        const nx = -s * 0.1, nz = -c * 0.1;
        g.box('wallW', Math.min(x0, x1) - Math.abs(nx), C.CURB, Math.min(z0, z1) - Math.abs(nz), Math.max(x0, x1) + Math.abs(nx), C.CURB + hgt, Math.max(z0, z1) + Math.abs(nz), 1.5, tint);
        C.addBox(Math.min(x0, x1) - 0.12, Math.min(z0, z1) - 0.12, Math.max(x0, x1) + 0.12, Math.max(z0, z1) + 0.12, hgt + 0.15, 'wall');
        if (R() < 0.55) {
          const ix = -s * 0.6, iz = -c * 0.6;
          g.box('hedge', Math.min(x0, x1) + Math.min(0, ix), C.CURB, Math.min(z0, z1) + Math.min(0, iz), Math.max(x0, x1) + Math.max(0, ix), C.CURB + 1.5, Math.max(z0, z1) + Math.max(0, iz), 2);
        }
      }
    }
    g.build(scene, k => matG[k], { cast: false }).forEach(m => { if (['wallW', 'hedge'].includes(m.material === matG.wallW ? 'wallW' : m.material === matG.hedge ? 'hedge' : '')) m.castShadow = true; });

    // дальняя земля и море
    const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), lam({ color: 0x8c8574 }));
    far.rotation.x = -Math.PI / 2; far.position.set(500, -0.05, 0); scene.add(far);
    const seaTex = G.tex('sea').clone(); seaTex.needsUpdate = true; seaTex.repeat.set(200, 200);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshPhongMaterial({ map: seaTex, color: 0xc8e6ee, shininess: 90, specular: 0x557788 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(C.seaX - 1200, 0.02, 0); sea.receiveShadow = true; scene.add(sea);
    V.sea = seaTex;

    // ---------------------------------------------------------------- мелочи
    const I = new Instancer();
    const bark = lam({ map: G.tex('bark') });
    const leafMat = lam({ map: G.tex('hedge'), color: 0xa9c79a });
    const cardMat = lam({ map: G.tex('leaves', { clamp: true }), alphaTest: 0.5, side: THREE.DoubleSide, color: 0xb8d0a8 });
    I.def('ficus', [{ geo: tr(new THREE.CylinderGeometry(0.2, 0.32, 3.8, 7), 0, 1.9, 0), mat: bark }, { geo: tr(lumpy(3.4, 16, 3), 0, 5.4, 0), mat: leafMat }, { geo: tr(cards(3.4, 14, 4), 0, 5.4, 0), mat: cardMat }]);
    I.def('ficus2', [{ geo: tr(new THREE.CylinderGeometry(0.16, 0.26, 3.2, 7), 0, 1.6, 0), mat: bark }, { geo: tr(lumpy(2.7, 12, 8), 0, 4.5, 0), mat: leafMat }, { geo: tr(cards(2.7, 10, 9), 0, 4.5, 0), mat: cardMat }]);
    const palmBark = lam({ map: G.tex('palm_bark') });
    G.tex('palm_bark').repeat && (palmBark.map.repeat.set(1, 4));
    const frondMat = lam({ map: G.tex('palm_frond', { clamp: true }), alphaTest: 0.45, side: THREE.DoubleSide, transparent: false });
    I.def('palm', [
      { geo: tr(new THREE.CylinderGeometry(0.24, 0.36, 10, 8, 1, true), 0, 5, 0), mat: palmBark },
      { geo: tr(new THREE.ConeGeometry(0.9, 2.2, 8, 1, true), 0, 9.6, 0, Math.PI), mat: lam({ color: 0x7a6142, side: THREE.DoubleSide }) },
      { geo: tr(frondsGeo(), 0, 10.6, 0), mat: frondMat },
    ]);
    const poleMat = lam({ color: 0x55595e });
    const lampHead = G.houseMat('lamp', null, 1, [1, 0.95, 0.85]);
    I.def('lamp', [
      { geo: tr(new THREE.CylinderGeometry(0.06, 0.11, 7.6, 6), 0, 3.8, 0), mat: poleMat },
      { geo: tr(new THREE.BoxGeometry(0.08, 0.08, 1.6), 0, 7.5, 0.75), mat: poleMat },
      { geo: tr(new THREE.BoxGeometry(0.34, 0.14, 0.62), 0, 7.42, 1.5), mat: lampHead, cast: false },
    ]);
    const woodMat = lam({ map: G.tex('deck') });
    I.def('bench', [
      { geo: tr(new THREE.BoxGeometry(1.8, 0.06, 0.45), 0, 0.45, 0), mat: woodMat },
      { geo: tr(new THREE.BoxGeometry(1.8, 0.4, 0.05), 0, 0.72, -0.22), mat: woodMat },
      { geo: merge([tr(new THREE.BoxGeometry(0.06, 0.45, 0.45), -0.8, 0.22, 0), tr(new THREE.BoxGeometry(0.06, 0.45, 0.45), 0.8, 0.22, 0)]), mat: poleMat },
    ]);
    I.def('bin', [{ geo: tr(new THREE.CylinderGeometry(0.28, 0.25, 0.95, 10), 0, 0.48, 0), mat: lam({ color: 0x3b6e4a }) }]);
    // светофор: столб, кронштейн, корпус, три лампы (цвет — каждый кадр)
    const tlBody = lam({ color: 0x2a2c2e });
    I.def('tlight', [
      { geo: tr(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), 0, 1.7, 0), mat: tlBody },
      { geo: tr(new THREE.BoxGeometry(0.34, 1.05, 0.26), 0, 2.95, 0), mat: tlBody },
      { geo: tr(new THREE.BoxGeometry(0.62, 1.3, 0.04), 0, 2.95, -0.14), mat: lam({ color: 0xd8b52a }) },
    ]);
    const bulb = new THREE.CircleGeometry(0.11, 12);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    I.def('tl_r', [{ geo: tr(bulb.clone(), 0, 3.28, 0.135), mat: bulbMat, cast: false, receive: false }]);
    I.def('tl_y', [{ geo: tr(bulb.clone(), 0, 2.95, 0.135), mat: bulbMat, cast: false, receive: false }]);
    I.def('tl_g', [{ geo: tr(bulb.clone(), 0, 2.62, 0.135), mat: bulbMat, cast: false, receive: false }]);
    // киоск на бульваре
    const kioskTex = G.tex('kiosk', { clamp: true });
    I.def('kiosk', [
      { geo: tr(new THREE.BoxGeometry(4, 2.8, 3), 0, 1.4, 0), mat: lam({ color: 0xe9e1cf }) },
      { geo: tr(new THREE.PlaneGeometry(3.8, 2.6), 0, 1.4, 1.51), mat: lam({ map: kioskTex }) },
      { geo: tr(new THREE.BoxGeometry(5.2, 0.15, 4.2), 0, 2.95, 0.4), mat: lam({ color: 0x2c6b45 }) },
    ]);
    // остановка автобуса
    const signTex = G.tex('sign_2', { clamp: true });
    I.def('busstop', [
      { geo: tr(new THREE.BoxGeometry(4.2, 0.08, 1.8), 0, 2.5, 0), mat: lam({ color: 0x9aa0a6 }) },
      { geo: tr(new THREE.BoxGeometry(4.0, 1.9, 0.05), 0, 1.4, -0.8), mat: new THREE.MeshPhongMaterial({ color: 0x9fc0cc, transparent: true, opacity: 0.45 }) },
      { geo: tr(new THREE.PlaneGeometry(1.2, 1.8), 2.0, 1.4, 0, 0, -Math.PI / 2), mat: lam({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.25, side: THREE.DoubleSide }) },
      { geo: tr(new THREE.BoxGeometry(3, 0.06, 0.4), 0, 0.5, -0.5), mat: poleMat },
    ]);
    I.def('umbrella', [
      { geo: tr(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 5), 0, 1.2, 0), mat: poleMat },
      { geo: tr(new THREE.ConeGeometry(1.4, 0.5, 8, 1, true), 0, 2.4, 0), mat: lam({ map: G.tex('awning_red'), side: THREE.DoubleSide }) },
    ]);
    I.def('lounger', [{ geo: tr(new THREE.BoxGeometry(0.7, 0.12, 1.9), 0, 0.3, 0, 0.12), mat: lam({ color: 0xe9e3d0 }) }]);
    I.def('lifeguard', [
      { geo: merge([-1, 1].flatMap(x => [-1, 1].map(z => tr(new THREE.CylinderGeometry(0.08, 0.08, 3, 5), x, 1.5, z)))), mat: woodMat },
      { geo: tr(new THREE.BoxGeometry(3, 2.2, 3), 0, 4.1, 0), mat: lam({ color: 0xf2efe6 }) },
      { geo: tr(new THREE.BoxGeometry(3.6, 0.15, 3.6), 0, 5.3, 0), mat: lam({ color: 0x2a5aa0 }) },
    ]);
    // светлые пятна от фонарей ночью
    const poolMat = new THREE.MeshBasicMaterial({ map: G.glowTex('rgba(255,215,150,0.9)', 'rgba(255,190,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    I.def('pool', [{ geo: tr(new THREE.PlaneGeometry(9, 9), 0, 0, 0, -Math.PI / 2), mat: poolMat, cast: false, receive: false }]);
    V.poolMat = poolMat;

    // ---- расстановка
    const nearCross = (x, z, d = 10) => C.nodes.some(n => Math.abs(x - n.x) < n.hx + d + 4 && Math.abs(z - n.z) < n.hz + d + 4);
    const tree = (x, z, kind) => {
      const k = kind || (R() < 0.5 ? 'ficus' : 'ficus2');
      const s = R.range(0.85, 1.15);
      I.add(k, x, C.CURB, z, R() * 6.28, s);
      C.addCircle(x, z, k === 'palm' ? 0.38 : 0.36, 6, 'tree');
    };
    const lamp = (x, z, yaw) => {
      I.add('lamp', x, C.CURB, z, yaw);
      I.add('pool', x + Math.sin(yaw) * 1.5, C.CURB + 0.03, z + Math.cos(yaw) * 1.5, 0);
      C.addCircle(x, z, 0.16, 7, 'lamp');
    };
    for (const b of C.blocks) {
      // вдоль каждой стороны с тротуаром: деревья у бордюра, фонари
      const sides = [];
      if (b.oz0 < b.z0) sides.push({ x0: b.ox0, z0: b.oz0 + 0.9, x1: b.ox1, z1: b.oz0 + 0.9, yaw: Math.PI, st: b.street.N, ax: 'h' });
      if (b.oz1 > b.z1) sides.push({ x0: b.ox0, z0: b.oz1 - 0.9, x1: b.ox1, z1: b.oz1 - 0.9, yaw: 0, st: b.street.S, ax: 'h' });
      if (b.ox0 < b.x0) sides.push({ x0: b.ox0 + 0.9, z0: b.oz0, x1: b.ox0 + 0.9, z1: b.oz1, yaw: -Math.PI / 2, st: b.street.W, ax: 'v' });
      if (b.ox1 > b.x1) sides.push({ x0: b.ox1 - 0.9, z0: b.oz0, x1: b.ox1 - 0.9, z1: b.oz1, yaw: Math.PI / 2, st: b.street.E, ax: 'v' });
      for (const s of sides) {
        const L = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
        const kind = s.ax === 'h' && s.st === 45 ? 'palm' : null;
        const commercial = s.ax === 'h' && s.st === -45;
        for (let t = 6; t < L - 4; t += commercial ? 18 : R.range(10, 13)) {
          const x = G.lerp(s.x0, s.x1, t / L), z = G.lerp(s.z0, s.z1, t / L);
          if (nearCross(x, z, 4)) continue;
          tree(x, z, kind);
        }
        for (let t = 12; t < L - 4; t += 24) {
          const x = G.lerp(s.x0, s.x1, t / L), z = G.lerp(s.z0, s.z1, t / L);
          if (nearCross(x, z, 1)) continue;
          // фонарь смотрит на дорогу
          lamp(x + (s.ax === 'v' ? 0 : 0), z, s.yaw);
          if (R() < 0.25) { I.add('bin', x + (s.ax === 'v' ? 0.8 * Math.sign(-Math.sin(s.yaw)) : 2), C.CURB, z + (s.ax === 'h' ? 0.6 * -Math.sign(Math.cos(s.yaw)) : 2)); }
        }
      }
    }
    // бульвар: два ряда фикусов, фонари, скамейки, киоски
    for (const [mi, m] of C.medians.entries()) {
      for (let z = m.z0 + 5; z < m.z1 - 4; z += 9) {
        tree(-5.6, z + R.range(-1, 1), 'ficus'); tree(5.6, z + R.range(-1, 1), 'ficus');
      }
      for (let z = m.z0 + 9; z < m.z1 - 6; z += 18) {
        I.add('bench', -3.0, C.CURB, z, Math.PI / 2); I.add('bench', 3.0, C.CURB, z + 4, -Math.PI / 2);
        C.addBox(-3.3, z - 0.9, -2.7, z + 0.9, 1, 'bench'); C.addBox(2.7, z + 3.1, 3.3, z + 4.9, 1, 'bench');
      }
      for (let z = m.z0 + 14; z < m.z1 - 6; z += 22) { lamp(-7.3, z, Math.PI / 2); lamp(7.3, z + 11, -Math.PI / 2); }
      const kz = (m.z0 + m.z1) / 2;
      I.add('kiosk', 0, C.CURB, kz, mi % 2 ? Math.PI : 0);
      C.addBox(-2.6, kz - 2.2, 2.6, kz + 2.2, 3, 'kiosk');
      I.add('bin', 1.5, C.CURB, kz + 4); I.add('bin', -1.5, C.CURB, kz - 4);
    }
    // набережная: пальмы, фонари, скамейки к морю; пляж: зонтики, лежаки, вышка спасателей
    for (let z = P.z0 + 6; z < P.z1 - 4; z += 14) {
      tree(P.x0 + 7.5, z, 'palm');
      if (Math.round(z / 14) % 2) { I.add('bench', P.x0 + 1.5, C.CURB, z + 7, -Math.PI / 2); C.addBox(P.x0 + 1.2, z + 6.1, P.x0 + 1.8, z + 7.9, 1, 'bench'); }
    }
    for (let z = P.z0 + 12; z < P.z1 - 4; z += 26) lamp(P.x1 - 1.2, z, -Math.PI / 2);
    for (let i = 0; i < 70; i++) {
      const x = R.range(C.beach.x0 + 8, C.beach.x1 - 6), z = R.range(C.beach.z0 + 10, C.beach.z1 - 10);
      I.add('umbrella', x, C.CURB - 0.02, z, R() * 6);
      I.add('lounger', x + 0.9, C.CURB - 0.02, z + R.range(-0.5, 0.5), R.range(-0.4, 0.4) + Math.PI / 2);
      C.addCircle(x, z, 0.1, 2, 'pole');
    }
    for (const z of [-90, 20, 120]) { I.add('lifeguard', C.beach.x0 + 16, C.CURB, z, Math.PI / 2); C.addBox(C.beach.x0 + 14.5, z - 1.5, C.beach.x0 + 17.5, z + 1.5, 6, 'wall'); }
    // остановки на ул. Фришман
    for (const x of [-135, 45, 135]) {
      const z = 45 + C.road(C.profH()) + 1.4;
      I.add('busstop', x, C.CURB, z, Math.PI);
      C.addBox(x - 2.1, z - 0.2, x + 2.1, z + 1.0, 2.6, 'wall');
    }
    // светофоры: для каждой полосы, въезжающей в регулируемый перекрёсток
    V.lights = [];
    for (const e of C.edges) {
      if (!e.b.lights) continue;
      const p = e.axis === 'ns' ? C.profV(e.a.x) : C.profH();
      const rx = -e.dz, rz = e.dx;
      const off = p.median + p.carr + 0.7 - e.lane;
      const x = e.x1 + rx * off + e.dx * 1.0, z = e.z1 + rz * off + e.dz * 1.0;
      const yaw = Math.atan2(-e.dx, -e.dz);    // лампы смотрят навстречу машинам
      const idx = I.add('tlight', x, C.CURB, z, yaw);
      I.add('tl_r', x, C.CURB, z, yaw); I.add('tl_y', x, C.CURB, z, yaw); I.add('tl_g', x, C.CURB, z, yaw);
      C.addCircle(x, z, 0.14, 4, 'pole');
      V.lights.push({ node: e.b, axis: e.axis, idx });
    }
    V.inst = I.build(scene);

    // ---- обновление: море, светофоры, ночь
    const cR = new THREE.Color(), off = new THREE.Color(0x1a1a1a);
    const COL = { r: new THREE.Color(0xff2a1a), y: new THREE.Color(0xffb020), g: new THREE.Color(0x30ff70) };
    V.update = (dt, time, night) => {
      V.sea.offset.x = (time * 0.004) % 1; V.sea.offset.y = (time * 0.002) % 1;
      poolMat.opacity = night * 0.55;
      const [R_, Y_, G_] = [V.inst.tl_r[0], V.inst.tl_y[0], V.inst.tl_g[0]];
      const blink = (time * 2) % 1 < 0.5;
      V.lights.forEach((L, i) => {
        const st = C.light(L.node, L.axis, time);
        R_.setColorAt(i, st === 'red' || st === 'redyellow' ? COL.r : off);
        Y_.setColorAt(i, st === 'yellow' || st === 'redyellow' ? COL.y : off);
        G_.setColorAt(i, st === 'green' || (st === 'blink' && blink) ? COL.g : off);
      });
      R_.instanceColor.needsUpdate = Y_.instanceColor.needsUpdate = G_.instanceColor.needsUpdate = true;
    };
  };
})();
