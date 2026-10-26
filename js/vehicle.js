// Машины: модель, аркадная физика (сцепление, занос, крен), столкновения со стенами,
// столбами и друг с другом, урон (дым, огонь, взрыв), ИИ трафика по полосам.
'use strict';
(() => {
  const C = G.City;
  const V = G.vehicles = [];
  const PARAMS = {
    small: { maxV: 40, acc: 8.5, mass: 1000, grip: 7.5 },
    sedan: { maxV: 47, acc: 9.5, mass: 1300, grip: 7.0 },
    suv: { maxV: 44, acc: 9.0, mass: 1700, grip: 6.5 },
    work: { maxV: 37, acc: 7.0, mass: 2100, grip: 6.0 },
    old: { maxV: 34, acc: 6.5, mass: 950, grip: 6.0 },
  };
  const TYPES = () => Object.keys(GEN_CARS);
  G.carTypes = TYPES;
  const tmpQ = [];

  class Vehicle {
    constructor(type, x, z, heading, opts = {}) {
      const geo = G.carGeoms(type);
      const d = geo.d;
      this.type = type; this.d = d;
      this.title = d.title;
      this.W = d.size[0]; this.H = d.size[1]; this.L = d.size[2];
      const P = PARAMS[d.kind] || PARAMS.sedan;
      Object.assign(this, { maxV: P.maxV, acc: P.acc, mass: P.mass, grip: P.grip });
      this.x = x; this.z = z; this.y = C.groundY(x, z); this.heading = heading;
      this.vx = 0; this.vz = 0; this.w = 0; this.steer = 0;
      this.health = 1000; this.burn = 0; this.wreck = false;
      this.spin = 0; this.roll = 0; this.pitch = 0;
      this.siren = false; this.horn = 0;
      this.driver = null; this.ai = null; this.asleep = !!opts.parked;
      this.brakeLight = 0;
      this.paint = opts.color || (d.paint ? new THREE.Color(...d.paint) : G.carColor(opts.R || G.R, d.kind));
      this.lights = [0, 0, 0, 0];
      this.slot = G.CarRender.alloc(type);
      // группы — только для расчёта положения и для водителя на сиденье; рисует G.CarRender
      const root = this.root = new THREE.Group();
      const body = this.body = new THREE.Group();
      root.add(body);
      this.wheels = d.wheels.map(([wx, wy, wz]) => {
        const m = new THREE.Object3D();
        m.position.set(wx, wy, wz);
        m.rotation.order = 'YXZ';
        m.userData.left = wx < 0; m.userData.front = wz < 0;
        root.add(m);
        return m;
      });
      this.beamM = new THREE.Matrix4();
      this.beamOff = new THREE.Matrix4().makeTranslation(0, 0.06, -this.L / 2 - 4.2);
      G.scene.add(root);
      this.sync();
      V.push(this);
    }
    get speed() { return Math.hypot(this.vx, this.vz); }
    get fwd() { return [-Math.sin(this.heading), -Math.cos(this.heading)]; }
    get fspeed() { const [fx, fz] = this.fwd; return this.vx * fx + this.vz * fz; }
    corners() {
      const [fx, fz] = this.fwd, rx = -fz, rz = fx;
      const hl = this.L / 2, hw = this.W / 2;
      return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [this.x + fx * hl * a + rx * hw * b, this.z + fz * hl * a + rz * hw * b]);
    }
    // точка двери водителя (слева) в мире
    doorPos() {
      const [fx, fz] = this.fwd, rx = -fz, rz = fx;
      const [dx, , dz] = this.d.door;
      return [this.x + rx * dx - fx * dz, this.z + rz * dx - fz * dz];
    }
    remove() {
      G.scene.remove(this.root);
      const i = V.indexOf(this); if (i >= 0) V.splice(i, 1);
      if (this.driver && this.driver.remove && this.driver !== G.player) this.driver.remove();
      G.CarRender.free(this.type, this.slot); this.slot = -1;
    }

    // ---------------------------------------------------------------- управление
    controls(dt) {
      if (this.wreck) return { throttle: 0, steer: 0, brake: 1, hand: 1 };
      if (this.driver === G.player) return G.playerCarInput(this, dt);
      if (this.cop) return G.copDrive(this, dt);
      if (this.ai) return this.aiDrive(dt);
      return { throttle: 0, steer: 0, brake: 1, hand: 1 };
    }

    update(dt, time) {
      if (this.asleep && this.speed < 0.05) { this.sync(); return; }
      const inp = this.controls(dt);
      const [fx, fz] = this.fwd, rx = -fz, rz = fx;
      let vf = this.vx * fx + this.vz * fz, vr = this.vx * rx + this.vz * rz;
      // двигатель и тормоза
      let a = 0;
      if (inp.throttle > 0) {
        if (vf < -0.5) a = 14 * inp.throttle;
        else a = this.acc * inp.throttle * (1 - Math.pow(G.clamp(vf / this.maxV, 0, 1), 2));
      } else if (inp.throttle < 0) {
        if (vf > 0.5) a = -16 * -inp.throttle;
        else a = -this.acc * 0.5 * -inp.throttle * (vf > -11 ? 1 : 0);
      }
      if (inp.brake) a -= Math.sign(vf) * 16 * inp.brake;
      this.brakeLight = (inp.throttle < 0 && vf > 0.5) || inp.brake > 0.2 || inp.hand ? 1 : 0;
      vf += a * dt;
      // сопротивление
      vf -= (0.0022 * vf * Math.abs(vf) + 0.12 * vf) * dt;
      if (inp.hand) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 7 * dt);
      if (!inp.throttle && !inp.brake && Math.abs(vf) < 0.25) vf = 0;
      // поворот: чем быстрее, тем меньше угол колёс
      const maxSt = 0.62 * (1 - G.clamp(Math.abs(vf) / 60, 0, 0.55));
      this.steer = G.lerp(this.steer, inp.steer * maxSt, 1 - Math.exp(-10 * dt));
      const wb = this.L * 0.6;
      let wTarget = vf / wb * Math.tan(this.steer);
      // ручник: задние колёса скользят, машину заносит
      const grip = inp.hand ? 1.1 : this.grip * (this.wreck ? 0.4 : 1);
      if (inp.hand) wTarget *= 1.5;
      this.w = G.lerp(this.w, wTarget, 1 - Math.exp(-(inp.hand ? 4 : 9) * dt));
      vr *= Math.exp(-grip * dt);
      // занос — пыль/дым из-под колёс
      if (Math.abs(vr) > 4 && Math.random() < 0.6) G.FX.spawn('dust', this.x - fx * this.L * 0.4, this.y + 0.3, this.z - fz * this.L * 0.4, { size: 0.9, life: 0.9, vy: 0.5 });
      this.heading += this.w * dt;
      const [nfx, nfz] = this.fwd, nrx = -nfz, nrz = nfx;
      this.vx = nfx * vf + nrx * vr;
      this.vz = nfz * vf + nrz * vr;
      this.x += this.vx * dt; this.z += this.vz * dt;
      // крен и клевок
      this.roll = G.lerp(this.roll, G.clamp(-this.w * vf * 0.006, -0.06, 0.06), 1 - Math.exp(-6 * dt));
      this.pitch = G.lerp(this.pitch, G.clamp(-a * 0.004, -0.04, 0.05), 1 - Math.exp(-6 * dt));
      // высота: бордюр
      const gy = C.groundY(this.x, this.z);
      this.y = G.lerp(this.y, gy, 1 - Math.exp(-12 * dt));
      this.spin += vf * dt;
      this.collideStatic();
      // урон: дым, огонь, взрыв
      if (!this.wreck) {
        if (this.health < 350 && Math.random() < (this.health < 200 ? 0.5 : 0.25)) {
          const [hx, hz] = [this.x + nfx * this.L * 0.35, this.z + nfz * this.L * 0.35];
          G.FX.spawn('smoke', hx, this.y + this.H * 0.7, hz, { dark: this.health < 200 ? 0.6 : 0.1, size: 0.7 });
        }
        if (this.health < 100) {
          this.burn += dt;
          if (Math.random() < 0.7) G.FX.spawn('fire', this.x + nfx * this.L * 0.35, this.y + this.H * 0.6, this.z + nfz * this.L * 0.35, { size: 0.9 });
          if (this.burn > 4.5) this.explode();
        }
      } else if (Math.random() < 0.3) {
        G.FX.spawn('smoke', this.x, this.y + this.H * 0.5, this.z, { dark: 0.85, size: 1.0 });
      }
      this.sync(time);
    }
    damage(v, by) {
      if (this.wreck) return;
      this.health -= v;
      if (by === G.player && this.ai) this.ai.angry = 4;
      if (by === G.player && this.d.police && v > 40) G.addWanted(0.3);
    }
    explode() {
      if (this.wreck) return;
      this.wreck = true; this.health = 0;
      G.FX.explosion(this.x, this.y + 0.5, this.z);
      G.audio && G.audio.play('explosion', this.x, this.z, 1);
      G.shake = Math.max(G.shake || 0, 0.8);
      this.paint = new THREE.Color(0.05, 0.05, 0.05);
      this.vy = 6;
      // взрывная волна
      for (const p of G.peds) {
        const d = Math.hypot(p.x - this.x, p.z - this.z);
        if (d < 7) p.hurt(140 * (1 - d / 7) + 20, this.x, this.z, 9);
      }
      for (const v of V) {
        if (v === this) continue;
        const d = Math.hypot(v.x - this.x, v.z - this.z);
        if (d < 8) { v.damage(500 * (1 - d / 8)); const k = (1 - d / 8) * 8; v.vx += (v.x - this.x) / (d + 0.1) * k; v.vz += (v.z - this.z) / (d + 0.1) * k; v.asleep = false; }
      }
      if (this.driver && this.driver !== G.player) { this.driver.kill && this.driver.kill(); }
      if (this.driver === G.player) G.playerHurt(200);
    }

    // ---------------------------------------------------------------- столкновения
    collideStatic() {
      const r = Math.max(this.L, this.W) / 2 + 0.5;
      const near = C.query(this.x, this.z, r, tmpQ);
      const [fx, fz] = this.fwd, rx = -fz, rz = fx;
      const hl = this.L / 2, hw = this.W / 2;
      for (const c of near) {
        if (c.h < 0.5) continue;
        let nx = 0, nz = 0, pen = 0;
        if (c.t === 'circle') {
          // ближайшая точка прямоугольника машины к центру столба
          const dx = c.x - this.x, dz = c.z - this.z;
          const lf = G.clamp(dx * fx + dz * fz, -hl, hl), lr = G.clamp(dx * rx + dz * rz, -hw, hw);
          const px = this.x + fx * lf + rx * lr, pz = this.z + fz * lf + rz * lr;
          const ex = px - c.x, ez = pz - c.z;
          const d = Math.hypot(ex, ez);
          if (d >= c.r) continue;
          if (d < 1e-4) { nx = -dx; nz = -dz; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; pen = c.r; }
          else { nx = ex / d; nz = ez / d; pen = c.r - d; }
        } else {
          // SAT: прямоугольник машины против прямоугольника стены
          const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, ex = (c.x1 - c.x0) / 2, ez = (c.z1 - c.z0) / 2;
          const axes = [[1, 0], [0, 1], [fx, fz], [rx, rz]];
          let best = 1e9;
          let ok = true;
          for (const [ax, az] of axes) {
            const projCar = hl * Math.abs(fx * ax + fz * az) + hw * Math.abs(rx * ax + rz * az);
            const projBox = ex * Math.abs(ax) + ez * Math.abs(az);
            const dist = (this.x - cx) * ax + (this.z - cz) * az;
            const o = projCar + projBox - Math.abs(dist);
            if (o <= 0) { ok = false; break; }
            if (o < best) { best = o; nx = ax * Math.sign(dist || 1); nz = az * Math.sign(dist || 1); }
          }
          if (!ok) continue;
          pen = best;
        }
        this.x += nx * pen; this.z += nz * pen;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) {
          const imp = -vn;
          this.vx -= (1.3 * vn) * nx; this.vz -= (1.3 * vn) * nz;
          this.vx *= 0.92; this.vz *= 0.92;
          // удар раскручивает
          this.w += (Math.random() - 0.5) * imp * 0.08;
          if (imp > 4) {
            this.damage(imp * imp * 1.6);
            G.audio && G.audio.crash(this.x, this.z, imp);
            if (imp > 8) for (let i = 0; i < 5; i++) G.FX.spawn('spark', this.x - nx * hl * 0.8, this.y + 0.6, this.z - nz * hl * 0.8, { vx: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 3 });
            if (this.driver === G.player) G.shake = Math.max(G.shake || 0, Math.min(0.6, imp * 0.03));
          }
        }
      }
    }

    // ---------------------------------------------------------------- вид
    sync(time = 0) {
      this.root.position.set(this.x, this.y, this.z);
      this.root.rotation.y = this.heading;
      this.body.rotation.set(this.pitch, 0, this.roll, 'YXZ');
      const r = this.d.r;
      for (const wm of this.wheels) {
        const steer = wm.userData.front ? this.steer : 0;
        const a = this.spin / r;
        wm.rotation.set(wm.userData.left ? a : -a, (wm.userData.left ? Math.PI : 0) + steer, 0);
      }
      const night = G.night || 0;
      const L = this.lights;
      if (!this.wreck) {
        L[0] = night > 0.3 ? 1 : 0;
        L[1] = this.brakeLight ? 1 : night > 0.3 ? 0.35 : 0;
        const ph = Math.floor(time * 6) % 2;
        L[2] = this.siren && ph ? 1 : 0; L[3] = this.siren && !ph ? 1 : 0;
      } else L[0] = L[1] = L[2] = L[3] = 0;
      this.root.updateMatrixWorld(true);
      G.CarRender.set(this, this.body.matrixWorld, this.wheels.map(w => w.matrixWorld));
      if (L[0] && !this.wreck) { this.beamM.multiplyMatrices(this.root.matrixWorld, this.beamOff); G.CarRender.beam(this.beamM); }
    }

    // ---------------------------------------------------------------- ИИ
    startAI(edge, s = 0) {
      this.ai = { edge, s, next: null, turn: null, ti: 0, cruise: G.R.range(10, 13.5), stuck: 0, honk: 0, angry: 0, wait: 0 };
      this.ai.next = this.pickNext(edge);
      this.asleep = false;
    }
    pickNext(e) {
      const opts = C.nextEdges(e);
      if (!opts.length) return null;
      if (this.ai && this.ai.chase && this.ai.goal) {
        // погоня: к перекрёстку, ближайшему к игроку
        const ge = this.ai.goalEdge;
        if (ge && e.b === ge.a && opts.includes(ge)) return ge;
        const g = this.ai.goal.id;
        return opts.reduce((a, o) => (C.ndist[o.b.id][g] + o.len < C.ndist[a.b.id][g] + a.len ? o : a));
      }
      // прямо чаще, чем поворот
      const straight = opts.find(o => o.dx === e.dx && o.dz === e.dz);
      if (straight && G.R() < 0.5) return straight;
      return G.R.pick(opts);
    }
    // точка впереди по маршруту на расстоянии dist от проекции машины
    aiPoint(dist) {
      const A = this.ai;
      if (!A.turn) {
        const e = A.edge;
        const s = A.s + dist;
        if (s <= e.len || !A.next) { const ss = Math.min(s, e.len); return [e.x0 + e.dx * ss, e.z0 + e.dz * ss]; }
        A.turnPts = A.turnPts || C.turnPath(e, A.next);
        return this.alongPts(A.turnPts, 0, s - e.len, A.next);
      }
      return this.alongPts(A.turn, A.ti, dist, A.next);
    }
    alongPts(pts, i0, dist, nextEdge) {
      let x = pts[i0][0], z = pts[i0][1];
      for (let i = i0 + 1; i < pts.length; i++) {
        const sl = Math.hypot(pts[i][0] - x, pts[i][1] - z);
        if (dist <= sl) { const t = dist / sl; return [x + (pts[i][0] - x) * t, z + (pts[i][1] - z) * t]; }
        dist -= sl; x = pts[i][0]; z = pts[i][1];
      }
      if (nextEdge) { const ss = Math.min(dist, nextEdge.len); return [nextEdge.x0 + nextEdge.dx * ss, nextEdge.z0 + nextEdge.dz * ss]; }
      return [x, z];
    }
    aiDrive(dt) {
      const A = this.ai;
      const v = this.fspeed;
      const time = G.time;
      // продвижение по полосе / повороту
      if (!A.turn) {
        const e = A.edge;
        A.s = G.clamp((this.x - e.x0) * e.dx + (this.z - e.z0) * e.dz, 0, e.len);
        if (A.s >= e.len - 1.0 && A.next) { A.turn = A.turnPts || C.turnPath(e, A.next); A.turnPts = null; A.ti = 0; }
      }
      if (A.turn) {
        // ближайшая точка поворота впереди
        while (A.ti < A.turn.length - 1 && G.dist2(this.x, this.z, A.turn[A.ti + 1][0], A.turn[A.ti + 1][1]) < G.dist2(this.x, this.z, A.turn[A.ti][0], A.turn[A.ti][1])) A.ti++;
        if (A.ti >= A.turn.length - 2 && G.dist2(this.x, this.z, A.turn[A.turn.length - 1][0], A.turn[A.turn.length - 1][1]) < 4) {
          A.edge = A.next; A.s = 0; A.turn = null; A.next = this.pickNext(A.edge);
        }
      }
      // руль — на точку впереди
      const look = 5 + Math.abs(v) * 0.45;
      const [tx, tz] = this.aiPoint(look);
      const want = Math.atan2(-(tx - this.x), -(tz - this.z));
      const err = G.wrapAngle(want - this.heading);
      const steer = G.clamp(err * 2.2, -1, 1);
      // желаемая скорость
      let target = A.cruise;
      if (A.turn) target = Math.min(target, 7);
      else if (A.next) {
        const d = A.edge.len - A.s;
        const straight = A.next.dx === A.edge.dx && A.next.dz === A.edge.dz;
        if (!straight) target = Math.min(target, Math.sqrt(49 + 2 * 4 * Math.max(0, d)));
        // светофор (погоня едет на красный)
        const st = A.chase ? 'green' : C.light(A.edge.b, A.edge.axis, time);
        if (st === 'red' || st === 'redyellow' || (st === 'yellow' && d > 10 && v > 0) || (st === 'blink' && d > 25)) {
          if (d < 45) target = Math.min(target, Math.max(0, Math.sqrt(2 * 3.5 * Math.max(0, d - 1.5)) - 0.5));
        }
      }
      // кто впереди: машины, люди
      const [fx, fz] = this.fwd, rx = -fz, rz = fx;
      let gap = 1e9, blocker = null;
      for (const o of A.chase ? [] : V) {
        if (o === this) continue;
        const dx = o.x - this.x, dz = o.z - this.z;
        if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue;
        const ah = dx * fx + dz * fz;
        if (ah <= 0 || ah > 28) continue;
        const lat = Math.abs(dx * rx + dz * rz);
        const lim = (o.W + this.W) / 2 + 0.3 + (A.turn ? 0.6 : 0);
        if (lat < lim) { const g = ah - (o.L + this.L) / 2; if (g < gap) { gap = g; blocker = o; } }
      }
      for (const p of A.chase ? [] : G.peds) {
        if (p.dead || p.inCar) continue;
        const dx = p.x - this.x, dz = p.z - this.z;
        if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
        const ah = dx * fx + dz * fz;
        if (ah <= 0 || ah > 14) continue;
        const lat = Math.abs(dx * rx + dz * rz);
        if (lat < this.W / 2 + 0.7) { const g = ah - this.L / 2; if (g < gap) { gap = g; blocker = p; } }
      }
      if (gap < 1e8) target = Math.min(target, Math.max(A.chase ? 6 : 0, (gap - 2.5) * 1.1));
      // сигналим, если стоим из-за игрока
      if (blocker && (blocker === G.player || blocker.driver === G.player) && v < 1) {
        A.honk += dt;
        if (A.honk > 1.8) { A.honk = -G.R.range(1.5, 4); G.audio && G.audio.horn(this.x, this.z); this.horn = 0.5; }
      } else A.honk = Math.max(0, A.honk - dt);
      // застряли (после аварии) — пробуем сдать назад
      if (target > 3 && v < 0.5) A.stuck += dt; else A.stuck = Math.max(0, A.stuck - dt * 2);
      if (A.stuck > 3.5) { A.wait = 1.4; A.stuck = 0; }
      if (A.wait > 0) { A.wait -= dt; return { throttle: -0.6, steer: -steer, brake: 0, hand: 0 }; }
      let throttle = 0, brake = 0;
      if (v < target - 0.3) throttle = G.clamp((target - v) * 0.35, 0.25, 1);
      else if (v > target + 0.6) { brake = G.clamp((v - target) * 0.25, 0.2, 1); }
      if (target < 0.2 && v < 0.6) brake = 1;
      return { throttle, steer, brake, hand: 0 };
    }
  }
  G.Vehicle = Vehicle;

  // ---------------------------------------------------------------- машина против машины
  G.collideVehicles = () => {
    for (let i = 0; i < V.length; i++) {
      const a = V[i];
      for (let j = i + 1; j < V.length; j++) {
        const b = V[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const rr = (a.L + b.L) / 2;
        if (dx * dx + dz * dz > rr * rr) continue;
        if (a.asleep && b.asleep) continue;
        // SAT двух прямоугольников
        const [afx, afz] = a.fwd, [bfx, bfz] = b.fwd;
        const axes = [[afx, afz], [-afz, afx], [bfx, bfz], [-bfz, bfx]];
        let best = 1e9, nx = 0, nz = 0, ok = true;
        for (const [ax, az] of axes) {
          const pa = a.L / 2 * Math.abs(afx * ax + afz * az) + a.W / 2 * Math.abs(-afz * ax + afx * az);
          const pb = b.L / 2 * Math.abs(bfx * ax + bfz * az) + b.W / 2 * Math.abs(-bfz * ax + bfx * az);
          const d = dx * ax + dz * az;
          const o = pa + pb - Math.abs(d);
          if (o <= 0) { ok = false; break; }
          if (o < best) { best = o; const s = Math.sign(d || 1); nx = ax * s; nz = az * s; }
        }
        if (!ok) continue;
        const ma = a.mass, mb = b.mass, mt = ma + mb;
        a.x -= nx * best * mb / mt; a.z -= nz * best * mb / mt;
        b.x += nx * best * ma / mt; b.z += nz * best * ma / mt;
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) {
          const jimp = -(1.25) * rv / (1 / ma + 1 / mb);
          a.vx -= jimp / ma * nx; a.vz -= jimp / ma * nz;
          b.vx += jimp / mb * nx; b.vz += jimp / mb * nz;
          a.w += (Math.random() - 0.5) * -rv * 0.12; b.w += (Math.random() - 0.5) * -rv * 0.12;
          const imp = -rv;
          if (imp > 3) {
            a.damage(imp * imp * 1.2, b.driver); b.damage(imp * imp * 1.2, a.driver);
            G.audio && G.audio.crash((a.x + b.x) / 2, (a.z + b.z) / 2, imp);
            if (a.driver === G.player || b.driver === G.player) G.shake = Math.max(G.shake || 0, Math.min(0.6, imp * 0.03));
          }
          a.asleep = b.asleep = false;
        }
      }
    }
  };
})();
