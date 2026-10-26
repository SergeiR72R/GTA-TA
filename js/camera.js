// Камера от третьего лица, как в GTA 3: мышь крутит камеру, без мыши она сама уходит за спину;
// в машине — камера погони с запаздыванием. Не проходит сквозь дома.
'use strict';
(() => {
  const C = G.City;
  const I = G.input;
  const cam = G.cam = { yaw: 0, pitch: 0.22, dist: 4.6, look: 0, mode: 'foot', far: 0, carDist: 1 };
  const tmpQ = [];
  const target = new THREE.Vector3(), pos = new THREE.Vector3();

  // луч от цели к камере против коробок домов: доля пути до препятствия
  function clip(tx, ty, tz, px, py, pz) {
    let tmin = 1;
    const minx = Math.min(tx, px) - 0.5, maxx = Math.max(tx, px) + 0.5, minz = Math.min(tz, pz) - 0.5, maxz = Math.max(tz, pz) + 0.5;
    const near = C.query((minx + maxx) / 2, (minz + maxz) / 2, Math.max(maxx - minx, maxz - minz) / 2 + 1, tmpQ);
    const dx = px - tx, dy = py - ty, dz = pz - tz;
    for (const c of near) {
      if (c.t !== 'box' || c.h < 2.5 || c.tag === 'bound') continue;
      // пересечение отрезка с параллелепипедом (x0..x1, 0..h, z0..z1), с запасом
      const pad = 0.35;
      let t0 = 0, t1 = 1;
      const slab = (o, d, lo, hi) => {
        if (Math.abs(d) < 1e-6) return o >= lo && o <= hi;
        let a = (lo - o) / d, b = (hi - o) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        return t0 <= t1;
      };
      if (slab(tx, dx, c.x0 - pad, c.x1 + pad) && slab(tz, dz, c.z0 - pad, c.z1 + pad) && slab(ty, dy, -1, c.h + 0.3)) tmin = Math.min(tmin, t0);
    }
    return tmin;
  }

  G.updateCamera = (camera, dt) => {
    const p = G.player;
    if (!p) return;
    const v = p.inCar;
    const mouse = I.locked && (Math.abs(I.mdx) + Math.abs(I.mdy) > 0);
    cam.yaw -= I.mdx * 0.0026;
    cam.pitch = G.clamp(cam.pitch + I.mdy * 0.0022, -0.45, 1.05);
    const idle = (performance.now() - I.lastMouse) / 1000;
    if (I.wheel) cam.dist = G.clamp(cam.dist + I.wheel * 0.5, 2.6, 9);
    if (I.hit('KeyV')) cam.far = (cam.far + 1) % 3;
    let tx, ty, tz, dist, height = 0;
    if (v) {
      cam.mode = 'car';
      // за машиной; при заднем ходе — не разворачиваемся
      const back = v.fspeed < -3 && idle > 0.5;
      const want = v.heading + (back ? Math.PI : 0);
      if (idle > 1.4) cam.yaw = G.lerpAngle(cam.yaw, want, 1 - Math.exp(-3.2 * dt));
      if (idle > 1.4) cam.pitch = G.lerp(cam.pitch, 0.2, 1 - Math.exp(-2 * dt));
      tx = v.x; ty = v.y + v.H * 0.75; tz = v.z;
      dist = (5.2 + v.L * 0.45) * [1, 1.45, 0.72][cam.far] + Math.min(4, v.speed * 0.06);
      height = 0.6;
    } else {
      cam.mode = 'foot';
      const moving = Math.hypot(p.vx, p.vz) > 1;
      if (idle > 1.2 && moving && !p.dead) cam.yaw = G.lerpAngle(cam.yaw, p.heading + Math.PI, 1 - Math.exp(-2.2 * dt));
      tx = p.x; ty = p.y + 1.55; tz = p.z;
      dist = cam.dist * [1, 1.4, 0.75][cam.far];
      if (p.dead) dist += 2;
    }
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // назад от направления взгляда (взгляд — вдоль (−sin yaw, −cos yaw))
    let px = tx + Math.sin(cam.yaw) * cp * dist, py = ty + sp * dist + height, pz = tz + Math.cos(cam.yaw) * cp * dist;
    py = Math.max(py, C.groundY(px, pz) + 0.4);
    // не ближе 1.1 м к цели: если стена ближе — поднимаем камеру над головой
    let k = clip(tx, ty, tz, px, py, pz);
    if (k * dist < 1.1) { k = 1.1 / dist; py += 1.2; }
    cam.k = G.lerp(cam.k || 1, k, k < (cam.k || 1) ? 1 : 1 - Math.exp(-4 * dt));
    px = tx + (px - tx) * cam.k; py = ty + (py - ty) * cam.k; pz = tz + (pz - tz) * cam.k;
    // тряска при ударах
    G.shake = Math.max(0, (G.shake || 0) - dt * 1.6);
    const s = G.shake * 0.25;
    pos.set(px + (Math.random() - 0.5) * s, py + (Math.random() - 0.5) * s, pz + (Math.random() - 0.5) * s);
    // плавность в машине
    if (v) camera.position.lerp(pos, 1 - Math.exp(-14 * dt)); else camera.position.copy(pos);
    target.set(tx, ty + (v ? 0.25 : 0.05), tz);
    camera.lookAt(target);
    const fov = v ? 62 + Math.min(14, v.speed * 0.32) : 62;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = G.lerp(camera.fov, fov, 1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
    G.camPos = camera.position;
  };
})();
