// Население вокруг игрока: прохожие на тротуарах, машины в потоке (с водителями),
// припаркованные у бордюров. Рождаются за спиной/вдали, исчезают далеко от игрока.
'use strict';
(() => {
  const C = G.City;
  const S = G.spawner = { peds: 36, traffic: 20, parkR: 105 };
  const R = G.R;
  let pedT = 0, carT = 0, parkT = 0;

  function center() {
    const p = G.player;
    return p ? (p.inCar ? { x: p.inCar.x, z: p.inCar.z } : { x: p.x, z: p.z }) : { x: 0, z: 0 };
  }
  // точка не на виду: за камерой или далеко
  function hidden(x, z, minD) {
    const c = G.camPos; if (!c) return true;
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
    if (d > 85) return true;
    const yaw = G.cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    return (dx * fx + dz * fz) / (d || 1) < 0.35 && d > minD;
  }

  function spawnPed(initial) {
    const c = center();
    for (let tries = 0; tries < 12; tries++) {
      const n = C.walk[Math.floor(R() * C.walk.length)];
      const d = Math.hypot(n.x - c.x, n.z - c.z);
      if (d > 95 || d < (initial ? 6 : 35)) continue;
      if (!initial && !hidden(n.x, n.z, 25)) continue;
      const outfit = R.pick(G.OUTFITS_PED());
      const p = new G.Ped(outfit, n.x + R.range(-1, 1), n.z + R.range(-1, 1), R() * 6.28);
      p.ai.from = n; p.ai.to = n;
      return p;
    }
    return null;
  }
  function spawnCar(initial) {
    const c = center();
    for (let tries = 0; tries < 12; tries++) {
      const e = C.edges[Math.floor(R() * C.edges.length)];
      const s = R.range(4, e.len - 4);
      const x = e.x0 + e.dx * s, z = e.z0 + e.dz * s;
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > 170 || d < (initial ? 25 : 70)) continue;
      if (!initial && !hidden(x, z, 50)) continue;
      if (G.vehicles.some(v => G.dist2(v.x, v.z, x, z) < 100)) continue;
      const types = G.carTypes().filter(t => t !== 'police' && t !== 'susita' || R() < 0.15);
      const type = R.pick(types);
      const v = new G.Vehicle(type, x, z, e.heading);
      v.startAI(e, s);
      const sp = v.ai.cruise * 0.7; const [fx, fz] = v.fwd; v.vx = fx * sp; v.vz = fz * sp;
      // водитель
      const drv = new G.Ped(R.pick(G.OUTFITS_PED()), x, z, 0);
      drv.inCar = v; v.driver = drv;
      G.seatDriver(drv, v);
      return v;
    }
    return null;
  }
  // припаркованные: место у бордюра знает, какая машина там стоит
  function parked() {
    const c = center();
    for (const slot of C.parking) {
      if (!slot.filled) continue;
      const d = Math.hypot(slot.x - c.x, slot.z - c.z);
      if (slot.gone && d > S.parkR + 25) slot.gone = false;
      if (d < S.parkR && !slot.car && !slot.gone) {
        if (G.vehicles.some(v => G.dist2(v.x, v.z, slot.x, slot.z) < 16)) continue;
        if (d < 40 && !hidden(slot.x, slot.z, 30) && G.started) continue;
        const rr = G.rng(slot.seed);
        const types = G.carTypes().filter(t => !['police', 'sherut', 'taxi'].includes(t) || rr() < 0.1);
        const v = new G.Vehicle(rr.pick(types), slot.x, slot.z, slot.heading, { parked: true, R: rr });
        v.slot = slot; slot.car = v;
      } else if (slot.car && d > S.parkR + 25) {
        const v = slot.car;
        if (v.driver === G.player) { slot.car = null; slot.gone = true; continue; }
        v.remove(); slot.car = null;
      }
    }
  }

  S.init = () => {
    for (let i = 0; i < S.peds; i++) spawnPed(true);
    for (let i = 0; i < S.traffic; i++) spawnCar(true);
    parked();
  };
  S.update = dt => {
    const c = center();
    pedT -= dt; carT -= dt; parkT -= dt;
    if (pedT <= 0) {
      pedT = 0.25;
      // убрать далёких и давно лежащих
      for (const p of [...G.peds]) {
        if (p.isPlayer || p.inCar) continue;
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (d > 115 || (p.dead && d > 55) || (p.dead && (p.deadT = (p.deadT || 0) + 0.25) > 80)) p.remove();
      }
      const alive = G.peds.filter(p => !p.isPlayer && !p.inCar && !p.dead).length;
      if (alive < S.peds) spawnPed(false);
    }
    if (carT <= 0) {
      carT = 0.4;
      for (const v of [...G.vehicles]) {
        if (v.driver === G.player) continue;
        const d = Math.hypot(v.x - c.x, v.z - c.z);
        if (v.slot) {
          // машину сдвинули с места — место пусто, машина живёт сама по себе
          if (Math.hypot(v.x - v.slot.x, v.z - v.slot.z) > 3) { v.slot.car = null; v.slot.gone = true; v.slot = null; }
          continue;
        }
        if (v.cop && d < 260) continue;
        if (d > 190 || (v.wreck && d > 90) || (!v.ai && !v.slot && d > 150)) v.remove();
      }
      const moving = G.vehicles.filter(v => v.ai && !v.ai.chase).length;
      if (moving < S.traffic) spawnCar(false);
    }
    if (parkT <= 0) { parkT = 1.0; parked(); }
  };
})();
