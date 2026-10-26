// Модели из Blender (assets/models/*.js): дома, машины, люди.
// Декодирование сжатых массивов и материалы.
'use strict';
(() => {
  const nightMats = G.nightMats = [];   // { mat, max } — свет ночью: emissiveIntensity = max × ночь

  // ---------------------------------------------------------------- дома
  const hcache = {};
  // по каждой группе — свой компактный кусок: позиции, нормали, uv, индексы
  G.houseParts = name => {
    if (hcache[name]) return hcache[name];
    const d = GEN_MODELS[name];
    const P = G.b64(d.pos, Int16Array), N = G.b64(d.nor, Int8Array), U = G.b64(d.uv, Int16Array);
    const I = G.b64(d.idx, d.big ? Uint32Array : Uint16Array);
    const parts = [];
    for (const [mat, start, count, tex, bright, color] of d.groups) {
      const map = new Map();
      const pos = [], nor = [], uv = [], idx = [];
      for (let k = start; k < start + count; k++) {
        const v = I[k];
        let j = map.get(v);
        if (j === undefined) {
          j = pos.length / 3; map.set(v, j);
          pos.push(P[v * 3] / 100, P[v * 3 + 1] / 100, P[v * 3 + 2] / 100);
          nor.push(N[v * 3] / 127, N[v * 3 + 1] / 127, N[v * 3 + 2] / 127);
          uv.push(U[v * 2] / 512, U[v * 2 + 1] / 512);
        }
        idx.push(j);
      }
      parts.push({ mat, tex, bright, color, pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx });
    }
    return (hcache[name] = parts);
  };

  // материалы домов по имени группы (общие для всех домов)
  const hm = {};
  const PLASTER = new Set(['white', 'cream', 'pink', 'blue', 'beige', 'grey', 'ochre', 'salmon', 'mint']);
  G.isPlaster = n => PLASTER.has(n);
  G.houseMat = (name, tex, bright, color) => {
    if (hm[name]) return hm[name];
    let m;
    if (name === 'win') {
      const A = G.winAtlas();
      m = new THREE.MeshLambertMaterial({ map: A.map, emissiveMap: A.em, emissive: 0xffffff, emissiveIntensity: 0 });
      nightMats.push({ mat: m, max: 1.15 });
    } else if (name === 'lamp') {
      m = new THREE.MeshLambertMaterial({ color: 0xfff1d0, emissive: 0xffd8a0, emissiveIntensity: 0 });
      nightMats.push({ mat: m, max: 1.5 });
    } else if (/^(shop|sign)\d/.test(name)) {
      const t = G.tex(tex, { clamp: true });
      m = new THREE.MeshLambertMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0 });
      nightMats.push({ mat: m, max: name.startsWith('sign') ? 0.9 : 0.55 });
    } else if (name === 'glass' || name === 'glassB') {
      m = new THREE.MeshPhongMaterial({ map: G.tex(tex), color: 0xffffff, shininess: 80, specular: 0x777777 });
    } else if (tex) {
      const b = bright || 1;
      m = new THREE.MeshLambertMaterial({ map: G.tex(tex), color: new THREE.Color(b, b, b), vertexColors: true });
    } else {
      m = new THREE.MeshLambertMaterial({ color: new THREE.Color().setRGB(...color.map(x => Math.pow(x, 2.2))), vertexColors: true });
    }
    if (name.startsWith('plant') || name.startsWith('cloth') || name === 'bougain') m.side = THREE.DoubleSide;
    m.name = name;
    return (hm[name] = m);
  };

  // ---------------------------------------------------------------- машины
  // атлас деталей машин: 6 ячеек 256×128 (фара, фонарь, решётка, номер, шашка такси, диск) + белая
  let carAtlas = null;
  const CELLS = ['car_headlight', 'car_taillight', 'car_grille', 'car_plate_il', 'car_taxi_sign', 'car_rim', 'white'];
  function atlas() {
    if (carAtlas) return carAtlas;
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    const cell = i => i === 5 ? [256, 256, 256, 256] : i === 6 ? [0, 384, 256, 128] : [(i % 2) * 256, Math.floor(i / 2) * 128, 256, 128];
    const draw = () => {
      CELLS.forEach((n, i) => {
        const [x, y, w, h] = cell(i);
        if (n === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); return; }
        const src = G.tex(n, { clamp: true }).image;
        if (src && (src.width || src.naturalWidth)) ctx.drawImage(src, x, y, w, h);
      });
      t.needsUpdate = true;
    };
    draw();
    CELLS.forEach(n => { if (n === 'white') return; const im = G.tex(n, { clamp: true }).image; if (im && im.addEventListener && !im.complete) im.addEventListener('load', draw); });
    // ячейка в uv (0..1, v снизу)
    const rect = n => { const [x, y, w, h] = cell(CELLS.indexOf(n)); return [x / 512, 1 - (y + h) / 512, w / 512, h / 512]; };
    return (carAtlas = { tex: t, rect });
  }
  const FIT = { headlight: 'car_headlight', taillight: 'car_taillight', grille: 'car_grille', plate: 'car_plate_il', plateR: 'car_plate_il', taxisign: 'car_taxi_sign', rim: 'car_rim' };
  // маски света: фары, задние фонари (стоп/габариты), маячок красный, маячок синий
  const LMASK = { headlight: [1, 0, 0, 0], taillight: [0, 1, 0, 0], reverse: [0, 0.3, 0, 0], indicator: [0, 0.5, 0, 0], lightbarR: [0, 0, 1, 0], lightbarB: [0, 0, 0, 1] };
  const ccache = {};
  function buildCarGeo(part, filter) {
    const A = atlas();
    const P = G.b64(part.pos, Int16Array), N = G.b64(part.nor, Int8Array), U = G.b64(part.uv, Int16Array);
    const I = G.b64(part.idx, part.big ? Uint32Array : Uint16Array);
    const out = { pos: [], nor: [], uv: [], col: [], paint: [], light: [], idx: [] };
    const map = new Map();
    let gi = 0;
    for (const [mat, start, count, , color] of part.groups) {
      gi++;
      if (!filter(mat)) continue;
      const fit = FIT[mat];
      const r = fit ? A.rect(fit) : A.rect('white');
      const lin = fit || mat === 'paint' ? [1, 1, 1] : color.map(x => Math.pow(x, 2.2));
      const lm = LMASK[mat] || [0, 0, 0, 0];
      for (let k = start; k < start + count; k++) {
        const v = I[k];
        const key = v * 64 + gi;
        let j = map.get(key);
        if (j === undefined) {
          j = out.pos.length / 3; map.set(key, j);
          out.pos.push(P[v * 3] / 1000, P[v * 3 + 1] / 1000, P[v * 3 + 2] / 1000);
          out.nor.push(N[v * 3] / 127, N[v * 3 + 1] / 127, N[v * 3 + 2] / 127);
          let u = U[v * 2] / 4096, w = U[v * 2 + 1] / 4096;
          if (fit) { u = r[0] + G.clamp(u, 0, 1) * r[2]; w = r[1] + G.clamp(w, 0, 1) * r[3]; }
          else { u = r[0] + 0.5 * r[2]; w = r[1] + 0.5 * r[3]; }
          out.uv.push(u, w);
          out.col.push(...lin);
          out.paint.push(mat === 'paint' ? 1 : 0);
          out.light.push(...lm);
        }
        out.idx.push(j);
      }
    }
    if (!out.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
    g.setAttribute('paintMask', new THREE.Float32BufferAttribute(out.paint, 1));
    g.setAttribute('lightMask', new THREE.Float32BufferAttribute(out.light, 4));
    g.setIndex(out.idx);
    g.computeBoundingSphere();
    return g;
  }
  // геометрия машины: body (всё непрозрачное, вблизи и вдали), glass, wheel
  G.carGeoms = name => {
    if (ccache[name]) return ccache[name];
    const d = GEN_CARS[name];
    const notGlass = m => m !== 'glass' && m !== 'mirrorG';
    const isGlass = m => !notGlass(m);
    return (ccache[name] = {
      body: buildCarGeo(d.body, notGlass), glass: buildCarGeo(d.body, isGlass),
      bodyLo: buildCarGeo(d.body_lo || d.body, notGlass), glassLo: buildCarGeo(d.body_lo || d.body, isGlass),
      wheel: buildCarGeo(d.wheel, () => true), d,
    });
  };
  const shared = {};
  G.carMats = () => {
    if (shared.glass) return shared;
    const A = atlas();
    shared.glass = new THREE.MeshStandardMaterial({ color: 0x1c2630, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.72 });
    shared.wheel = new THREE.MeshStandardMaterial({ map: A.tex, vertexColors: true, roughness: 0.7, metalness: 0.2 });
    return shared;
  };
  // материал кузова: краска — из цвета экземпляра (только где paintMask), свет — из iLights
  G.carBodyMat = () => {
    if (shared.body) return shared.body;
    const A = atlas();
    const m = new THREE.MeshStandardMaterial({ map: A.tex, vertexColors: true, roughness: 0.6, metalness: 0.12 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float paintMask;\nattribute vec4 lightMask;\nattribute vec4 iLights;\nvarying float vPaint;\nvarying vec3 vEm;')
        .replace('#include <color_vertex>', `vColor = color;
          #ifdef USE_INSTANCING_COLOR
            vColor.xyz = mix(color, color * instanceColor, paintMask);
          #endif
          vPaint = paintMask;
          vEm = lightMask.x * iLights.x * vec3(1.0, 0.92, 0.75) * 2.2 + lightMask.y * iLights.y * vec3(1.0, 0.08, 0.03) * 2.4
              + lightMask.z * iLights.z * vec3(1.0, 0.05, 0.02) * 4.0 + lightMask.w * iLights.w * vec3(0.1, 0.3, 1.0) * 4.0;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vPaint;\nvarying vec3 vEm;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.26, vPaint);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.55, vPaint);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEm * diffuseColor.rgb;');
    };
    return (shared.body = m);
  };
  // цвета: в Израиле больше всего белых и серебристых
  G.carColor = (R, kind) => {
    const r = R();
    const pal = r < 0.32 ? 0xf2f2f0 : r < 0.55 ? 0xb9bdc2 : r < 0.68 ? 0x6d7177 : r < 0.77 ? 0x1b1d20 : r < 0.84 ? 0x1f3c78
      : r < 0.89 ? 0x9c1c1c : r < 0.93 ? 0xd8cfb5 : r < 0.96 ? 0x2f5d3b : kind === 'old' ? 0xb8862e : 0xe0a020;
    return new THREE.Color(pal);
  };

  // ---------------------------------------------------------------- люди
  const pcache = {};
  function skinGeo(d) {
    const g = new THREE.BufferGeometry();
    const P = G.b64(d.pos, Int16Array), N = G.b64(d.nor, Int8Array), U = G.b64(d.uv, Uint16Array);
    const pos = new Float32Array(P.length), nor = new Float32Array(N.length), uv = new Float32Array(U.length);
    for (let i = 0; i < P.length; i++) { pos[i] = P[i] / 1000; nor[i] = N[i] / 127; }
    for (let i = 0; i < U.length; i += 2) { uv[i] = U[i] / 65535; uv[i + 1] = U[i + 1] / 65535; }
    const si = G.b64(d.si, Uint8Array), sw = G.b64(d.sw, Uint8Array);
    const swf = new Float32Array(sw.length);
    for (let i = 0; i < sw.length; i++) swf[i] = sw[i] / 255;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(si), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(swf, 4));
    g.setIndex(new THREE.BufferAttribute(G.b64(d.idx, Uint16Array), 1));
    g.computeBoundingSphere();
    g.boundingSphere.radius = 1.4; g.boundingSphere.center.set(0, 0.9, 0);
    return g;
  }
  G.pedKind = kind => {
    if (pcache[kind]) return pcache[kind];
    const P = GEN_PEOPLE;
    const b = P.bodies[kind];
    const res = { body: skinGeo(b.body), eyes: b.eyes && skinGeo(b.eyes), brows: skinGeo(b.brows), bones: b.bones, clips: {}, hair: {} };
    // анимации: повороты костей (Int16) и сдвиг таза
    for (const name in P.anims[kind]) {
      const a = P.anims[kind][name];
      const q = G.b64(a.q, Int16Array), p = G.b64(a.p, Float32Array);
      const nb = b.bones.length;
      const times = new Float32Array(a.n);
      for (let f = 0; f < a.n; f++) times[f] = f / a.fps;
      const tracks = [];
      for (let bi = 0; bi < nb; bi++) {
        const vals = new Float32Array(a.n * 4);
        for (let f = 0; f < a.n; f++) for (let c = 0; c < 4; c++) vals[f * 4 + c] = q[(f * nb + bi) * 4 + c] / 32767;
        tracks.push(new THREE.QuaternionKeyframeTrack(b.bones[bi].name + '.quaternion', times, vals));
      }
      tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, p));
      const clip = new THREE.AnimationClip(name, a.n > 1 ? (a.n - 1) / a.fps : 0.1, tracks);
      clip.loop = a.loop;
      res.clips[name] = clip;
    }
    return (pcache[kind] = res);
  };
  G.pedHair = (key) => {
    if (pcache['h_' + key]) return pcache['h_' + key];
    return (pcache['h_' + key] = skinGeo(GEN_PEOPLE.hair[key]));
  };
  // брови, причёска и борода — одна геометрия (все привязаны к голове)
  function hairCombo(o) {
    const key = 'c_' + o.hair + (o.beard ? '+b' : '') + o.body;
    if (pcache[key]) return pcache[key];
    const parts = [G.pedKind(o.body).brows, G.pedHair(o.hair)];
    if (o.beard && GEN_PEOPLE.hair['Hair_Beard_' + o.body]) parts.push(G.pedHair('Hair_Beard_' + o.body));
    const names = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
    const arrs = {}; names.forEach(n => { arrs[n] = []; });
    const idx = [];
    let base = 0;
    for (const g of parts) {
      for (const n of names) arrs[n].push(...g.attributes[n].array);
      for (const i of g.index.array) idx.push(i + base);
      base += g.attributes.position.count;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arrs.position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(arrs.normal, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(arrs.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(arrs.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(arrs.skinWeight, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    g.boundingSphere.radius = 1.4; g.boundingSphere.center.set(0, 0.9, 0);
    return (pcache[key] = g);
  }
  const pm = {};
  G.pedMats = outfit => {
    if (pm[outfit]) return pm[outfit];
    const o = GEN_PEOPLE.outfits[outfit];
    const t = new THREE.Texture(); const im = new Image(); im.src = o.tex; t.image = im;
    im.onload = () => { t.needsUpdate = true; };
    t.encoding = THREE.sRGBEncoding;
    const body = new THREE.MeshLambertMaterial({ map: t });
    if (!pm._hairTex) {
      const ht = new THREE.Texture(); const hi = new Image(); hi.src = GEN_PEOPLE.hairTex; ht.image = hi;
      hi.onload = () => { ht.needsUpdate = true; };
      ht.encoding = THREE.sRGBEncoding; ht.wrapS = ht.wrapT = THREE.RepeatWrapping;
      pm._hairTex = ht;
      const et = new THREE.Texture(); const ei = new Image(); ei.src = GEN_PEOPLE.bodies.m.eyesTex; et.image = ei;
      ei.onload = () => { et.needsUpdate = true; };
      et.encoding = THREE.sRGBEncoding;
      pm._eyes = new THREE.MeshLambertMaterial({ map: et });
    }
    const hc = o.hc.map(x => Math.pow(x / 255, 2.2) * 2.2);
    const hair = new THREE.MeshLambertMaterial({ map: pm._hairTex, color: new THREE.Color(...hc), side: THREE.DoubleSide });
    return (pm[outfit] = { body, hair, eyes: pm._eyes });
  };

  // собрать человека: группа, скелет, меши, анимации
  G.makePedModel = outfit => {
    const o = GEN_PEOPLE.outfits[outfit];
    const K = G.pedKind(o.body);
    const mats = G.pedMats(outfit);
    const root = new THREE.Group();
    const bones = K.bones.map(b => {
      const bone = new THREE.Bone();
      bone.name = b.name;
      bone.position.set(b.p[0], b.p[1], b.p[2]);
      bone.quaternion.set(b.q[0], b.q[1], b.q[2], b.q[3]);
      return bone;
    });
    K.bones.forEach((b, i) => { if (b.parent >= 0) bones[b.parent].add(bones[i]); else root.add(bones[i]); });
    root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    const add = (geo, mat) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.bind(skel);
      m.castShadow = true;
      m.frustumCulled = true;
      root.add(m);
      return m;
    };
    const body = add(K.body, mats.body);
    if (K.eyes) add(K.eyes, mats.eyes);
    add(hairCombo(o), mats.hair);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const n in K.clips) {
      const a = mixer.clipAction(K.clips[n]);
      if (!K.clips[n].loop) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      actions[n] = a;
    }
    return { root, body, mixer, actions, bones, kind: o.body };
  };
  G.OUTFITS_PED = () => Object.keys(GEN_PEOPLE.outfits).filter(n => n !== 'leva' && !n.startsWith('cop'));
})();
