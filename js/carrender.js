// Отрисовка машин инстансами: на каждый тип — кузов, стекло и колёса одним вызовом
// (вблизи — сглаженная модель, вдали — простая). Цвет краски — цвет экземпляра,
// фары, стоп-сигналы и маячки — атрибут iLights.
'use strict';
(() => {
  const CR = G.CarRender = {};
  const CAP = 40;
  const LOD_D = 55;
  const types = {};
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let beams = null, beamUsed = 0;

  function make(type) {
    const g = G.carGeoms(type);
    const t = { free: [], used: 0 };
    for (let i = CAP - 1; i >= 0; i--) t.free.push(i);
    const inst = (geo, mat, cap, shadow) => {
      if (!geo) return null;
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.frustumCulled = false;
      m.castShadow = shadow; m.receiveShadow = true;
      for (let i = 0; i < cap; i++) m.setMatrixAt(i, zero);
      m.count = 0;
      G.scene.add(m);
      return m;
    };
    const lights = geo => { if (geo && !geo.attributes.iLights) geo.setAttribute('iLights', new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4)); return geo; };
    t.body = inst(lights(g.body), G.carBodyMat(), CAP, true);
    t.bodyLo = inst(lights(g.bodyLo), G.carBodyMat(), CAP, true);
    t.glass = inst(g.glass, G.carMats().glass, CAP, false);
    t.glassLo = inst(g.glassLo, G.carMats().glass, CAP, false);
    t.wheel = inst(g.wheel, G.carMats().wheel, CAP * 4, true);
    // вдали — простой цилиндр вместо колеса с диском
    const r = g.d.r, w = 0.2 + r * 0.2;
    const wl = new THREE.CylinderGeometry(r, r, w, 10); wl.rotateZ(Math.PI / 2);
    t.wheelLo = inst(wl, CR.farWheelMat || (CR.farWheelMat = new THREE.MeshLambertMaterial({ color: 0x1d1d1f })), CAP * 4, false);
    for (const k of ['body', 'bodyLo']) { const m = t[k]; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3).fill(1), 3); }
    return (types[type] = t);
  }
  CR.alloc = type => {
    const t = types[type] || make(type);
    const slot = t.free.pop();
    if (slot === undefined) return -1;
    t.used = Math.max(t.used, slot + 1);
    for (const k of ['body', 'bodyLo', 'glass', 'glassLo']) if (t[k]) t[k].count = t.used;
    t.wheel.count = t.wheelLo.count = t.used * 4;
    return slot;
  };
  CR.free = (type, slot) => {
    const t = types[type];
    if (!t || slot < 0) return;
    for (const k of ['body', 'bodyLo', 'glass', 'glassLo']) if (t[k]) { t[k].setMatrixAt(slot, zero); t[k].instanceMatrix.needsUpdate = true; }
    for (let i = 0; i < 4; i++) { t.wheel.setMatrixAt(slot * 4 + i, zero); t.wheelLo.setMatrixAt(slot * 4 + i, zero); }
    t.wheel.instanceMatrix.needsUpdate = t.wheelLo.instanceMatrix.needsUpdate = true;
    t.free.push(slot);
  };
  // запись положения одной машины
  CR.set = (v, bodyM, wheelMs) => {
    const t = types[v.type];
    if (!t || v.slot < 0) return;
    const c = G.camPos;
    const far = c && G.dist2(v.x, v.z, c.x, c.z) > LOD_D * LOD_D;
    const on = far ? 'Lo' : '', off = far ? '' : 'Lo';
    t['body' + on].setMatrixAt(v.slot, bodyM); t['body' + off].setMatrixAt(v.slot, zero);
    if (t['glass' + on]) { t['glass' + on].setMatrixAt(v.slot, bodyM); t['glass' + off].setMatrixAt(v.slot, zero); }
    t['body' + on].setColorAt(v.slot, v.paint);
    const L = t['body' + on].geometry.attributes.iLights;
    L.setXYZW(v.slot, v.lights[0], v.lights[1], v.lights[2], v.lights[3]);
    const wOn = far ? t.wheelLo : t.wheel, wOff = far ? t.wheel : t.wheelLo;
    for (let i = 0; i < 4; i++) { wOn.setMatrixAt(v.slot * 4 + i, wheelMs[i]); wOff.setMatrixAt(v.slot * 4 + i, zero); }
    t.dirty = true;
  };
  CR.flush = () => {
    for (const k in types) {
      const t = types[k];
      if (!t.dirty) continue;
      t.dirty = false;
      for (const n of ['body', 'bodyLo', 'glass', 'glassLo', 'wheel', 'wheelLo']) if (t[n]) t[n].instanceMatrix.needsUpdate = true;
      for (const n of ['body', 'bodyLo']) { t[n].instanceColor.needsUpdate = true; t[n].geometry.attributes.iLights.needsUpdate = true; }
    }
    // свет фар на асфальте
    if (beams) { beams.count = beamUsed; beams.instanceMatrix.needsUpdate = true; }
    beamUsed = 0;
  };
  CR.beam = m => {
    if (!beams) {
      const mat = new THREE.MeshBasicMaterial({ map: G.glowTex('rgba(255,245,215,0.8)', 'rgba(255,230,180,0)'), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
      const geo = new THREE.PlaneGeometry(4.5, 9); geo.rotateX(-Math.PI / 2);
      beams = new THREE.InstancedMesh(geo, mat, 200); beams.frustumCulled = false; beams.count = 0;
      G.scene.add(beams);
    }
    if (beamUsed < 200) beams.setMatrixAt(beamUsed++, m);
    beams.material.opacity = 0.35 * (G.night || 0);
  };
})();
