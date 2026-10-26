// Общие помощники: математика, случайные числа, декодирование base64, ввод.
'use strict';
const G = window.G = {};

G.clamp = (x, a, b) => x < a ? a : x > b ? b : x;
G.lerp = (a, b, t) => a + (b - a) * t;
G.smooth = (a, b, x) => { const t = G.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
G.wrapAngle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
G.lerpAngle = (a, b, t) => a + G.wrapAngle(b - a) * t;
G.dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

// детерминированный генератор (mulberry32)
G.rng = seed => {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  return f;
};
G.R = G.rng(Date.now() & 0xffffff);

G.b64 = (s, Type) => {
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Type(buf);
};

G.hexToRgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];

// ---------------------------------------------------------------- ввод
G.input = {
  keys: {}, pressed: {}, mdx: 0, mdy: 0, mouse: {}, mclick: {}, locked: false, wheel: 0, lastMouse: 0,
  down(code) { return !!this.keys[code]; },
  hit(code) { return !!this.pressed[code]; },
  endFrame() { this.pressed = {}; this.mclick = {}; this.mdx = this.mdy = 0; this.wheel = 0; },
};
(() => {
  const I = G.input;
  addEventListener('keydown', e => {
    if (!I.keys[e.code]) I.pressed[e.code] = true;
    I.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { I.keys[e.code] = false; });
  addEventListener('blur', () => { I.keys = {}; I.mouse = {}; });
  addEventListener('mousemove', e => {
    if (!I.locked) return;
    I.mdx += e.movementX; I.mdy += e.movementY;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) I.lastMouse = performance.now();
  });
  addEventListener('mousedown', e => { I.mouse[e.button] = true; I.mclick[e.button] = true; });
  addEventListener('mouseup', e => { I.mouse[e.button] = false; });
  addEventListener('wheel', e => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { I.locked = !!document.pointerLockElement; });
})();
