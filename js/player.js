// Игрок: Лёва Гольдман. Ходьба и бег относительно камеры, прыжок, удары,
// посадка в машину (водителя — за шкирку), вождение, деньги, смерть («ПОТРАЧЕНО»).
'use strict';
(() => {
  const I = G.input;
  const C = G.City;
  const PL = G.pl = { money: 500, armor: 0, wanted: 0, deadT: 0, hurtFlash: 0, punchSide: 0 };
  G.SPAWN = { x: 4.5, z: -18, heading: Math.PI };   // бульвар Ротшильд у киоска
  G.HOSPITAL = { x: 105, z: -60 };

  G.makePlayer = () => {
    const p = new G.Ped('leva', G.SPAWN.x, G.SPAWN.z, G.SPAWN.heading, { player: true, scale: 1 });
    p.root.traverse(o => { o.frustumCulled = false; });
    G.player = p;
    return p;
  };

  const keyDown = (...codes) => codes.some(c => I.down(c));

  G.updatePlayer = dt => {
    const p = G.player;
    if (!p) return;
    PL.hurtFlash = Math.max(0, PL.hurtFlash - dt);
    if (p.dead) {
      PL.deadT += dt;
      if (PL.deadT > 4.5) respawn();
      return;
    }
    if (p.frozen) { p.want.speed = 0; return; }
    if (p.inCar) { carControls(p, dt); return; }
    // ---- пешком
    const yaw = G.cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let ix = 0, iz = 0;
    if (keyDown('KeyW', 'ArrowUp')) { ix += fx; iz += fz; }
    if (keyDown('KeyS', 'ArrowDown')) { ix -= fx; iz -= fz; }
    if (keyDown('KeyD', 'ArrowRight')) { ix += rx; iz += rz; }
    if (keyDown('KeyA', 'ArrowLeft')) { ix -= rx; iz -= rz; }
    const L = Math.hypot(ix, iz);
    const sprint = keyDown('ShiftLeft', 'ShiftRight');
    const walk = keyDown('AltLeft', 'KeyC');
    if (L > 0) {
      p.want.x = ix / L; p.want.z = iz / L;
      p.want.speed = walk ? 1.5 : sprint ? 6.8 : 4.0;
      if (p.lock <= 0 || p.air) p.heading = G.lerpAngle(p.heading, Math.atan2(ix, iz), 1 - Math.exp(-12 * dt));
    } else p.want.speed = 0;
    // прыжок
    if (I.hit('Space') && !p.air && p.lock <= 0 && p.down <= 0) {
      p.vy = 5.4; p.air = true; p.y += 0.02;
      p.once('jumpStart', 0.25, 0.05, 1.4);
    }
    // удар
    if ((I.mclick[0] || I.hit('ControlLeft') || I.hit('KeyQ')) && p.lock <= 0 && !p.air && p.down <= 0) {
      PL.punchSide ^= 1;
      p.once(PL.punchSide ? 'jab' : 'cross', 0.42, 0.06, 1.15);
      // повернуться к ближайшему человеку перед собой
      const t = nearestPed(p, 2.2, 0.2);
      if (t) p.heading = Math.atan2(t.x - p.x, t.z - p.z);
      p.later(0.19, () => {
        if (p.dead || p.inCar) return;
        const hx = p.x + Math.sin(p.heading) * 0.8, hz = p.z + Math.cos(p.heading) * 0.8;
        for (const o of G.peds) {
          if (o === p || o.dead || o.inCar) continue;
          if (Math.hypot(o.x - hx, o.z - hz) < 1.0) { o.hurt(G.R.range(12, 18), p.x, p.z, 3, p); G.panic(o.x, o.z, 9, p); G.addWanted(0.06); break; }
        }
      });
    }
    // в машину
    if (I.hit('KeyF') || I.hit('Enter')) tryEnter(p);
  };

  function nearestPed(p, r, minDot) {
    let best = null, bd = r;
    for (const o of G.peds) {
      if (o === p || o.dead || o.inCar) continue;
      const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
      if (d < bd && (dx * Math.sin(p.heading) + dz * Math.cos(p.heading)) / (d || 1) > minDot) { bd = d; best = o; }
    }
    return best;
  }

  function tryEnter(p) {
    let best = null, bd = 4.2;
    for (const v of G.vehicles) {
      if (v.wreck) continue;
      const [dx, dz] = v.doorPos();
      const d = Math.min(Math.hypot(dx - p.x, dz - p.z), Math.hypot(v.x - p.x, v.z - p.z) - 1.2);
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return;
    const v = best;
    // водителя — наружу
    if (v.driver && v.driver !== p) {
      const d = v.driver;
      d.inCar = null;
      v.body.remove(d.root);
      G.scene.add(d.root);
      const [ex, ez] = v.doorPos();
      d.x = ex; d.z = ez; d.y = C.groundY(ex, ez); d.heading = v.heading;
      d.ignoreCar = v; d.later(1.5, () => { d.ignoreCar = null; });
      d.knock();
      if (d.ai) { if (d.ai.brave) { d.ai.mode = 'fight'; d.ai.fleeT = 10; } else d.flee(v.x, v.z, 9); }
      G.audio && G.audio.play('door', v.x, v.z, 1);
      G.addWanted(v.d.police ? 1.5 : 0.2);
    }
    v.ai = null; v.asleep = false;
    v.driver = p;
    p.inCar = v;
    p.vx = p.vz = 0;
    seat(p, v);
    G.audio && G.audio.play('door', v.x, v.z, 0.8);
    G.audio && G.audio.enterCar(v);
    G.hud && G.hud.message(v.title, 3);
  }
  function seat(p, v) {
    G.scene.remove(p.root);
    v.body.add(p.root);
    const [sx, sy, sz] = v.d.seat;
    p.root.position.set(sx, sy - 0.48, sz + 0.25);
    p.root.rotation.set(0, Math.PI, 0);
    p.anim = null; p.setAnim('drive', 0);
  }
  G.seatDriver = seat;

  function carControls(p, dt) {
    const v = p.inCar;
    if ((I.hit('KeyF') || I.hit('Enter')) && v.speed < 9) {
      // выход
      v.driver = null;
      v.body.remove(p.root);
      G.scene.add(p.root);
      const [ex, ez] = v.doorPos();
      p.x = ex; p.z = ez; p.y = C.groundY(ex, ez); p.heading = v.heading + Math.PI / 2;
      p.vx = v.vx * 0.5; p.vz = v.vz * 0.5;
      p.inCar = null; p.anim = null; p.setAnim('idle', 0);
      p.root.position.set(p.x, p.y, p.z); p.root.rotation.set(0, p.heading, 0);
      p.ignoreCar = v; p.later(1.2, () => { p.ignoreCar = null; });
      G.audio && G.audio.play('door', v.x, v.z, 0.8);
      G.audio && G.audio.exitCar();
      return;
    }
    if (I.hit('KeyH') || I.hit('KeyN')) { /* сигнал — в playerCarInput */ }
    if (I.hit('KeyR')) G.audio && G.audio.nextStation();
  }

  G.playerCarInput = (v, dt) => {
    let throttle = 0, steer = 0;
    if (keyDown('KeyW', 'ArrowUp')) throttle += 1;
    if (keyDown('KeyS', 'ArrowDown')) throttle -= 1;
    if (keyDown('KeyA', 'ArrowLeft')) steer += 1;
    if (keyDown('KeyD', 'ArrowRight')) steer -= 1;
    const hand = keyDown('Space') ? 1 : 0;
    if (keyDown('KeyH')) { if (!v.hornOn) G.audio && G.audio.hornStart(); v.hornOn = true; }
    else if (v.hornOn) { v.hornOn = false; G.audio && G.audio.hornStop(); }
    if (v.d.police && I.hit('KeyG')) v.siren = !v.siren;
    return { throttle, steer, brake: 0, hand };
  };

  G.playerHurt = dmg => {
    const p = G.player;
    if (!p || p.dead) return;
    if (dmg) {
      if (PL.armor > 0) { const a = Math.min(PL.armor, dmg); PL.armor -= a; dmg -= a; }
      p.health -= dmg;
      if (p.health <= 0) p.kill();
    }
    PL.hurtFlash = 0.35;
  };
  G.playerDied = () => {
    PL.deadT = 0;
    const p = G.player;
    if (p.inCar) {
      const v = p.inCar; v.driver = null; v.body.remove(p.root); G.scene.add(p.root); p.inCar = null;
      p.x = v.x + 2; p.z = v.z;
    }
    G.hud && G.hud.big('ПОТРАЧЕНО', 4);
    G.audio && G.audio.exitCar();
  };
  function respawn() {
    const p = G.player;
    p.remove();
    const n = G.makePlayer();
    n.x = G.HOSPITAL.x; n.z = G.HOSPITAL.z; n.heading = Math.PI;
    PL.money = Math.max(0, PL.money - 100);
    PL.wanted = 0;
    G.hud && G.hud.message('Больница «Ихилов». Лечение: ₪100', 4);
  }

  // ---------------------------------------------------------------- деньги
  const pickups = G.pickups = [];
  let billGeo, billMat;
  G.dropMoney = (x, z, value) => {
    if (!billGeo) {
      billGeo = new THREE.BoxGeometry(0.42, 0.05, 0.22);
      billMat = new THREE.MeshLambertMaterial({ color: 0x5fbf5a, emissive: 0x1d5a1d });
    }
    const m = new THREE.Mesh(billGeo, billMat);
    m.position.set(x, C.groundY(x, z) + 0.35, z);
    G.scene.add(m);
    pickups.push({ m, x, z, value, t: 0 });
  };
  G.updatePickups = dt => {
    const p = G.player;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const k = pickups[i];
      k.t += dt;
      k.m.rotation.y += dt * 3;
      k.m.position.y = C.groundY(k.x, k.z) + 0.35 + Math.sin(k.t * 4) * 0.08;
      if (p && !p.dead && !p.inCar && Math.hypot(p.x - k.x, p.z - k.z) < 1.1) {
        PL.money += k.value; G.audio && G.audio.play('coins', p.x, p.z, 1);
        G.scene.remove(k.m); pickups.splice(i, 1);
      } else if (k.t > 90) { G.scene.remove(k.m); pickups.splice(i, 1); }
    }
  };
})();
