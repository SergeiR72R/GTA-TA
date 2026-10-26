// Главный цикл: запуск, пауза, обновление мира, отрисовка.
'use strict';
(() => {
  const I = G.input;
  const Q = [
    { name: 'Низкое', ratio: 1, shadows: false, shadowSize: 1024, peds: 22, traffic: 12, park: 80 },
    { name: 'Среднее', ratio: 1.25, shadows: true, shadowSize: 1024, peds: 30, traffic: 16, park: 95 },
    { name: 'Высокое', ratio: 2, shadows: true, shadowSize: 2048, peds: 38, traffic: 22, park: 110 },
  ];
  let qi = 2;
  try { const s = localStorage.getItem('gta_ta_quality'); if (s !== null) qi = +s; } catch (e) {}
  G.quality = Q[qi];
  G.time = 0; G.timeScale = 1; G.fps = 60;
  G.paused = 'title';

  function applyQuality() {
    const q = G.quality = Q[qi];
    G.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.ratio));
    G.renderer.shadowMap.enabled = q.shadows;
    G.world.sun.castShadow = q.shadows;
    G.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    Object.assign(G.spawner, { peds: q.peds, traffic: q.traffic, parkR: q.park });
    try { localStorage.setItem('gta_ta_quality', qi); } catch (e) {}
    G.hud.message('Графика: ' + q.name, 2);
  }

  function start() {
    G.world.init();
    G.FX.init(G.scene);
    G.CityView.build(G.scene);
    G.makePlayer();
    G.cam.yaw = G.player.heading + Math.PI;
    G.hud.init(document.getElementById('hud'));
    Object.assign(G.spawner, { peds: G.quality.peds, traffic: G.quality.traffic, parkR: G.quality.park });
    G.spawner.init();
    G.world.update(0, { x: G.player.x, z: G.player.z });
    G.updateCamera(G.camera, 0.016);
    G.renderer.render(G.scene, G.camera);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('title').style.display = 'flex';
    if (!TEST) requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- меню
  function play() {
    G.paused = false; G.started = true;
    document.getElementById('title').style.display = 'none';
    document.getElementById('pause').style.display = 'none';
    G.audio.unlock();
    const c = G.renderer.domElement;
    try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
    if (!G.zoneShown) { G.zoneShown = true; lastZone = null; }
  }
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && !G.paused && !G.noPause) {
      G.paused = 'pause';
      document.getElementById('pause').style.display = 'flex';
    }
  });
  G.play = play;

  // ---------------------------------------------------------------- цикл
  let last = performance.now(), lastZone = null, fpsAcc = 0, fpsN = 0;
  const TEST = /[?&]test/.test(location.search);
  function loop(now) {
    if (!TEST) requestAnimationFrame(loop);
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { G.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (G.paused) { G.hud.draw(0); I.endFrame(); return; }
    tick(dt, true);
  }
  // для автотестов: n шагов логики без отрисовки, затем один кадр
  G.step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt, i === n - 1); };
  function tick(dt, render) {
    G.time += dt;
    // клавиши
    if (I.hit('KeyO')) { qi = (qi + 1) % Q.length; applyQuality(); }
    if (I.hit('F3') || I.hit('Backquote')) G.showFps = !G.showFps;
    if (I.hit('KeyM')) G.audio.toggleMute();
    if (I.hit('KeyT')) { G.timeScale = G.timeScale === 1 ? 20 : 1; G.hud.message(G.timeScale > 1 ? 'Время ускорено ×20' : 'Время обычное', 2); }
    G.updatePlayer(dt);
    for (const v of [...G.vehicles]) v.update(dt, G.time);
    G.collideVehicles();
    G.CarRender.flush();
    for (const p of [...G.peds]) p.update(dt);
    G.updatePickups(dt);
    G.updateWanted(dt);
    G.spawner.update(dt);
    G.FX.update(dt);
    G.updateCamera(G.camera, dt);
    const p = G.player;
    const cx = p.inCar ? p.inCar.x : p.x, cz = p.inCar ? p.inCar.z : p.z;
    G.world.update(dt, { x: Math.round(cx / 4) * 4, z: Math.round(cz / 4) * 4 });
    G.CityView.update(dt, G.time, G.night);
    G.audio.update(dt);
    const zone = G.City.zoneName(cx, cz);
    if (zone !== lastZone) { lastZone = zone; G.hud.zone(zone); }
    if (render) { G.renderer.render(G.scene, G.camera); G.hud.draw(dt); }
    I.endFrame();
  }

  addEventListener('load', () => {
    document.getElementById('btnPlay').addEventListener('click', play);
    document.getElementById('btnResume').addEventListener('click', play);
    document.getElementById('game').addEventListener('click', () => { if (!G.paused && !I.locked) { try { G.renderer.domElement.requestPointerLock(); } catch (e) {} } });
    setTimeout(start, 30);
  });
})();
