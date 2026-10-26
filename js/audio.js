// Звук: эффекты (Kenney, CC0 — из «ХАМСИНа»), мотор, сигнал, радио «Хамсин FM» в машине,
// фон: прибой у моря, сверчки ночью. Работает и при открытии с диска (HTMLAudio + data-URL).
'use strict';
(() => {
  const A = G.audio = { vol: 0.8, muted: false };
  const S = 'assets/sounds/';
  const FILES = {
    crash: ['carcrash0', 'carcrash1', 'carcrash2', 'carcrash3', 'carcrash4'],
    punch: ['impactPunch_heavy_000', 'impactPunch_heavy_001', 'impactPunch_medium_000'],
    bodyhit: ['impactSoft_heavy_000', 'impactSoft_medium_000'],
    door: ['doorClose_1', 'doorClose_2'], coins: ['handleCoins', 'handleCoins2'],
    metal: ['impactMetal_heavy_000', 'impactMetal_heavy_001', 'impactMetal_heavy_002'],
    glass: ['impactGlass_heavy_000', 'impactGlass_medium_000'],
    step: ['footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002', 'footstep_concrete_003'],
    click: ['click3'],
  };
  const pool = {};
  let ctx = null, engine = null, engineGain = null, horn = null, master = null;
  A.unlock = () => {
    if (ctx) { ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = A.vol; master.connect(ctx.destination);
    // мотор: петля из data-URL
    if (window.ENGINE_LOOP) {
      fetch(window.ENGINE_LOOP).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { A.engineBuf = buf; }).catch(() => {});
    }
    amb('waves', S + 'amb_waves.ogg'); amb('crickets', S + 'amb_crickets.ogg');
  };
  const ambs = {};
  function amb(name, src) {
    const a = new Audio(src); a.loop = true; a.volume = 0; a.play().catch(() => {});
    ambs[name] = a;
  }
  function vol(x, z, base) {
    const c = G.camPos;
    if (!c || x === undefined) return base;
    const d = Math.hypot(x - c.x, z - c.z);
    return base * G.clamp(1 - d / 70, 0, 1);
  }
  A.play = (name, x, z, base = 1) => {
    if (A.muted) return;
    const list = FILES[name];
    if (!list) { if (name === 'explosion') return A.boom(x, z); return; }
    const v = vol(x, z, base) * A.vol;
    if (v < 0.02) return;
    const f = list[Math.floor(Math.random() * list.length)];
    const arr = pool[f] || (pool[f] = []);
    let a = arr.find(x => x.paused || x.ended);
    if (!a) { if (arr.length > 4) a = arr[0]; else { a = new Audio(S + f + '.ogg'); arr.push(a); } }
    a.volume = G.clamp(v, 0, 1);
    a.currentTime = 0;
    a.playbackRate = 0.9 + Math.random() * 0.2;
    a.play().catch(() => {});
  };
  let lastCrash = 0;
  A.crash = (x, z, imp) => {
    const t = performance.now();
    if (t - lastCrash < 120) return;
    lastCrash = t;
    A.play(imp > 10 ? 'crash' : 'metal', x, z, G.clamp(imp / 12, 0.3, 1));
    if (imp > 12) A.play('glass', x, z, 0.6);
  };
  // взрыв: шумовой удар с низким фильтром
  A.boom = (x, z) => {
    if (!ctx) return;
    const v = vol(x, z, 1.2);
    const len = 1.6, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = v;
    src.connect(lp); lp.connect(g); g.connect(master); src.start();
    A.play('crash', x, z, 1);
  };
  // клаксон: два тона (израильское «би-биип»)
  function hornNode(gainV) {
    const g = ctx.createGain(); g.gain.value = 0;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o2.type = 'square'; o1.frequency.value = 415; o2.frequency.value = 495;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    o1.start(); o2.start();
    return { g, o1, o2, v: gainV };
  }
  A.horn = (x, z) => {
    if (!ctx || A.muted) return;
    const v = vol(x, z, 0.16);
    if (v < 0.01) return;
    const h = hornNode(v), t = ctx.currentTime;
    const dur = 0.25 + Math.random() * 0.5;
    h.g.gain.setValueAtTime(0, t); h.g.gain.linearRampToValueAtTime(v, t + 0.02);
    h.g.gain.setValueAtTime(v, t + dur); h.g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    if (Math.random() < 0.5) { h.g.gain.setValueAtTime(0, t + dur + 0.12); h.g.gain.linearRampToValueAtTime(v, t + dur + 0.14); h.g.gain.setValueAtTime(v, t + dur * 2 + 0.1); h.g.gain.linearRampToValueAtTime(0, t + dur * 2 + 0.15); }
    h.o1.stop(t + dur * 2 + 0.3); h.o2.stop(t + dur * 2 + 0.3);
  };
  A.hornStart = () => { if (!ctx) return; horn = hornNode(0.2); horn.g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02); };
  A.hornStop = () => { if (!horn) return; const t = ctx.currentTime; horn.g.gain.linearRampToValueAtTime(0, t + 0.05); horn.o1.stop(t + 0.1); horn.o2.stop(t + 0.1); horn = null; };
  A.scream = () => {};
  // сирена: одна петля, громкость — по ближайшей полицейской машине
  let sirenSrc = null, sirenGain = null;
  A.siren = v => {
    if (!ctx || !window.SIREN_WAIL) return;
    if (!A.sirenBuf && !A.sirenLoading) {
      A.sirenLoading = true;
      fetch(window.SIREN_WAIL).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { A.sirenBuf = buf; }).catch(() => {});
    }
    if (!A.sirenBuf) return;
    if (v > 0.01 && !sirenSrc) {
      sirenSrc = ctx.createBufferSource(); sirenSrc.buffer = A.sirenBuf; sirenSrc.loop = true;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenSrc.connect(sirenGain); sirenGain.connect(master); sirenSrc.start();
    }
    if (sirenGain) sirenGain.gain.value = A.muted ? 0 : v * 0.35;
    if (v <= 0.01 && sirenSrc) { sirenSrc.stop(); sirenSrc = null; sirenGain = null; }
  };

  // ---------------------------------------------------------------- мотор
  A.enterCar = v => {
    if (!ctx || !A.engineBuf) { A.radioOn(); return; }
    if (engine) engine.stop();
    engine = ctx.createBufferSource(); engine.buffer = A.engineBuf; engine.loop = true;
    engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
    engine.connect(engineGain); engineGain.connect(master); engine.start();
    A.radioOn();
  };
  A.exitCar = () => {
    if (engine) { try { engine.stop(); } catch (e) {} engine = null; }
    A.radioOff();
  };
  A.update = dt => {
    const p = G.player;
    const v = p && p.inCar;
    if (engine && v) {
      const s = Math.abs(v.fspeed) / v.maxV;
      const gear = (s * 4.2) % 1;
      engine.playbackRate.value = 0.6 + s * 0.9 + gear * 0.35;
      engineGain.gain.value = (A.muted ? 0 : 0.18 + s * 0.12) * (v.wreck ? 0 : 1);
    }
    // фон: прибой у пляжа, сверчки ночью
    if (ambs.waves && G.camPos) {
      const d = G.camPos.x - G.City.seaX;
      ambs.waves.volume = A.muted ? 0 : G.clamp(1 - d / 110, 0, 1) * 0.55;
      ambs.crickets.volume = A.muted ? 0 : (G.night || 0) * 0.25;
    }
  };

  // ---------------------------------------------------------------- радио
  const SONGS = {
    hamsin: [['fm_hamsin', '«Хамсин»'], ['fm_hamsin_halaila', '«Хамсин этой ночью»'], ['fm_hummus', '«Хумус»'], ['fm_rothschild', '«Ротшильд»'], ['fm_yihye_tov_a', '«Будет хорошо»']],
    florentin: [['fm_ayalon_a', '«Аялон»'], ['fm_ayalon_b', '«Аялон» (версия 2)'], ['fm_arnona', '«Арнона»'], ['fm_yihye_tov_b', '«Будет хорошо» (рок)'], ['fm_odessa', '«Одесса»']],
    yafo: [['fm_shakshuka_a', '«Шакшука»'], ['fm_shakshuka_b', '«Шакшука» (версия 2)'], ['fm_gondar', '«Гондэр»'], ['fm_yafo', '«Яффо»']],
  };
  A.STATIONS = [
    { id: 'hamsin', name: 'Хамсин FM — мизрахи и поп' },
    { id: 'florentin', name: 'Радио Флорентин — рок и рэп' },
    { id: 'yafo', name: 'Яффо Грув — регги и восток' },
    { id: null, name: 'Радио выключено' },
  ];
  A.station = Math.floor(Math.random() * 3);
  let radio = null;
  function playStation() {
    if (radio) { radio.pause(); radio = null; }
    const st = A.STATIONS[A.station];
    if (!st.id || A.muted) return;
    const list = SONGS[st.id];
    const [f, title] = list[Math.floor(Math.random() * list.length)];
    radio = new Audio('assets/radio/' + f + '.mp3');
    radio.volume = 0.5 * A.vol;
    radio.addEventListener('ended', playStation);
    radio.play().then(() => {
      // как будто песня уже шла
      if (radio && radio.duration) radio.currentTime = Math.random() * radio.duration * 0.6;
    }).catch(() => {});
    A.nowPlaying = title;
  }
  A.radioOn = () => { playStation(); const st = A.STATIONS[A.station]; G.hud && G.hud.radio(st.name + (st.id && A.nowPlaying ? '  ♪ ' + A.nowPlaying : '')); };
  A.radioOff = () => { if (radio) { radio.pause(); radio = null; } };
  A.nextStation = () => { A.station = (A.station + 1) % A.STATIONS.length; A.radioOn(); };
  A.toggleMute = () => {
    A.muted = !A.muted;
    if (A.muted) A.radioOff(); else if (G.player && G.player.inCar) A.radioOn();
  };
})();
