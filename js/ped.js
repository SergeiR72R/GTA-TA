// Люди: модель со скелетом и анимациями (Quaternius, CC0), движение, столкновения,
// ИИ прохожих: гуляют по тротуарам, переходят на зелёный, болтают, убегают, дерутся.
'use strict';
(() => {
  const C = G.City;
  const P = G.peds = [];
  const tmpQ = [];
  // скорость шага у анимаций (м/с), чтобы ноги не скользили
  const ANIM_V = { walk: 1.45, walk2: 1.35, jog: 3.6, run: 6.2 };

  class Ped {
    constructor(outfit, x, z, heading = 0, opts = {}) {
      this.outfit = outfit;
      const m = G.makePedModel(outfit);
      Object.assign(this, { root: m.root, mixer: m.mixer, actions: m.actions, bones: m.bones, kind: m.kind });
      this.x = x; this.z = z; this.y = C.groundY(x, z); this.vy = 0; this.heading = heading;
      this.vx = 0; this.vz = 0;
      this.health = 100; this.dead = false; this.down = 0; this.inCar = null;
      this.anim = null; this.lock = 0;            // lock — играется удар/падение, не перебивать
      this.want = { x: 0, z: 0, speed: 0 };
      this.r = 0.32;
      this.isPlayer = !!opts.player;
      this.scale = opts.scale || (this.kind === 'f' ? G.R.range(0.9, 0.97) : G.R.range(0.95, 1.03));
      this.root.scale.setScalar(this.scale);
      this.ai = this.isPlayer ? null : { mode: 'walk', from: null, to: null, side: G.R.range(-0.9, 0.9), t: 0, idle: 0, fleeT: 0, threat: null, punchCd: 0, brave: G.R() < 0.22, talk: G.R() < 0.3, ox: 0, oz: 0 };
      this.setAnim('idle', 0);
      G.scene.add(this.root);
      this.sync();
      P.push(this);
    }
    remove() {
      G.scene.remove(this.root);
      if (this.root.parent) this.root.parent.remove(this.root);
      this.mixer.stopAllAction();
      const i = P.indexOf(this); if (i >= 0) P.splice(i, 1);
    }
    setAnim(name, fade = 0.2, timeScale = 1) {
      const a = this.actions[name];
      if (!a) return;
      a.timeScale = timeScale;
      if (this.anim === name) return;
      const prev = this.actions[this.anim];
      a.reset(); a.enabled = true; a.setEffectiveWeight(1);
      if (prev && fade > 0) { a.play(); prev.crossFadeTo(a, fade, false); }
      else { if (prev) prev.stop(); a.play(); }
      this.anim = name;
    }
    once(name, lock, fade = 0.1, timeScale = 1) {
      this.anim = null;
      this.setAnim(name, fade, timeScale);
      this.lock = lock;
    }

    // ---------------------------------------------------------------- урон
    hurt(dmg, fx, fz, force = 3, by = null) {
      if (this.dead) return;
      this.health -= dmg;
      if (this.isPlayer) { G.playerHurt(0); }
      if (by === G.player && this.outfit.startsWith('cop') && this.ai) { G.addWanted(1); this.ai.mode = 'arrest'; }
      const dx = this.x - fx, dz = this.z - fz, d = Math.hypot(dx, dz) || 1;
      this.vx += dx / d * force; this.vz += dz / d * force;
      if (this.health <= 0) { this.kill(by); return; }
      if (force > 6 || dmg > 30) { this.knock(); }
      else { this.once(G.R() < 0.5 ? 'hit' : 'hitHead', 0.45); }
      G.audio && G.audio.play('punch', this.x, this.z, 0.8);
      if (this.ai) {
        if (this.ai.mode === 'arrest') { /* полицейский не убегает */ }
        else if (by === G.player && this.ai.brave && !this.down) { this.ai.mode = 'fight'; this.ai.fleeT = 12; }
        else this.flee(fx, fz, 10);
      }
    }
    knock() {
      this.down = 2.6;
      this.once('death', 2.6, 0.08, 1.4);
    }
    kill(by) {
      if (this.dead) return;
      this.dead = true; this.health = 0; this.down = 0;
      this.once('death', 999, 0.08);
      this.deadT = 0;
      if (this.isPlayer) { G.playerDied(); return; }
      // деньги из кармана
      G.dropMoney && G.dropMoney(this.x, this.z, G.R.int(1, 6) * 10);
      G.panic(this.x, this.z, 18, by);
      if (by === G.player) G.addWanted(this.isCop || this.outfit.startsWith('cop') ? 2 : 1);
    }
    flee(fx, fz, t) {
      if (!this.ai || this.dead) return;
      this.ai.mode = 'flee'; this.ai.threat = [fx, fz]; this.ai.fleeT = t + G.R.range(0, 3);
      if (G.R() < 0.3) G.audio && G.audio.scream(this.x, this.z);
    }

    // ---------------------------------------------------------------- ИИ
    think(dt) {
      const A = this.ai;
      A.punchCd -= dt;
      if (this.dead || this.down > 0) { this.want.speed = 0; return; }
      if (A.mode === 'arrest') return G.copThink(this, dt);
      if (A.mode === 'flee') {
        A.fleeT -= dt;
        const dx = this.x - A.threat[0], dz = this.z - A.threat[1], d = Math.hypot(dx, dz) || 1;
        this.want.x = dx / d; this.want.z = dz / d; this.want.speed = 5.6;
        if (A.fleeT <= 0) { A.mode = 'walk'; A.to = null; }
        return;
      }
      if (A.mode === 'fight') {
        const pl = G.player;
        A.fleeT -= dt;
        if (!pl || pl.dead || pl.inCar || A.fleeT <= 0) { A.mode = 'walk'; A.to = null; return; }
        const dx = pl.x - this.x, dz = pl.z - this.z, d = Math.hypot(dx, dz);
        this.want.x = dx / d; this.want.z = dz / d;
        this.want.speed = d > 1.1 ? 3.6 : 0;
        this.heading = G.lerpAngle(this.heading, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt));
        if (d < 1.3 && A.punchCd <= 0 && this.lock <= 0) {
          A.punchCd = G.R.range(0.8, 1.4);
          this.once(G.R() < 0.5 ? 'jab' : 'cross', 0.45);
          this.later(0.22, () => { if (!this.dead && this.down <= 0 && pl && !pl.inCar && Math.hypot(pl.x - this.x, pl.z - this.z) < 1.5) pl.hurt(6, this.x, this.z, 2, this); });
        }
        return;
      }
      if (A.mode === 'idle') {
        A.idle -= dt; this.want.speed = 0;
        if (A.idle <= 0) A.mode = 'walk';
        return;
      }
      // гуляем по графу тротуаров
      if (!A.to) {
        const n = C.walkNear(this.x, this.z, 40);
        if (!n) { this.want.speed = 0; return; }
        A.from = n; A.to = n; A.cross = null; A.ox = A.oz = 0;
      }
      const tx = A.to.x + A.ox, tz = A.to.z + A.oz;
      const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
      if (A.waitCross) {
        // ждём зелёного у перехода (машины этой оси стоят)
        const st = C.light(A.waitCross.cross, A.waitCross.axis, G.time);
        this.want.speed = 0;
        if (st === 'red' && G.lightTimeLeft(A.waitCross.cross, A.waitCross.axis) > 6) { A.cross = A.waitCross; A.to = A.waitCross.to; A.waitCross = null; this.offsets(A.from, A.to); }
        return;
      }
      if (d < 0.8 || (A.cross && d < 1.5)) {
        A.from = A.to;
        const links = A.from.links.filter(l => l.to !== A.prev || A.from.links.length === 1);
        A.prev = A.from;
        if (!links.length) { A.to = null; return; }
        let l = G.R.pick(links);
        if (l.cross && G.R() < 0.45) l = G.R.pick(links.filter(k => !k.cross)) || l;
        if (A.talk && !l.cross && G.R() < 0.06) { A.mode = 'idle'; A.idle = G.R.range(3, 8); }
        if (l.cross) {
          A.waitCross = { ...l };
          A.to = A.from;
          return;
        }
        A.cross = null;
        A.to = l.to;
        this.offsets(A.from, A.to);
        return;
      }
      this.want.x = dx / d; this.want.z = dz / d;
      this.want.speed = A.cross ? 1.9 : this.walkV || (this.walkV = G.R.range(1.2, 1.6));
      // на переходе загорелся красный для нас — бегом
      if (A.cross && C.light(A.cross.cross, A.cross.axis, G.time) !== 'red') this.want.speed = 3.4;
    }
    offsets(a, b) {
      // идём по своей стороне тротуара
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const s = this.ai.cross ? this.ai.side * 0.5 : this.ai.side;
      this.ai.ox = -dz / L * s; this.ai.oz = dx / L * s;
    }

    // ---------------------------------------------------------------- движение
    // отложенное действие в игровом времени (удар достигает цели не сразу)
    later(t, fn) { (this.pending || (this.pending = [])).push({ t, fn }); }
    update(dt) {
      if (this.pending) {
        for (const e of this.pending) e.t -= dt;
        const due = this.pending.filter(e => e.t <= 0);
        if (due.length) { this.pending = this.pending.filter(e => e.t > 0); due.forEach(e => e.fn()); }
      }
      if (this.inCar) { this.mixer.update(dt); return; }
      if (this.ai) this.think(dt);
      this.lock -= dt;
      if (this.down > 0) { this.down -= dt; if (this.down <= 0 && !this.dead) { this.once('death', 0.6, 0.05, -1.6); this.actions.death.time = this.actions.death.getClip().duration; } }
      const w = this.want;
      const sp = this.dead || this.down > 0 || (this.lock > 0 && this.anim !== 'jumpStart' && this.anim !== 'jump') ? 0 : w.speed;
      const tvx = w.x * sp, tvz = w.z * sp;
      const k = 1 - Math.exp(-(this.dead || this.down > 0 ? 2.5 : 10) * dt);
      this.vx = G.lerp(this.vx, tvx, k); this.vz = G.lerp(this.vz, tvz, k);
      if (sp > 0.1 && this.ai && this.ai.mode !== 'fight') this.heading = G.lerpAngle(this.heading, Math.atan2(w.x, w.z), 1 - Math.exp(-8 * dt));
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.collide(dt);
      // земля и прыжок
      const gy = C.groundY(this.x, this.z);
      if (this.vy !== 0 || this.y > gy + 0.02) {
        this.vy -= 14 * dt; this.y += this.vy * dt;
        if (this.y <= gy) { this.y = gy; if (this.vy < -2 && this.isPlayer) this.once('land', 0.25, 0.05); this.vy = 0; this.air = false; }
      } else this.y = G.lerp(this.y, gy, 1 - Math.exp(-20 * dt));
      this.animate(dt);
      this.sync();
    }
    collide(dt) {
      // стены, столбы, деревья
      const near = C.query(this.x, this.z, 1.5, tmpQ);
      for (const c of near) {
        if (c.h < 0.4 || (this.y > 0.6 && c.h < 1.2)) continue;
        if (c.t === 'circle') {
          const dx = this.x - c.x, dz = this.z - c.z, d = Math.hypot(dx, dz), m = c.r + this.r;
          if (d < m && d > 1e-5) { this.x += dx / d * (m - d); this.z += dz / d * (m - d); }
        } else {
          const px = G.clamp(this.x, c.x0, c.x1), pz = G.clamp(this.z, c.z0, c.z1);
          const dx = this.x - px, dz = this.z - pz, d = Math.hypot(dx, dz);
          if (d < this.r) {
            if (d > 1e-5) { this.x += dx / d * (this.r - d); this.z += dz / d * (this.r - d); }
            else {
              // внутри — выталкиваем к ближайшей стороне
              const o = [this.x - c.x0, c.x1 - this.x, this.z - c.z0, c.z1 - this.z];
              const i = o.indexOf(Math.min(...o));
              if (i === 0) this.x = c.x0 - this.r; else if (i === 1) this.x = c.x1 + this.r; else if (i === 2) this.z = c.z0 - this.r; else this.z = c.z1 + this.r;
            }
          }
        }
      }
      // машины: стоящие — препятствие, едущие — сбивают
      for (const v of G.vehicles) {
        const dx = this.x - v.x, dz = this.z - v.z;
        if (dx * dx + dz * dz > (v.L / 2 + 1.5) ** 2) continue;
        if (v === this.ignoreCar) continue;
        const [fx, fz] = v.fwd, rx = -fz, rz = fx;
        const lf = dx * fx + dz * fz, lr = dx * rx + dz * rz;
        const hl = v.L / 2 + this.r, hw = v.W / 2 + this.r;
        if (Math.abs(lf) >= hl || Math.abs(lr) >= hw) continue;
        const vn = v.speed;
        // относительная скорость навстречу
        if (vn > 3.2 && !this.dead && (v.vx * dx + v.vz * dz) > 0) {
          const dmg = (vn - 3) * 11;
          G.audio && G.audio.play('bodyhit', this.x, this.z, Math.min(1, vn / 15));
          this.vx = v.vx * 1.1 + rx * Math.sign(lr) * 2; this.vz = v.vz * 1.1 + rz * Math.sign(lr) * 2;
          this.vy = Math.min(6, vn * 0.25); this.y += 0.05;
          v.damage(vn * 2);
          this.health -= dmg;
          if (this.health <= 0) this.kill(v.driver);
          else this.knock();
          if (v.driver === G.player) { G.panic(this.x, this.z, 15, G.player); if (!this.dead) G.addWanted(0.25); }
          if (this.ai && !this.dead) this.flee(v.x, v.z, 8);
        }
        // вытолкнуть по меньшему перекрытию
        const pf = hl - Math.abs(lf), pr = hw - Math.abs(lr);
        if (pf < pr) { this.x += fx * Math.sign(lf) * pf; this.z += fz * Math.sign(lf) * pf; }
        else { this.x += rx * Math.sign(lr) * pr; this.z += rz * Math.sign(lr) * pr; }
      }
    }
    animate(dt) {
      if (this.lock <= 0 && !this.dead && this.down <= 0) {
        if (this.air) this.setAnim('jump', 0.15);
        else {
          const s = Math.hypot(this.vx, this.vz);
          if (s < 0.25) this.setAnim(this.ai && this.ai.mode === 'idle' && this.ai.talk ? 'talk' : (this.ai && this.ai.mode === 'fight' ? 'pistolIdle' : 'idle'), 0.25);
          else if (s < 2.4) this.setAnim(this.kind === 'f' ? 'walk2' : 'walk', 0.25, s / ANIM_V.walk);
          else if (s < 4.8) this.setAnim('jog', 0.2, s / ANIM_V.jog);
          else this.setAnim('run', 0.2, s / ANIM_V.run);
        }
      }
      // дальних обновляем реже
      const d2 = G.camPos ? G.dist2(this.x, this.z, G.camPos.x, G.camPos.z) : 0;
      const far = d2 > 3600;
      const sh = d2 < 1600;
      if (sh !== this.shadow) { this.shadow = sh; this.root.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }
      this.skip = far ? (this.skip || 0) + 1 : 0;
      if (!far || this.skip % 3 === 0) this.mixer.update(far ? dt * 3 : dt);
    }
    sync() {
      this.root.position.set(this.x, this.y, this.z);
      this.root.rotation.y = this.heading;
    }
  }
  G.Ped = Ped;

  // паника: все, кто рядом, убегают
  G.panic = (x, z, r, by) => {
    for (const p of P) {
      if (p.isPlayer || p.dead || p.inCar || !p.ai) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < r && p.ai.mode !== 'fight') p.flee(x, z, 6 + G.R() * 6);
    }
  };
  G.lightTimeLeft = (node, axis) => {
    // сколько ещё красного для оси (машины стоят) — грубо по циклу 34 с
    let t = 0;
    while (t < 20 && C.light(node, axis, G.time + t) === 'red') t += 1;
    return t;
  };
})();
