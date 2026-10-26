// Текстуры: картинки из assets/textures/bundle.js (сгенерированные по заданию
// CLAUDE_CHROME_TEXTURES.md), а пока картинки нет — похожая текстура, нарисованная здесь.
'use strict';
(() => {
  const cache = {};
  const imgs = {};
  const B = () => window.TEX_BUNDLE || {};
  let maxAniso = 4;

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
  const R = G.rng(12345);

  function noise(ctx, w, h, amount, alpha = 0.08, size = 1) {
    for (let i = 0; i < amount; i++) {
      const v = R() < 0.5 ? 0 : 255;
      ctx.fillStyle = `rgba(${v},${v},${v},${alpha * R()})`;
      ctx.fillRect(R() * w, R() * h, size, size);
    }
  }
  function stains(ctx, w, h, n, col, a = 0.06) {
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = R() * h, r = (0.05 + R() * 0.25) * w;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      // бесшовно: рисуем со сдвигами
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { ctx.save(); ctx.translate(dx, dy); ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
    }
  }
  function cracks(ctx, w, h, n, col = 'rgba(60,50,40,0.25)') {
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      let x = R() * w, y = R() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 20; y += R() * 14; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  const plaster = (base, rough = 1) => ctx => {
    const w = ctx.canvas.width;
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, w);
    stains(ctx, w, w, 10, '255,255,255', 0.08);
    stains(ctx, w, w, 8, '90,80,60', 0.06 * rough);
    noise(ctx, w, w, 9000 * rough, 0.12, 1);
    noise(ctx, w, w, 1200 * rough, 0.1, 2);
    cracks(ctx, w, w, 2);
    // потёки снизу вверх
    for (let i = 0; i < 5 * rough; i++) {
      const x = R() * w, g = ctx.createLinearGradient(0, 0, 0, w);
      g.addColorStop(0, 'rgba(70,60,50,0.0)'); g.addColorStop(0.5, 'rgba(70,60,50,0.07)'); g.addColorStop(1, 'rgba(70,60,50,0)');
      ctx.fillStyle = g; ctx.fillRect(x, 0, 3 + R() * 8, w);
    }
  };
  const tilesGen = (cols, rows, base, joint, vary = 12, offset = 0) => ctx => {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.fillStyle = joint; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
      const v = (R() - 0.5) * vary;
      const [br, bg, bb] = base;
      ctx.fillStyle = `rgb(${br + v},${bg + v},${bb + v * 0.8})`;
      const x = c * cw + (r % 2) * offset * cw;
      ctx.fillRect(x + 1.5, r * ch + 1.5, cw - 3, ch - 3);
    }
    noise(ctx, w, h, 5000, 0.1);
  };

  // ---------------------------------------------------------------- процедурные заменители
  const GEN = {
    pl_white: plaster('#ecebe6'), pl_cream: plaster('#ece0c2'), pl_pink: plaster('#efc9be'), pl_blue: plaster('#bccfd8'),
    pl_beige: plaster('#d9c9ab', 1.6), pl_grey: plaster('#b4b3ae', 1.6), pl_ochre: plaster('#dfb373'), pl_salmon: plaster('#e5a387'),
    pl_mint: plaster('#c4dcc8'), trim: plaster('#f1ead8', 0.5), concrete: plaster('#a6a49e', 2),
    jstone: tilesGen(4, 8, [226, 206, 166], '#cdbb98', 26, 0.5),
    mosaic: tilesGen(16, 16, [130, 105, 85], '#d8d0c0', 50),
    wall_tiles: tilesGen(6, 12, [238, 238, 234], '#b8b8b2', 8),
    brick: tilesGen(4, 12, [168, 88, 62], '#cfc5b5', 30, 0.5),
    cladding(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#4b4e52'; ctx.fillRect(0, 0, w, w);
      noise(ctx, w, w, 6000, 0.08);
      ctx.fillStyle = '#2c2e31';
      for (let i = 0; i < 4; i++) ctx.fillRect(i * w / 4, 0, 3, w);
      ctx.fillRect(0, w / 2, w, 2);
    },
    metal(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#8d9196'; ctx.fillRect(0, 0, w, w);
      noise(ctx, w, w, 6000, 0.08);
      ctx.fillStyle = 'rgba(40,40,40,0.5)';
      for (let i = 0; i < 2; i++) ctx.fillRect(i * w / 2, 0, 2, w);
      stains(ctx, w, w, 6, '120,70,40', 0.12);
    },
    railing(ctx) { GEN.metal(ctx); },
    trisim(ctx) {
      const w = ctx.canvas.width;
      for (let y = 0; y < w; y += 8) {
        const g = ctx.createLinearGradient(0, y, 0, y + 8);
        g.addColorStop(0, '#efe9dc'); g.addColorStop(0.7, '#d8d0bf'); g.addColorStop(1, '#8f8a7e');
        ctx.fillStyle = g; ctx.fillRect(0, y, w, 8);
      }
      noise(ctx, w, w, 3000, 0.08);
    },
    wood_old(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#4e8a83'; ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(i * w / 8, 0, 2, w); }
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(120,110,95,0.7)'; ctx.fillRect(R() * w, R() * w, 4 + R() * 30, 2 + R() * 6); }
      noise(ctx, w, w, 5000, 0.1);
    },
    glass_dark(ctx) {
      const w = ctx.canvas.width;
      const g = ctx.createLinearGradient(0, 0, w, w);
      g.addColorStop(0, '#2b3a46'); g.addColorStop(0.5, '#4d6474'); g.addColorStop(1, '#22303a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = '#15191c';
      for (let i = 0; i < 4; i++) { ctx.fillRect(i * w / 4, 0, 4, w); ctx.fillRect(0, i * w / 4, w, 4); }
    },
    glass_blue(ctx) {
      const w = ctx.canvas.width;
      const g = ctx.createLinearGradient(0, 0, w, w);
      g.addColorStop(0, '#7fb3c4'); g.addColorStop(1, '#5d93a8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, w, 4); ctx.fillRect(0, 0, 4, w);
    },
    solar_panel(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#1d2f4c'; ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = '#b07a3a';
      for (let i = 0; i < 16; i++) ctx.fillRect(i * w / 16 + 4, 0, 2, w);
      ctx.strokeStyle = '#c9cdd2'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, w, w);
    },
    awning_red: stripesGen('#c8302a', '#f2ede2'), awning_green: stripesGen('#2c6b45', '#efe7d2'), awning_blue: stripesGen('#26407a', '#2c4a8a'),
    roof_flat: plaster('#c9c5bd', 2), roof_tar: plaster('#4b4b4d', 2.5),
    roof_tiles(ctx) {
      const w = ctx.canvas.width;
      for (let y = 0; y < w; y += 16) for (let x = -16; x < w; x += 22) {
        ctx.fillStyle = `rgb(${170 + R() * 30},${78 + R() * 20},${50})`;
        ctx.beginPath(); ctx.ellipse(x + (y / 16 % 2) * 11 + 11, y + 8, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
      }
      noise(ctx, w, w, 4000, 0.1);
    },
    graffiti(ctx) {
      GEN.concrete(ctx);
      const w = ctx.canvas.width;
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = `hsl(${R() * 360},80%,55%)`; ctx.lineWidth = 6 + R() * 10; ctx.lineCap = 'round';
        ctx.beginPath(); let x = R() * w, y = R() * w; ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 120; y += (R() - 0.5) * 80; ctx.quadraticCurveTo(x + 30, y - 30, x, y); }
        ctx.stroke();
      }
    },
    asphalt(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#45464a'; ctx.fillRect(0, 0, w, w);
      noise(ctx, w, w, 30000, 0.18, 1);
      noise(ctx, w, w, 4000, 0.12, 2);
      stains(ctx, w, w, 6, '20,20,20', 0.15);
      cracks(ctx, w, w, 3, 'rgba(20,20,20,0.4)');
    },
    sidewalk: tilesGen(8, 8, [176, 174, 168], '#8d8b85', 18),
    plaza: tilesGen(4, 8, [222, 208, 180], '#b8a888', 16, 0.5),
    curb_bw: curbGen('#2b4ea8'), curb_rw: curbGen('#c0272d'),
    curb(ctx) { plaster('#b9b7b0', 1.5)(ctx); },
    grass(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#6d8a3e'; ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 9000; i++) { ctx.fillStyle = `hsl(${70 + R() * 30},${35 + R() * 25}%,${25 + R() * 25}%)`; ctx.fillRect(R() * w, R() * w, 1, 3); }
      stains(ctx, w, w, 6, '180,160,90', 0.2);
    },
    dirt(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#a89070'; ctx.fillRect(0, 0, w, w);
      noise(ctx, w, w, 12000, 0.15, 2);
      for (let i = 0; i < 1500; i++) { ctx.fillStyle = `hsl(${60 + R() * 30},30%,${30 + R() * 20}%)`; ctx.fillRect(R() * w, R() * w, 1, 3); }
    },
    sand(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#e3cc98'; ctx.fillRect(0, 0, w, w);
      noise(ctx, w, w, 20000, 0.12, 1);
      stains(ctx, w, w, 8, '200,170,110', 0.15);
    },
    sea(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#2a8fa3'; ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 400; i++) { ctx.strokeStyle = `rgba(255,255,255,${0.05 + R() * 0.15})`; ctx.lineWidth = 1 + R() * 2; const x = R() * w, y = R() * w; ctx.beginPath(); ctx.arc(x, y, 6 + R() * 18, 3.6, 5.8); ctx.stroke(); }
    },
    deck: tilesGen(1, 10, [140, 110, 80], '#4d3a28', 30),
    hedge(ctx) { leafNoise(ctx, '#2f5a26', 1); },
    bark(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#7d7a72'; ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(50,45,40,${0.1 + R() * 0.2})`; ctx.fillRect(R() * w, 0, 2 + R() * 5, w); }
      noise(ctx, w, w, 5000, 0.1);
    },
    palm_bark(ctx) {
      const w = ctx.canvas.width;
      ctx.fillStyle = '#7a6650'; ctx.fillRect(0, 0, w, w);
      for (let y = 0; y < w; y += 24) for (let x = 0; x < w; x += 24) {
        ctx.fillStyle = `rgb(${100 + R() * 30},${82 + R() * 20},${60})`;
        ctx.beginPath(); ctx.moveTo(x + 12 + (y / 24 % 2) * 12, y); ctx.lineTo(x + 24 + (y / 24 % 2) * 12, y + 12); ctx.lineTo(x + 12 + (y / 24 % 2) * 12, y + 24); ctx.lineTo(x + (y / 24 % 2) * 12, y + 12); ctx.fill();
      }
      noise(ctx, w, w, 4000, 0.15);
    },
    palm_frond(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#4f6b2a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.quadraticCurveTo(w / 2, h / 2 - 6, w, h / 2 + 4); ctx.stroke();
      for (let i = 4; i < 60; i++) {
        const t = i / 60, x = t * w, y = h / 2 - 6 * Math.sin(t * Math.PI);
        const len = (1 - t * 0.8) * h * 0.48;
        for (const s of [-1, 1]) {
          ctx.strokeStyle = `hsl(${85 + R() * 20},${45 + R() * 20}%,${25 + R() * 15}%)`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len * 0.4, y + s * len * 0.6, x + len * 0.55, y + s * len); ctx.stroke();
        }
      }
    },
    leaves(ctx) {
      const w = ctx.canvas.width;
      ctx.clearRect(0, 0, w, w);
      for (let i = 0; i < 900; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * w * 0.46;
        const x = w / 2 + Math.cos(a) * r, y = w / 2 + Math.sin(a) * r;
        ctx.fillStyle = `hsl(${95 + R() * 30},${40 + R() * 25}%,${16 + R() * 22 + (1 - y / w) * 10}%)`;
        ctx.beginPath(); ctx.ellipse(x, y, 7 + R() * 5, 3 + R() * 3, R() * 3, 0, Math.PI * 2); ctx.fill();
      }
    },
    bougainvillea(ctx) {
      GEN.leaves(ctx);
      const w = ctx.canvas.width;
      for (let i = 0; i < 400; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * w * 0.42;
        ctx.fillStyle = `hsl(${320 + R() * 20},80%,${45 + R() * 15}%)`;
        ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 3 + R() * 4, 0, 7); ctx.fill();
      }
    },
    car_headlight(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9eef3'); g.addColorStop(1, '#8b97a3');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (const x of [0.28, 0.66]) { const rg = ctx.createRadialGradient(x * w, h / 2, 2, x * w, h / 2, h * 0.42); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.5, '#c8d2dc'); rg.addColorStop(1, '#5d6670'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x * w, h / 2, h * 0.38, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fafcff'; ctx.fillRect(w * 0.05, h * 0.82, w * 0.9, h * 0.08);
      ctx.strokeStyle = '#30353a'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h);
    },
    car_taillight(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.fillStyle = '#7a0a0c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d51c22'; ctx.fillRect(w * 0.04, h * 0.1, w * 0.62, h * 0.8);
      ctx.fillStyle = '#f08a1c'; ctx.fillRect(w * 0.68, h * 0.1, w * 0.14, h * 0.8);
      ctx.fillStyle = '#eeeeee'; ctx.fillRect(w * 0.84, h * 0.1, w * 0.12, h * 0.8);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(w * 0.06 + i * w * 0.06, h * 0.15, w * 0.02, h * 0.7); }
    },
    car_grille(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.fillStyle = '#0e0f11'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = 2;
      for (let y = 0; y < h + 10; y += 10) for (let x = 0; x < w + 12; x += 12) { ctx.beginPath(); ctx.arc(x + (y / 10 % 2) * 6, y, 4, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#6b6f75'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h);
    },
    car_plate_il(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.fillStyle = '#f5c518'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1d4fa8'; ctx.fillRect(0, 0, w * 0.1, h);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.32}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('IL', w * 0.05, h * 0.85);
      ctx.fillStyle = '#111'; ctx.font = `bold ${h * 0.72}px "Arial Narrow", Arial, sans-serif`;
      ctx.fillText(`${R.int(10, 99)}-${R.int(100, 999)}-${R.int(10, 99)}`, w * 0.55, h * 0.78);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
    },
    car_taxi_sign(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.fillStyle = '#f7cf1d'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#111'; ctx.font = `bold ${h * 0.62}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('מונית', w / 2, h * 0.75);
    },
    car_rim(ctx) {
      const w = ctx.canvas.width, c = w / 2;
      ctx.fillStyle = '#222'; ctx.fillRect(0, 0, w, w);
      const g = ctx.createRadialGradient(c, c, 5, c, c, c); g.addColorStop(0, '#d9dde2'); g.addColorStop(0.8, '#aeb4ba'); g.addColorStop(1, '#5f656b');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, c, 0, 7); ctx.fill();
      ctx.fillStyle = '#1b1c1e';
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5 + Math.PI / 5;
        ctx.beginPath(); ctx.moveTo(c + Math.cos(a - 0.22) * c * 0.32, c + Math.sin(a - 0.22) * c * 0.32);
        ctx.lineTo(c + Math.cos(a - 0.36) * c * 0.86, c + Math.sin(a - 0.36) * c * 0.86);
        ctx.arc(c, c, c * 0.86, a - 0.36, a + 0.36);
        ctx.lineTo(c + Math.cos(a + 0.22) * c * 0.32, c + Math.sin(a + 0.22) * c * 0.32); ctx.fill();
      }
      ctx.fillStyle = '#8c9298'; ctx.beginPath(); ctx.arc(c, c, c * 0.2, 0, 7); ctx.fill();
    },
    kiosk(ctx) {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.fillStyle = '#e9e1cf'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2c6b45'; ctx.fillRect(0, 0, w, h * 0.18);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.12}px Arial`; ctx.textAlign = 'center'; ctx.fillText('קיוסק', w / 2, h * 0.14);
      ctx.fillStyle = '#3b3f44'; ctx.fillRect(w * 0.1, h * 0.25, w * 0.8, h * 0.45);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `hsl(${R() * 360},70%,55%)`; ctx.fillRect(w * 0.12 + R() * w * 0.74, h * 0.28 + R() * h * 0.38, 10, 14); }
      ctx.fillStyle = '#8a6a48'; ctx.fillRect(0, h * 0.7, w, h * 0.06);
    },
  };
  function stripesGen(a, b) {
    return ctx => {
      const w = ctx.canvas.width;
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(i * w / 8, 0, w / 8, w); }
      noise(ctx, w, w, 6000, 0.08);
      stains(ctx, w, w, 5, '255,255,255', 0.08);
    };
  }
  function curbGen(col) {
    return ctx => {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#e8e6e0' : col; ctx.fillRect(i * w / 4, 0, w / 4, h); }
      noise(ctx, w, h, 4000, 0.15);
    };
  }
  function leafNoise(ctx, base, k) {
    const w = ctx.canvas.width;
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 2500 * k; i++) {
      ctx.fillStyle = `hsl(${95 + R() * 30},${35 + R() * 25}%,${12 + R() * 25}%)`;
      ctx.beginPath(); ctx.ellipse(R() * w, R() * w, 5 + R() * 4, 2.5 + R() * 2, R() * 3, 0, 7); ctx.fill();
    }
  }
  // окна: 8 видов (см. tools/models/lib.py, WIN)
  const WIN_NAMES = ['win_alu', 'win_trisHalf', 'win_trisShut', 'win_shutterG', 'win_modern', 'win_curtain', 'win_door', 'win_blinds'];
  function drawWindow(ctx, k, x, y, w, h) {
    const glass = (gx, gy, gw, gh) => {
      const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      g.addColorStop(0, '#5f7d92'); g.addColorStop(0.45, '#2c3b47'); g.addColorStop(1, '#1b252d');
      ctx.fillStyle = g; ctx.fillRect(gx, gy, gw, gh);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(gx + gw * 0.1, gy + gh); ctx.lineTo(gx + gw * 0.5, gy); ctx.lineTo(gx + gw * 0.7, gy); ctx.lineTo(gx + gw * 0.3, gy + gh); ctx.fill();
    };
    const slats = (sx, sy, sw, sh, c1 = '#e7e0cf', c2 = '#a9a291') => {
      for (let yy = sy; yy < sy + sh; yy += 5) { ctx.fillStyle = c1; ctx.fillRect(sx, yy, sw, 4); ctx.fillStyle = c2; ctx.fillRect(sx, yy + 4, sw, 1); }
    };
    ctx.fillStyle = '#d9d9d4'; ctx.fillRect(x, y, w, h);
    const p = 5;
    if (k === 0) { glass(x + p, y + p, w / 2 - p * 1.5, h - 2 * p); glass(x + w / 2 + p / 2, y + p, w / 2 - p * 1.5, h - 2 * p); ctx.fillStyle = 'rgba(60,60,60,0.35)'; ctx.fillRect(x + w / 2 + p / 2, y + p, w / 2 - p * 1.5, h - 2 * p); }
    else if (k === 1) { glass(x + p, y + p, w - 2 * p, h - 2 * p); slats(x + p, y + p, w - 2 * p, (h - 2 * p) * 0.55); }
    else if (k === 2) { slats(x + p, y + p, w - 2 * p, h - 2 * p); }
    else if (k === 3) { ctx.fillStyle = '#3f6e4f'; ctx.fillRect(x, y, w, h); slats(x + 4, y + 4, w / 2 - 6, h - 8, '#4f8a63', '#2a4a35'); slats(x + w / 2 + 2, y + 4, w / 2 - 6, h - 8, '#4f8a63', '#2a4a35'); }
    else if (k === 4) { ctx.fillStyle = '#16181a'; ctx.fillRect(x, y, w, h); glass(x + 3, y + 3, w - 6, h - 6); }
    else if (k === 5) { ctx.fillStyle = '#e9e3d6'; ctx.fillRect(x, y, w, h); glass(x + p, y + p, w - 2 * p, h - 2 * p); ctx.fillStyle = 'rgba(235,220,190,0.85)'; ctx.fillRect(x + p, y + p, (w - 2 * p) * 0.35, h - 2 * p); ctx.fillRect(x + w - p - (w - 2 * p) * 0.3, y + p, (w - 2 * p) * 0.3, h - 2 * p); }
    else if (k === 6) { glass(x + p, y + p, w - 2 * p, h - 2 * p); ctx.fillStyle = 'rgba(220,210,190,0.7)'; ctx.fillRect(x + p, y + p, (w - 2 * p) * 0.3, h - 2 * p); ctx.fillStyle = '#cfcfca'; ctx.fillRect(x + w / 2 - 2, y, 4, h); }
    else { glass(x + p, y + p, w - 2 * p, h - 2 * p); slats(x + p, y + p, w - 2 * p, (h - 2 * p) * 0.4, '#f2f2ee', '#bdbdb5'); }
  }

  // ---------------------------------------------------------------- загрузка
  function img(name) {
    if (name in imgs) return imgs[name];
    const url = B()[name];
    if (!url) return (imgs[name] = null);
    const im = new Image();
    im.src = url;
    return (imgs[name] = im);
  }
  function setup(t, opts = {}) {
    t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    t.encoding = THREE.sRGBEncoding;
    if (opts.flipY === false) t.flipY = false;
    return t;
  }
  G.texInit = renderer => { maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()); };
  G.hasTex = name => !!B()[name];

  // текстура по имени: картинка из bundle или процедурная
  G.tex = (name, opts = {}) => {
    const key = name + (opts.clamp ? ':c' : '');
    if (cache[key]) return cache[key];
    const im = img(name);
    let t;
    if (im) {
      t = new THREE.Texture(im);
      if (im.complete) t.needsUpdate = true; else im.addEventListener('load', () => { t.needsUpdate = true; });
    } else {
      const big = ['asphalt', 'sidewalk', 'grass', 'sea', 'sand'].includes(name);
      const tall = name === 'palm_frond' ? [512, 128] : name.startsWith('car_') && name !== 'car_rim' ? [256, 80] : name === 'kiosk' ? [384, 256] : null;
      const c = tall ? canvas(tall[0], tall[1]) : canvas(big ? 512 : 256);
      const ctx = c.getContext('2d');
      (GEN[name] || plaster('#999'))(ctx);
      t = new THREE.CanvasTexture(c);
    }
    return (cache[key] = setup(t, opts));
  };

  // атлас окон: 8 видов по горизонтали; нижняя половина — тёмные ночью, верхняя — горят
  G.winAtlas = () => {
    if (cache._win) return cache._win;
    const CW = 128, CH = 128;
    const c = canvas(CW * 8, CH * 2), e = canvas(CW * 8, CH * 2);
    const ctx = c.getContext('2d'), ex = e.getContext('2d');
    ex.fillStyle = '#000'; ex.fillRect(0, 0, e.width, e.height);
    const map = setup(new THREE.CanvasTexture(c), { clamp: true });
    const em = setup(new THREE.CanvasTexture(e), { clamp: true });
    const draw = () => {
      for (let k = 0; k < 8; k++) for (let row = 0; row < 2; row++) {
        const x = k * CW, y = (1 - row) * CH;   // row 1 (горит) — верх картинки = v 0.5..1
        const im = img(WIN_NAMES[k]);
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, y, CW, CH);
        else drawWindow(ctx, k, x, y, CW, CH);
        if (row === 1) {
          // свет в окне: тёплое пятно, где нет ставней
          const lit = k === 2 ? 0.15 : k === 3 ? 0.2 : 1;
          const g = ex.createRadialGradient(x + CW / 2, y + CH * 0.55, 4, x + CW / 2, y + CH / 2, CW * 0.7);
          const warm = R() < 0.3 ? '190,215,255' : '255,214,150';
          g.addColorStop(0, `rgba(${warm},${0.95 * lit})`); g.addColorStop(1, `rgba(${warm},${0.45 * lit})`);
          ex.fillStyle = g; ex.fillRect(x + 6, y + 6, CW - 12, CH - 12);
        }
      }
      map.needsUpdate = true; em.needsUpdate = true;
    };
    draw();
    WIN_NAMES.forEach(n => { const im = img(n); if (im && !im.complete) im.addEventListener('load', draw); });
    return (cache._win = { map, em });
  };

  // мягкое пятно для света фонарей, фар и теней
  G.glowTex = (inner = 'rgba(255,240,200,1)', outer = 'rgba(255,200,120,0)') => {
    const key = '_glow' + inner;
    if (cache[key]) return cache[key];
    const c = canvas(128), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return (cache[key] = t);
  };
})();
