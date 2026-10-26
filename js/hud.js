// Интерфейс в духе GTA 3: часы, оружие, здоровье, деньги, розыск, радар, названия районов,
// машин и радиостанций, «ПОТРАЧЕНО».
'use strict';
(() => {
  const C = G.City;
  const H = G.hud = {};
  let cv, ctx, W = 0, Hh = 0, dpr = 1;
  const msgs = { zone: null, msg: null, radio: null, big: null };
  let radarImg = null;

  H.init = canvas => {
    cv = canvas; ctx = cv.getContext('2d');
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = innerWidth; Hh = innerHeight;
      cv.width = W * dpr; cv.height = Hh * dpr;
      cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    };
    addEventListener('resize', resize); resize();
    buildRadar();
  };
  const set = (k, text, t) => { msgs[k] = { text, t, life: t }; };
  H.zone = name => set('zone', name, 3.2);
  H.message = (text, t = 3) => set('msg', text, t);
  H.radio = text => set('radio', text, 3.5);
  H.big = (text, t = 3) => set('big', text, t);

  // карта для радара: дороги и кварталы, заранее нарисованные (1 px = 1 м)
  function buildRadar() {
    const B = C.bounds;
    const w = Math.ceil(B.x1 - B.x0 + 80), h = Math.ceil(B.z1 - B.z0 + 80);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const ox = -B.x0 + 40, oz = -B.z0 + 40;
    g.fillStyle = '#5d6b78'; g.fillRect(0, 0, w, h);                       // асфальт
    g.fillStyle = '#3b8fb5'; g.fillRect(0, 0, C.seaX + ox, h);              // море
    g.fillStyle = '#d8c48c'; g.fillRect(C.beach.x0 + ox, 0, C.beach.x1 - C.beach.x0, h);
    g.fillStyle = '#9aa29b';
    for (const b of C.blocks) g.fillRect(b.ox0 + ox, b.oz0 + oz, b.ox1 - b.ox0, b.oz1 - b.oz0);
    g.fillStyle = '#a7b38e';
    for (const m of C.medians) g.fillRect(m.x0 + ox, m.z0 + oz, m.x1 - m.x0, m.z1 - m.z0);
    g.fillStyle = '#6f7a69';
    for (const b of C.blocks) g.fillRect(b.x0 + ox, b.z0 + oz, b.x1 - b.x0, b.z1 - b.z0);
    g.fillStyle = '#4c524c';
    for (const bd of C.buildings) { const c2 = bd.col; g.fillRect(c2.x0 + ox, c2.z0 + oz, c2.x1 - c2.x0, c2.z1 - c2.z0); }
    radarImg = { c, ox, oz };
  }

  function text(s, x, y, size, fill, align = 'right', stroke = '#000', font = "'Arial Black', 'Arial', sans-serif") {
    ctx.font = `900 ${size}px ${font}`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = stroke; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }
  function fist(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 64, s / 64);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(32, 32, 31, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8b896'; ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(14, 18, 36, 30, 8); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(15 + i * 9, 12, 9, 14, 4); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.roundRect(10, 30, 14, 10, 4); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  H.draw = dt => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    const p = G.player;
    if (!p || G.paused === 'title') return;
    const PL = G.pl;
    const s = Math.min(1.25, Math.max(0.7, Math.min(W, Hh) / 760));
    // ---- правый верх: часы, оружие, здоровье, деньги, розыск
    const R0 = W - 24 * s;
    const hh = Math.floor(G.clock / 60) % 24, mm = Math.floor(G.clock % 60);
    text(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, R0, 46 * s, 34 * s, '#e9e3c8');
    fist(R0 - 150 * s, 62 * s, 64 * s);
    const hp = Math.max(0, Math.ceil(p.health));
    const flash = PL.hurtFlash > 0 && (performance.now() / 80 | 0) % 2;
    text('♥' + String(hp).padStart(3, '0'), R0, 94 * s, 28 * s, flash ? '#ff3030' : '#f067a6');
    if (PL.armor > 0) text('◆' + String(Math.ceil(PL.armor)).padStart(3, '0'), R0 - 120 * s, 94 * s, 28 * s, '#7fb1e0');
    text('₪' + String(Math.floor(PL.money)).padStart(8, '0'), R0, 128 * s, 30 * s, '#6fd25f');
    // звёзды розыска
    for (let i = 0; i < 6; i++) {
      const on = i < Math.floor(PL.wanted);
      const x = R0 - 14 * s - i * 26 * s, y = 152 * s;
      ctx.save(); ctx.translate(x, y); ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 * s : 11 * s, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.fillStyle = on ? '#e9e3c8' : 'rgba(80,80,80,0.55)'; ctx.fill(); ctx.restore();
    }
    // ---- радар
    const rr = 92 * s, cx = 34 * s + rr, cy = Hh - 34 * s - rr;
    const yaw = G.cam.yaw;
    const scale = 0.62 * s;          // пикселей на метр
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.closePath();
    ctx.fillStyle = '#2b3138'; ctx.fill(); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(yaw); ctx.scale(scale, scale);
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(radarImg.c, -(px + radarImg.ox), -(pz + radarImg.oz));
    ctx.globalAlpha = 1;
    // деньги на земле
    ctx.fillStyle = '#6fd25f';
    for (const k of G.pickups) { ctx.beginPath(); ctx.arc(k.x - px, k.z - pz, 3 / scale * s, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 4 * s; ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();
    ctx.lineWidth = 2 * s; ctx.strokeStyle = '#d8d2b8'; ctx.beginPath(); ctx.arc(cx, cy, rr - 3 * s, 0, 7); ctx.stroke();
    // стрелка игрока: направление относительно камеры
    const ph = (p.inCar ? p.inCar.heading : p.heading + Math.PI) - yaw;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-ph);
    ctx.fillStyle = '#f2f2f2'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -9 * s); ctx.lineTo(7 * s, 8 * s); ctx.lineTo(0, 4 * s); ctx.lineTo(-7 * s, 8 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // север
    const na = -yaw - Math.PI / 2;
    const nx = cx + Math.cos(na + Math.PI) * 0, ny = 0;
    const north = [cx + Math.sin(yaw) * (rr - 2) * -1 * 0 + Math.cos(-Math.PI / 2 + yaw) * (rr - 2), cy + Math.sin(-Math.PI / 2 + yaw) * (rr - 2)];
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(north[0], north[1], 10 * s, 0, 7); ctx.fill();
    text('N', north[0], north[1] + 6 * s, 14 * s, '#f2f2f2', 'center', '#111');
    void nx; void ny; void na;
    // ---- сообщения
    for (const k in msgs) { const m = msgs[k]; if (m) { m.t -= dt; if (m.t <= 0) msgs[k] = null; } }
    const alpha = m => G.clamp(Math.min(m.t, m.life - m.t) * 3, 0, 1);
    if (msgs.zone) { ctx.globalAlpha = alpha(msgs.zone); text(msgs.zone.text, W - 30 * s, Hh - 42 * s, 38 * s, '#7fb7e8', 'right', '#0d1a2a', "'Georgia', 'Times New Roman', serif"); ctx.globalAlpha = 1; }
    if (msgs.msg) { ctx.globalAlpha = alpha(msgs.msg); text(msgs.msg.text, W - 30 * s, Hh - 92 * s, 28 * s, '#5fc87a', 'right', '#062010'); ctx.globalAlpha = 1; }
    if (msgs.radio) { ctx.globalAlpha = alpha(msgs.radio); text(msgs.radio.text, W / 2, 50 * s, 24 * s, '#e0a43a', 'center', '#2a1500'); ctx.globalAlpha = 1; }
    if (msgs.big) { ctx.globalAlpha = alpha(msgs.big); text(msgs.big.text, W / 2, Hh / 2, 72 * s, '#b31d1d', 'center', '#000', "'Georgia', 'Times New Roman', serif"); ctx.globalAlpha = 1; }
    // красная вспышка при ударе
    if (PL.hurtFlash > 0) { ctx.fillStyle = `rgba(200,0,0,${PL.hurtFlash * 0.5})`; ctx.fillRect(0, 0, W, Hh); }
    if (p.dead) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, PL.deadT * 0.2)})`; ctx.fillRect(0, 0, W, Hh); }
    // счётчик кадров
    if (G.showFps) text(`${G.fps | 0} к/с · ${G.renderer.info.render.calls} вызовов · ${(G.renderer.info.render.triangles / 1000) | 0}k треуг.`, 12, 24, 14, '#fff', 'left');
  };
})();
