// Toxic-combo happenings: short scenes (10 s max) that play around a gas cloud.
// They only draw and make sounds; the game keeps the score. A scene is started by an
// event { fx: 'toxic', kind, x, z, seed, ... }, so replays play the same scene again.
import * as THREE from 'three';
import { Character, POSE, newState } from './characters.js';
import { HALF } from './world.js';
import { LINES } from './data.js';

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mats = new Map();
const toon = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshToonMaterial({ color: c })); return mats.get(c); };
const OUT = new THREE.MeshBasicMaterial({ color: '#2b1d0e', side: THREE.BackSide });
function part(geo, color, parent, x = 0, y = 0, z = 0, outline = false) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  m.castShadow = outline;
  if (outline) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1.06); m.add(o); }
  parent.add(m);
  return m;
}
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- birds
// A flock circles over the cloud, drops dead, lies legs-up, shakes it off and flies away.
function makeBird(parent) {
  const g = new THREE.Group();
  part(new THREE.SphereGeometry(0.22, 12, 10), '#7f8c9a', g, 0, 0, 0, true).scale.set(1, 0.85, 1.4);
  const head = part(new THREE.SphereGeometry(0.13, 10, 8), '#6b7785', g, 0, 0.12, 0.28, true);
  part(new THREE.ConeGeometry(0.04, 0.1, 6), '#f39c12', head, 0, -0.01, 0.13).rotation.x = Math.PI / 2;
  const eyes = [], xs = [];
  for (const sx of [-1, 1]) {
    eyes.push(part(new THREE.SphereGeometry(0.035, 6, 4), '#111111', head, sx * 0.07, 0.04, 0.09));
    const x1 = part(new THREE.BoxGeometry(0.07, 0.015, 0.015), '#111111', head, sx * 0.07, 0.04, 0.11);
    const x2 = x1.clone();
    x1.rotation.z = 0.8; x2.rotation.z = -0.8;
    head.add(x2);
    xs.push(x1, x2);
  }
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(sx * 0.16, 0.05, 0);
    part(new THREE.BoxGeometry(0.38, 0.03, 0.22), '#5d6d7e', piv, sx * 0.19, 0, 0);
    g.add(piv);
    wings.push({ piv, sx });
  }
  const legs = [];
  for (const sx of [-1, 1]) legs.push(part(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 5), '#f39c12', g, sx * 0.07, -0.25, 0));
  parent.add(g);
  return { g, head, eyes, xs, wings, legs };
}

class Birds {
  constructor(root, ev, sfx) {
    this.dur = 9;
    this.sfx = sfx;
    const r = rng(ev.seed);
    this.birds = Array.from({ length: 10 }, (_, k) => {
      const b = makeBird(root);
      b.ang = (k / 10) * Math.PI * 2;
      b.rad = 3 + r() * 3;
      b.h = 9 + r() * 3;
      b.j = r() * 0.6;
      b.spin = (r() - 0.5) * 12;
      b.cx = ev.x; b.cz = ev.z;
      b.away = r() * Math.PI * 2;
      b.say = k === 0 ? '💫' : k === 3 ? '?!' : k === 6 ? 'x_x' : null;
      return b;
    });
    this.bubbles = [];
    this.thuds = 0;
  }
  update(t) {
    for (const b of this.birds) {
      const tf = 1.2 + b.j;               // start of the fall
      const tl = tf + 0.9;                // on the ground
      const ts = 5.2 + b.j;               // shake it off
      const tu = ts + 0.8;                // up and away
      let x, y, z, flap = 0, back = 0, spin = 0;
      if (t < tf) {
        const a = b.ang + t * 1.6;
        x = b.cx + Math.cos(a) * b.rad; z = b.cz + Math.sin(a) * b.rad; y = b.h;
        b.g.rotation.set(0, -a, 0.3);
        flap = Math.sin(t * 25);
        b.lx = x; b.lz = z;
      } else if (t < tl) {
        const k = (t - tf) / (tl - tf);
        x = b.lx; z = b.lz; y = lerp(b.h, 0.25, k * k);
        spin = (t - tf) * b.spin;
        b.g.rotation.set(spin, spin * 0.5, Math.PI * k);
      } else if (t < ts) {
        x = b.lx; z = b.lz; y = 0.25;
        back = 1;
        b.g.rotation.set(0, b.away, Math.PI);   // legs up
        if (!b.landed) { b.landed = true; this.thuds++; if (this.thuds <= 3) this.sfx.thud(); }
      } else if (t < tu) {
        x = b.lx; z = b.lz; y = 0.25 + Math.abs(Math.sin((t - ts) * 20)) * 0.12;
        const k = (t - ts) / (tu - ts);
        b.g.rotation.set(Math.sin(t * 40) * 0.4, b.away, Math.PI * (1 - ease(k)));   // shake, flip upright
      } else {
        const k = t - tu;
        x = b.lx + Math.cos(b.away) * k * 5; z = b.lz + Math.sin(b.away) * k * 5; y = 0.3 + k * k * 2 + k * 2;
        b.g.rotation.set(-0.4, -b.away + Math.PI / 2, 0);
        flap = Math.sin(t * 30);
        if (!this.flapped) { this.flapped = true; this.sfx.play({ f: 'fx_pigeons', gain: 0.55 }); }
      }
      b.g.position.set(x, y, z);
      for (const w of b.wings) w.piv.rotation.z = w.sx * (flap * 0.9 + (back ? 0.2 : 0));
      for (const e of b.eyes) e.visible = !back;
      for (const s of b.xs) s.visible = !!back;
      for (const l of b.legs) l.visible = back || t >= tu ? true : false;
      if (b.say && back && !b.said) { b.said = true; this.bubbles.push({ text: b.say, cls: 'chat', t0: t, life: 3, obj: b.g, dy: 0.7 }); }
    }
  }
}

// ---------------------------------------------------------------- fire truck
// Sirens, a big vacuum on the roof, the cloud gets sucked up, and off it goes.
class FireTruck {
  constructor(root, ev, sfx) {
    this.dur = 10;
    this.ev = ev;
    this.sfx = sfx;
    const g = (this.g = new THREE.Group());
    part(new THREE.BoxGeometry(2.2, 1.5, 4.6), '#d62d20', g, 0, 1.25, -0.4, true);
    const cab = part(new THREE.BoxGeometry(2.2, 1.8, 1.6), '#d62d20', g, 0, 1.4, 2.3, true);
    part(new THREE.BoxGeometry(2.0, 0.7, 0.05), '#9fd4e8', cab, 0, 0.35, 0.81);           // windscreen
    part(new THREE.BoxGeometry(2.25, 0.18, 6.3), '#ffffff', g, 0, 0.95, 0.4);            // white stripe
    for (const [x, z] of [[-1.1, -2], [1.1, -2], [-1.1, 2.2], [1.1, 2.2]]) {
      const w = part(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), '#222222', g, x, 0.5, z, true);
      w.rotation.z = Math.PI / 2;
    }
    this.lights = [part(new THREE.SphereGeometry(0.18, 10, 8), '#3399ff', g, -0.7, 2.4, 2.3), part(new THREE.SphereGeometry(0.18, 10, 8), '#3399ff', g, 0.7, 2.4, 2.3)];
    // the vacuum: tank on the roof and a hose that swings over to the cloud
    part(new THREE.CylinderGeometry(0.7, 0.7, 3.4, 18), '#f1c40f', g, 0, 2.5, -0.6, true).rotation.x = Math.PI / 2;
    this.hose = new THREE.Group();
    this.hose.position.set(0, 3.1, 0.6);
    const hoseGeo = new THREE.CylinderGeometry(0.22, 0.22, 3, 12);
    hoseGeo.translate(0, 1.5, 0);
    part(hoseGeo, '#555555', this.hose, 0, 0, 0, true);
    part(new THREE.ConeGeometry(0.6, 0.8, 16, 1, true), '#333333', this.hose, 0, 3.3, 0).rotation.x = Math.PI;
    g.add(this.hose);
    root.add(g);
    this.dir = Math.sign(ev.stopX - ev.x0) || 1;
    g.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.bubbles = [];
    this.sucks = [];
    this.puffGeo = new THREE.SphereGeometry(0.25, 8, 6);
    this.root = root;
    sfx.play({ f: 'fx_siren', gain: 0.45 });
  }
  update(t, dt) {
    const e = this.ev, g = this.g;
    let x;
    if (t < 2.8) x = lerp(e.x0, e.stopX, ease(t / 2.8));
    else if (t < 6.3) x = e.stopX;
    else {
      const k = (t - 6.3) / 3.2;
      x = lerp(e.stopX, e.x1, k * k);
      if (Math.abs(x) > HALF + 1) g.scale.setScalar(Math.max(0.01, 1 - (Math.abs(x) - HALF - 1) / 5));
    }
    g.position.set(x, 0, e.lane);
    const blink = Math.sin(t * 18) > 0;
    this.lights[0].material = toon(blink ? '#3399ff' : '#ffffff');
    this.lights[1].material = toon(blink ? '#ffffff' : '#3399ff');
    // hose swings towards the cloud while parked
    const aim = t > 2.8 && t < 6.3 ? ease((t - 2.8) / 0.6) : t >= 6.3 ? 1 - ease((t - 6.3) / 0.5) : 0;
    this.hose.rotation.x = -aim * 1.1;
    this.hose.rotation.y = aim * 0.4 * this.dir;
    if (t > 3 && !this.vac) { this.vac = true; this.sfx.play({ f: 'fx_vacuum', gain: 0.55 }); }
    if (t > 5.75 && !this.siren2) { this.siren2 = true; this.sfx.play({ f: 'fx_siren', gain: 0.45 }); }
    if (t > 2.6 && !this.s1) { this.s1 = true; this.bubbles.push({ text: LINES.fireman[0], cls: 'curse', t0: t, life: 2.2, obj: g, dy: 3.4 }); }
    if (t > 4.6 && !this.s2) { this.s2 = true; this.bubbles.push({ text: LINES.fireman[1 + ((e.seed >>> 3) % 3)], cls: 'chat', t0: t, life: 2, obj: g, dy: 3.4 }); }
    // green puffs streaming into the nozzle
    if (t > 3.1 && t < 5.8 && Math.random() < dt * 25) {
      const m = new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color: '#9ad64f', transparent: true, opacity: 0.8 }));
      m.position.set(e.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 1.5, e.z + (Math.random() - 0.5) * 3);
      this.root.add(m);
      this.sucks.push({ m, t0: t });
    }
    const nozzle = new THREE.Vector3(0, 3.3, 0);
    this.hose.localToWorld(nozzle);
    this.sucks = this.sucks.filter((p) => {
      const k = (t - p.t0) / 0.7;
      p.m.position.lerp(nozzle, Math.min(1, dt * 6));
      p.m.scale.setScalar(Math.max(0.05, 1 - k));
      if (k >= 1) { this.root.remove(p.m); p.m.material.dispose(); return false; }
      return true;
    });
  }
  dispose() { for (const p of this.sucks) { this.root.remove(p.m); p.m.material.dispose(); } }
}

// ---------------------------------------------------------------- nuclear team
// Three people in white suits run in, measure, take notes, and run for their lives.
class Hazmat {
  constructor(root, ev, sfx) {
    this.dur = 9.5;
    this.sfx = sfx;
    const r = rng(ev.seed);
    const from = r() * Math.PI * 2;
    const sx = Math.max(-HALF + 2, Math.min(HALF - 2, ev.x + Math.cos(from) * 18));
    const sz = Math.max(-HALF + 2, Math.min(HALF - 2, ev.z + Math.sin(from) * 18));
    this.team = ['geiger', 'geiger', 'writer'].map((tool, k) => {
      const c = new Character('hazmat', 50 + k, tool);
      root.add(c.root);
      const a = from + (k - 1) * 1.1;
      return { c, tool, st: newState(sx + k * 0.8, sz), home: { x: sx + k * 0.8, z: sz }, post: { x: ev.x + Math.cos(a) * 2.6, z: ev.z + Math.sin(a) * 2.6 }, k };
    });
    this.bubbles = [];
    this.ev = ev;
  }
  update(t, dt) {
    for (const m of this.team) {
      const s = m.st;
      let tx, tz, run = 0;
      if (t < 2.6) { tx = m.post.x; tz = m.post.z; run = 5; }
      else if (t < 6.6) { tx = s.x; tz = s.z; }
      else { tx = m.home.x; tz = m.home.z; run = 7.5; }
      const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
      if (run && d > 0.2) {
        const step = Math.min(d, run * dt);
        s.x += (dx / d) * step; s.z += (dz / d) * step;
        s.rot = Math.atan2(dx, dz);
        s.move = 1; s.walk += dt * run * 3;
        s.pose = t >= 6.6 ? POSE.FLEE : POSE.NORMAL;
      } else {
        s.move = 0;
        if (t >= 2.6 && t < 6.6) {
          s.rot = Math.atan2(this.ev.x - s.x, this.ev.z - s.z);
          s.pose = m.tool === 'writer' ? POSE.WRITE : POSE.MEASURE;
        }
      }
      m.c.apply(s, t);
    }
    if (t > 2.6 && !this.geiger) { this.geiger = true; this.sfx.geiger(4); }
    const say = (at, k, list, cls) => {
      const key = 's' + at;
      if (t > at && !this[key]) {
        this[key] = true;
        this.bubbles.push({ text: list[(this.ev.seed >>> (k * 3)) % list.length], cls, t0: t, life: 2.2, obj: this.team[k].c.root, dy: 2.2 });
      }
    };
    say(3.0, 0, LINES.hazmat, 'chat');
    say(4.2, 1, LINES.hazmat, 'curse');
    say(5.2, 2, LINES.notes, 'chat');
    say(6.4, 0, ['RUN!', 'EVACUATE!', 'Abort! ABORT!'], 'curse');
  }
}

// ---------------------------------------------------------------- heads out of the windows
// Neighbours lean out of their windows, look around, and wonder what on earth that was.
class Windows {
  constructor(root, ev, sfx, camera) {
    this.dur = 9;
    const r = rng(ev.seed);
    // the wall the camera is looking at, so the player sees them
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    const wall = HALF + 4;
    const alongX = Math.abs(f.z) >= Math.abs(f.x);
    const sign = alongX ? Math.sign(f.z) || 1 : Math.sign(f.x) || 1;
    const cam = camera.position;
    const tHit = alongX ? (sign * wall - cam.z) / (f.z || 1e-3) : (sign * wall - cam.x) / (f.x || 1e-3);
    const centre = Math.max(-28, Math.min(28, alongX ? cam.x + f.x * tHit : cam.z + f.z * tHit));
    const extras = ['nightcap', 'curlers', 'foam', 'none', 'none', 'none', 'none', 'none'];
    this.heads = Array.from({ length: 8 }, (_, k) => {
      const along = centre + (k - 3.5) * 3.2 + (r() - 0.5);
      const y = 3.4 * (1 + (k % 3)) + 1.7;
      const g = new THREE.Group();
      const skin = ['#f2c9a0', '#e0ac7e', '#c68a5e', '#f5d6b8', '#8d5a3b'][(r() * 5) | 0];
      part(new THREE.SphereGeometry(0.42, 16, 12), skin, g, 0, 0, 0, true);
      const hair = ['#2b1a10', '#5a3a1e', '#d9a441', '#eeeeee', '#111111'][(r() * 5) | 0];
      part(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), hair, g, 0, 0.02, -0.03);
      for (const sx of [-1, 1]) {
        part(new THREE.SphereGeometry(0.09, 8, 6), '#ffffff', g, sx * 0.15, 0.08, 0.36);
        part(new THREE.SphereGeometry(0.045, 6, 4), '#111111', g, sx * 0.15, 0.08, 0.44);
      }
      part(new THREE.SphereGeometry(0.07, 8, 6), '#5a1a1a', g, 0, -0.18, 0.38).scale.set(1, 1.3, 0.5);   // the "O" mouth
      const extra = extras[(k + (ev.seed & 7)) % extras.length];
      if (extra === 'nightcap') {
        const cap = part(new THREE.ConeGeometry(0.4, 0.9, 12), '#2e86de', g, 0, 0.55, -0.1, true);
        cap.rotation.z = 0.6;
        part(new THREE.SphereGeometry(0.1, 8, 6), '#ffffff', cap, 0, 0.45, 0);
      } else if (extra === 'curlers') {
        for (let c = 0; c < 6; c++) part(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), '#ff7eb6', g, (c - 2.5) * 0.13, 0.4, -0.05).rotation.z = Math.PI / 2;
      } else if (extra === 'foam') {
        part(new THREE.SphereGeometry(0.3, 10, 8), '#ffffff', g, 0, -0.25, 0.18).scale.set(1.2, 0.8, 0.8);   // shaving foam
      }
      // hands on the sill
      for (const sx of [-1, 1]) part(new THREE.SphereGeometry(0.12, 8, 6), skin, g, sx * 0.5, -0.5, 0.2);
      root.add(g);
      const inward = -sign;
      const pos = alongX ? { x: along, z: sign * (wall - 0.1) } : { x: sign * (wall - 0.1), z: along };
      const face = alongX ? (inward > 0 ? 0 : Math.PI) : (inward > 0 ? Math.PI / 2 : -Math.PI / 2);
      return { g, face, pos, y, delay: r() * 1.2, out: 0.6 + r() * 0.4, leave: 7.2 + r() * 1.3, look: r() * 6, inward, alongX,
        line: k % 3 === 0 ? LINES.window[2 + ((ev.seed >>> k) % (LINES.window.length - 2))] : k % 2 ? '?' : '??' };
    });
    this.bubbles = [];
  }
  update(t) {
    for (const h of this.heads) {
      const k = t < h.leave ? ease((t - h.delay) / 0.35) : 1 - ease((t - h.leave) / 0.3);
      const d = k * h.out * h.inward;
      h.g.position.set(h.pos.x + (h.alongX ? 0 : d), h.y, h.pos.z + (h.alongX ? d : 0));
      h.g.visible = k > 0.01;
      h.g.rotation.y = h.face + Math.sin(t * 2 + h.look) * 0.5;   // looking left and right
      if (t > h.delay + 0.4 && !h.said) { h.said = true; this.bubbles.push({ text: h.line, cls: 'chat', t0: t, life: 5.5, obj: h.g, dy: 0.8 }); }
    }
  }
}

const SCENES = { birds: Birds, firetruck: FireTruck, hazmat: Hazmat, windows: Windows };

export class Happenings {
  constructor(scene, sfx) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.sfx = sfx;
    this.list = [];
  }

  spawn(ev, camera) {
    const S = SCENES[ev.kind];
    if (!S) return;
    const group = new THREE.Group();
    this.root.add(group);
    const scene = new S(group, ev, this.sfx, camera);
    this.list.push({ scene, group, t: 0 });
  }

  update(dt) {
    for (const a of this.list) {
      a.t += dt;
      a.scene.update(a.t, dt);
    }
    this.list = this.list.filter((a) => {
      if (a.t < a.scene.dur) return true;
      a.scene.dispose?.();
      this.root.remove(a.group);
      return false;
    });
  }

  // speech bubbles of the actors, in the BubbleLayer format (owner -3 = fixed world point)
  bubbles() {
    const out = [];
    const v = new THREE.Vector3();
    for (const a of this.list) {
      for (const b of a.scene.bubbles) {
        const age = a.t - b.t0;
        if (age > b.life) continue;
        b.obj.getWorldPosition(v);
        out.push([-3, b.text, b.cls, age, v.x, v.y + b.dy, v.z, b.life]);
      }
    }
    return out;
  }

  clear() {
    for (const a of this.list) { a.scene.dispose?.(); this.root.remove(a.group); }
    this.list = [];
  }
}
