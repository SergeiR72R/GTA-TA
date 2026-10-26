// Полиция (Мишмерет): звёзды розыска, патрульные машины с сиреной гонятся и таранят,
// полицейские выходят и арестовывают («АРЕСТОВАН»). Розыск остывает, если копы не видят.
'use strict';
(() => {
  const C = G.City;
  const PL = G.pl;
  const PO = G.police = { cars: [], cops: [], unseen: 0, bustT: 0 };
  G.STATION = { x: -132, z: 98 };

  G.addWanted = v => {
    const before = Math.floor(PL.wanted);
    PL.wanted = Math.min(6, PL.wanted + v);
    PO.unseen = 0;
    if (Math.floor(PL.wanted) > before) G.hud && G.hud.message('Розыск: ' + '★'.repeat(Math.floor(PL.wanted)), 2);
  };
  // старое правило из player.js больше не нужно — розыск остывает здесь
  G.updateWanted = dt => {
    const p = G.player;
    if (!p) return;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    // видят ли копы
    const seen = PO.cars.some(v => !v.wreck && Math.hypot(v.x - px, v.z - pz) < 70) || PO.cops.some(c => !c.dead && Math.hypot(c.x - px, c.z - pz) < 55);
    PO.unseen = seen ? 0 : PO.unseen + dt;
    if (PL.wanted >= 1 && PO.unseen > 16) { PL.wanted = Math.max(0, Math.floor(PL.wanted) - 1 + 0.001); PO.unseen = 4; if (PL.wanted < 1) { PL.wanted = 0; G.hud.message('Розыск снят', 2); } }
    if (PL.wanted < 1) PL.wanted = Math.max(0, PL.wanted - dt * 0.02);
    // сколько машин в погоне
    PO.cars = PO.cars.filter(v => G.vehicles.includes(v));
    PO.cops = PO.cops.filter(c => G.peds.includes(c));
    const need = PL.wanted >= 1 && !p.dead ? Math.min(4, Math.ceil(PL.wanted - 0.001)) : 0;
    const active = PO.cars.filter(v => v.cop && !v.wreck).length;
    PO.spawnT = (PO.spawnT || 0) - dt;
    if (active < need && PO.spawnT <= 0) { PO.spawnT = 4; spawnCop(px, pz); }
    if (need === 0) {
      for (const v of PO.cars) if (v.cop) { v.cop = null; v.siren = false; }
      for (const c of PO.cops) if (c.ai && c.ai.mode === 'arrest') { c.ai.mode = 'walk'; c.ai.to = null; }
    }
    // сирена ближайшей машины
    let best = 1e9;
    for (const v of PO.cars) if (v.siren && !v.wreck) best = Math.min(best, Math.hypot(v.x - px, v.z - pz));
    G.audio && G.audio.siren(best < 1e8 ? G.clamp(1 - best / 90, 0, 1) : 0);
    // арест
    if (PO.busted) {
      PO.busted -= dt;
      if (PO.busted <= 0) { PO.busted = 0; bustedRespawn(); }
    }
  };

  function spawnCop(px, pz) {
    for (let tries = 0; tries < 60; tries++) {
      const e = C.edges[Math.floor(G.R() * C.edges.length)];
      const s = G.R.range(4, e.len - 4);
      const x = e.x0 + e.dx * s, z = e.z0 + e.dz * s;
      const d = Math.hypot(x - px, z - pz);
      if (d < 55 || d > 120) continue;
      // полоса должна вести к игроку
      if (Math.hypot(e.b.x - px, e.b.z - pz) > Math.hypot(e.a.x - px, e.a.z - pz) - 10) continue;
      if (G.vehicles.some(v => G.dist2(v.x, v.z, x, z) < 64)) continue;
      const v = new G.Vehicle('police', x, z, e.heading);
      v.cop = { stuck: 0, back: 0 };
      v.maxV *= 1.15; v.acc *= 1.2;
      v.siren = true;
      v.asleep = false;
      const drv = new G.Ped(G.R() < 0.75 ? 'cop' : 'copF', x, z, 0);
      drv.inCar = v; v.driver = drv; drv.isCop = true;
      G.seatDriver(drv, v);
      PO.cars.push(v);
      return v;
    }
    return null;
  }

  // езда в погоне: прямо на игрока, таран, разворот, если упёрлись
  G.copDrive = (v, dt) => {
    const p = G.player;
    const C_ = v.cop;
    if (!p || p.dead) return { throttle: 0, steer: 0, brake: 1, hand: 0 };
    const t = p.inCar || p;
    const lead = p.inCar ? 0.6 : 0;
    const tx = t.x + (t.vx || 0) * lead, tz = t.z + (t.vz || 0) * lead;
    const dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
    // далеко — по дорогам, как навигатор
    if (d > 45) {
      // цель — начало полосы, ближайшей к игроку
      const goalEdge = C.nearestEdge(tx, tz)[0];
      const goal = goalEdge.a;
      if (!v.ai || !v.ai.chase) {
        const [e, s] = C.nearestEdge(v.x, v.z, v.heading);
        v.startAI(e, s);
        v.ai.chase = true; v.ai.cruise = 21;
        v.ai.goal = goal; v.ai.goalEdge = goalEdge; v.ai.next = v.pickNext(e);
      }
      if (v.ai.goalEdge !== goalEdge) { v.ai.goal = goal; v.ai.goalEdge = goalEdge; if (!v.ai.turn) { v.ai.next = v.pickNext(v.ai.edge); v.ai.turnPts = null; } }
      return v.aiDrive(dt);
    }
    v.ai = null;
    const want = Math.atan2(-dx, -dz);
    const err = G.wrapAngle(want - v.heading);
    const sp = v.fspeed;
    if (C_.back > 0) { C_.back -= dt; return { throttle: -1, steer: -Math.sign(err), brake: 0, hand: 0 }; }
    if (sp < 1 && d > 8) C_.stuck += dt; else C_.stuck = Math.max(0, C_.stuck - dt);
    if (C_.stuck > 1.6) {
      C_.stuck = 0; C_.back = 1.2;
      // упёрлись недалеко от пешего игрока — дальше бегом
      if (!p.inCar && d < 45 && v.driver && v.driver !== G.player) { dropOfficer(v); return { throttle: 0, steer: 0, brake: 1, hand: 1 }; }
    }
    // близко к пешему игроку или к стоящей машине — выходим
    const slow = !p.inCar || p.inCar.speed < 3;
    if (d < 11 && slow) {
      if (sp < 1 && v.driver && v.driver !== G.player && !v.driver.dead) dropOfficer(v);
      return { throttle: 0, steer: 0, brake: 1, hand: 1 };
    }
    let throttle = 1, brake = 0;
    if (Math.abs(err) > 1.2 && sp > 12) { throttle = 0; brake = 0.6; }
    if (Math.abs(err) > 2.2 && sp < 6) return { throttle: -1, steer: -Math.sign(err), brake: 0, hand: 0 };
    return { throttle, steer: G.clamp(err * 2.4, -1, 1), brake, hand: Math.abs(err) > 0.9 && sp > 14 ? 1 : 0 };
  };
  function dropOfficer(v) {
    const c = v.driver;
    v.driver = null; v.cop = null;
    c.inCar = null;
    v.body.remove(c.root); G.scene.add(c.root);
    const [ex, ez] = v.doorPos();
    c.x = ex; c.z = ez; c.y = C.groundY(ex, ez); c.heading = v.heading;
    c.anim = null; c.setAnim('idle', 0);
    c.ignoreCar = v; c.later(1.5, () => { c.ignoreCar = null; });
    c.ai.mode = 'arrest';
    PO.cops.push(c);
    G.audio && G.audio.play('door', v.x, v.z, 1);
  }

  // полицейский пешком: бежит к игроку и задерживает
  G.copThink = (c, dt) => {
    const p = G.player;
    if (!p || p.dead || PL.wanted < 1) { c.ai.mode = 'walk'; c.ai.to = null; c.want.speed = 0; return; }
    const t = p.inCar || p;
    const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz);
    c.want.x = dx / (d || 1); c.want.z = dz / (d || 1);
    const reach = p.inCar ? p.inCar.W / 2 + 1.2 : 1.3;
    c.want.speed = d > reach ? (d > 6 ? 5.8 : 3.2) : 0;
    if (d <= reach + 0.2) {
      c.heading = G.lerpAngle(c.heading, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt));
      const caught = p.inCar ? p.inCar.speed < 1.5 : Math.hypot(p.vx, p.vz) < 2.2;
      if (caught && !PO.busted) {
        PO.bustT += dt;
        if (c.lock <= 0) c.once('interact', 0.8, 0.1);
        if (PO.bustT > 1.1) busted();
      } else if (!p.inCar && c.lock <= 0 && G.R() < dt * 1.5) {
        // игрок вырывается — дубинкой (кулаком)
        c.once('jab', 0.45);
        c.later(0.22, () => { if (!c.dead && Math.hypot(p.x - c.x, p.z - c.z) < 1.6 && !p.inCar) p.hurt(5, c.x, c.z, 2, c); });
      }
    } else PO.bustT = Math.max(0, PO.bustT - dt);
  };

  function busted() {
    const p = G.player;
    PO.busted = 3.5; PO.bustT = 0;
    G.hud.big('АРЕСТОВАН', 3.5);
    p.want.speed = 0;
    p.frozen = true;
    if (p.inCar) { const v = p.inCar; v.driver = null; v.body.remove(p.root); G.scene.add(p.root); p.inCar = null; const [ex, ez] = v.doorPos(); p.x = ex; p.z = ez; G.audio && G.audio.exitCar(); }
    p.anim = null; p.setAnim('idle', 0);
  }
  function bustedRespawn() {
    const p = G.player;
    p.frozen = false;
    p.x = G.STATION.x; p.z = G.STATION.z; p.y = C.groundY(p.x, p.z); p.heading = 0;
    p.vx = p.vz = 0;
    PL.money = Math.max(0, PL.money - 100);
    PL.wanted = 0; PO.unseen = 99;
    for (const v of PO.cars) { v.cop = null; v.siren = false; }
    for (const c of PO.cops) { c.ai.mode = 'walk'; c.ai.to = null; }
    G.hud.message('Участок полиции на Дизенгоф. Штраф: ₪100', 4);
  }
})();
