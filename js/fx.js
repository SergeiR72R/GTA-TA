// Частицы: дым, огонь, взрывы, пыль, искры. Пул спрайтов с аддитивным/обычным смешиванием.
'use strict';
(() => {
  const FX = G.FX = { list: [] };
  let scene, smokeMat, fireMat, flashMat;
  const pool = [];
  function tex(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  FX.init = sc => {
    scene = sc;
    const puff = tex(ctx => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    const fire = tex(ctx => {
      const g = ctx.createRadialGradient(32, 36, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.3, 'rgba(255,180,60,0.9)'); g.addColorStop(0.7, 'rgba(220,60,10,0.4)'); g.addColorStop(1, 'rgba(120,20,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    smokeMat = new THREE.SpriteMaterial({ map: puff, color: 0x777777, transparent: true, depthWrite: false });
    fireMat = new THREE.SpriteMaterial({ map: fire, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    flashMat = fireMat;
  };
  function get(mat) {
    let s = pool.find(p => !p.visible && p.userData.base === mat);
    if (!s) { s = new THREE.Sprite(mat.clone()); s.userData.base = mat; scene.add(s); pool.push(s); }
    s.visible = true;
    return s;
  }
  // kind: smoke / fire / dust / spark / boom
  FX.spawn = (kind, x, y, z, o = {}) => {
    const mat = kind === 'fire' || kind === 'spark' || kind === 'boom' ? fireMat : (o.mat || smokeMat);
    const s = get(mat);
    const p = {
      s, kind, t: 0, life: o.life || (kind === 'smoke' ? 2.5 : kind === 'fire' ? 0.7 : kind === 'dust' ? 1.0 : kind === 'boom' ? 0.9 : 0.35),
      vx: o.vx ?? (Math.random() - 0.5) * 1, vy: o.vy ?? (kind === 'smoke' ? 1.6 : kind === 'fire' ? 2.2 : kind === 'spark' ? 3 : 0.4), vz: o.vz ?? (Math.random() - 0.5) * 1,
      size: o.size || (kind === 'smoke' ? 1.2 : kind === 'fire' ? 1.1 : kind === 'dust' ? 0.8 : kind === 'boom' ? 6 : 0.25),
      grow: o.grow ?? (kind === 'smoke' ? 1.6 : kind === 'boom' ? 1.0 : 0.6), dark: o.dark || 0,
    };
    s.position.set(x, y, z);
    s.scale.setScalar(p.size);
    s.material.opacity = 1;
    if (mat === smokeMat) s.material.color.setScalar(0.62 - p.dark * 0.5);
    FX.list.push(p);
    return p;
  };
  FX.explosion = (x, y, z) => {
    for (let i = 0; i < 14; i++) FX.spawn('boom', x + (Math.random() - 0.5) * 2, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 2, { vy: 2 + Math.random() * 3, vx: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, size: 2.5 + Math.random() * 3, life: 0.6 + Math.random() * 0.5 });
    for (let i = 0; i < 18; i++) FX.spawn('smoke', x + (Math.random() - 0.5) * 3, y + 1 + Math.random() * 2, z + (Math.random() - 0.5) * 3, { vy: 2 + Math.random() * 2, size: 2.5, grow: 2.5, life: 3 + Math.random() * 2, dark: 0.8 });
    for (let i = 0; i < 20; i++) FX.spawn('spark', x, y + 1, z, { vx: (Math.random() - 0.5) * 18, vy: 3 + Math.random() * 10, vz: (Math.random() - 0.5) * 18, life: 0.8 });
  };
  FX.update = dt => {
    for (let i = FX.list.length - 1; i >= 0; i--) {
      const p = FX.list[i];
      p.t += dt;
      if (p.t >= p.life) { p.s.visible = false; FX.list.splice(i, 1); continue; }
      const k = p.t / p.life;
      if (p.kind === 'spark') p.vy -= 18 * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.scale.setScalar(p.size * (1 + p.grow * k));
      p.s.material.opacity = p.kind === 'smoke' ? 0.8 * (1 - k) : 1 - k * k;
    }
  };
})();
