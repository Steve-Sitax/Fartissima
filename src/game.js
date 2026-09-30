// The live game: the hero, the pedestrians, food, clouds, scoring and replay recording.
import * as THREE from 'three';
import { Character, POSE, newState } from './characters.js';
import { makeCloud, updateCloud, smellRadius, cloudSnap } from './clouds.js';
import { spawnFood, MAX_FOOD } from './food.js';
import { FOODS, FART_NAMES, BURP_NAMES, LINES, pick, heroById } from './data.js';
import { clampToWalkable, randomSpot, HALF } from './world.js';
import { fartParams, shartParams } from './synth.js';

export const KINDS = ['hero', 'man', 'fan', 'woman', 'lady'];
export const ROUND_TIME = 180;
export const SNAP_DT = 1 / 20;
const PRE_FRAMES = 40;           // 2 s of footage before the blast
const MAX_FRAMES = PRE_FRAMES + 16 / SNAP_DT;   // a combo replay lasts at most 16 s
export const CHAIN_WINDOW = 2.5;   // seconds between blasts that still count as one combo
const BURP_FACTOR = 0.8;    // burps always score a bit less than farts
const TOXIC = 15000;        // a combo this big sets off a toxic event
const LADY_CHASE = 5;      // seconds the fancy lady chases you
const DAZE = 2.5;          // seconds you see stars after her selfie stick
export const chainMult = (n) => 1 + 0.5 * (Math.min(n, 7) - 1);
const TIER_AT = [10, 24, 42, 65]; // gas used -> size tier 1..5
const BASE = [10, 25, 50, 90, 150];
const NPC_COUNT = 32;
// places where people stop to chat: café tables, the fountain rim, lamp posts, doorways
const SPOTS = [[-22, -30], [22, 30], [0, -8.4], [8.4, 1], [-7.5, 4.5], [-14, 16], [16, -16], [-29, 6], [29, -6], [4, 24], [-6, -22], [24, 8]];

const r2 = (v) => Math.round(v * 100) / 100;
// Who gets hit: the blast zone (hair, faces) is a wide cone out of the butt or mouth; the hearing circle is bigger.
export const BLAST_COS = 0.15;   // cone edge: about 80 degrees each side
export function blastRadius(kind, tier, style) {
  if (kind === 'burp') return 1.5 + tier * 0.8;
  return style === 'sbd' ? 0 : 1.6 + tier * 0.9;
}
export function hearRadius(kind, tier, style) {
  if (kind === 'burp') return 7 + tier * 5;
  return style === 'sbd' ? 2 : (6 + tier * 5) * (style === 'squeak' ? 0.85 : style === 'wet' ? 1.1 : 1);
}
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k);
export const tierOf = (amount) => 1 + TIER_AT.filter((t) => amount >= t).length;
export const stateArr = (s) => [r2(s.x), r2(s.z), r2(s.rot), r2(s.walk % (Math.PI * 2)), r2(s.move), s.pose, r2(s.hair), r2(s.green), r2(s.red), s.stain];

export class Game {
  constructor(scene, sfx, ui) {
    this.scene = scene;
    this.sfx = sfx;
    this.ui = ui;
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  // heroId: boy | man | fat | old (see HEROES in data.js). The hero object is still called gino inside.
  reset(heroId = this.hero?.id || 'fat') {
    this.hero = heroById(heroId);
    this.lines = { ...LINES, ...this.hero.lines };
    this.group.clear();
    this.time = 0;
    this.timeLeft = ROUND_TIME;
    this.over = false;
    this.sharting = false;
    const gino = new Character('hero', 1, this.hero.id);
    this.group.add(gino.root);
    this.gino = { ch: gino, s: newState(0, 12), poseT: 0 };
    this.gino.s.rot = Math.PI;
    // conversation groups
    this.groups = SPOTS.map(([x, z]) => {
      const cap = 3 + ((Math.random() * 3) | 0);
      return { x, z, cap, slots: new Array(cap).fill(-1), speaker: -1, speakT: 0 };
    });
    this.npcs = [];
    for (let i = 0; i < (this.npcCount || NPC_COUNT); i++) {
      // one fancy lady with a selfie stick walks among them
      const kind = i === 5 ? 'lady' : i % 20 < 9 ? 'woman' : i % 2 ? 'fan' : 'man';
      const seed = 100 + i * 37 + ((Math.random() * 1000) | 0);
      const ch = new Character(kind, seed);
      this.group.add(ch.root);
      const p = randomSpot();
      const n = { ch, kind, seed, s: newState(p.x, p.z), target: randomSpot(), speed: 1.1 + Math.random() * 0.8,
        mode: 'walk', modeT: 0, pending: null, hairT: 0, fleeFrom: null, reactPose: 0, group: null, slot: -1, chaseCd: 0 };
      this.npcs.push(n);
      // most people start out standing in a group, chatting
      if (kind !== 'lady' && Math.random() < 0.65 && this.joinGroup(n, i)) {
        const sp = this.slotPos(n.group, n.slot);
        n.s.x = sp.x; n.s.z = sp.z;
        n.mode = 'chat'; n.modeT = 5 + Math.random() * 30;
      }
    }
    this.roster = this.npcs.map((n) => [KINDS.indexOf(n.kind), n.seed]);
    this.clouds = [];
    this.foods = Array.from({ length: 10 }, () => spawnFood(this.gino.s));
    this.bubbles = [];
    this.emissions = [];
    this.gas = { fart: 15, burp: 10 };
    this.shart = 0;
    this.lastFood = null;
    this.style = 'dry';
    this.fartFood = 'default';
    this.stench = 1;
    this.burpStink = 0;
    this.stinkName = '';
    this.charge = null;
    this.prev = { fart: false, burp: false };
    this.best = null;          // { score, name, clip }: the best combo, farts and burps together
    this.chain = null;
    this.chains = [];
    this.shartClip = null;
    this.ring = [];
    this.recording = [];
    this.snapAcc = 0;
    this.shake = 0;
    this.foodTimer = 0;
    this.warned = false;
    this.emptyCd = 0;
    this.fleeVoiceCd = 0;
    this.dazeT = 0;
  }

  // ---------- main tick ----------
  update(dt, input, attract = false) {
    this.time += dt;
    if (!attract && !this.over) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.endRound('time'); }
    }
    if (this.sharting) {
      this.gino.s.pose = POSE.SHART;
      this.gino.s.move = 0;
      this.shartT -= dt;
      if (this.shartT <= 0 && !this.over) this.endRound('shart');
    } else if (!attract && !this.over) {
      this.updatePlayer(dt, input);
    } else {
      this.gino.s.move = Math.max(0, this.gino.s.move - dt * 4);
      if (this.gino.poseT > 0) this.gino.poseT -= dt; else this.gino.s.pose = POSE.NORMAL;
    }
    this.updateGroups(dt);
    this.updateNpcs(dt);
    for (const c of this.clouds) {
      if (!c.suck || this.time < c.suck.at) continue;
      // the fire truck's vacuum: the cloud is pulled to the hose and gone in two seconds
      if (!c.suck.started) { c.suck.started = true; c.life = Math.min(c.life, c.age + 2.2); }
      c.x += (c.suck.x - c.x) * Math.min(1, dt * 2.5);
      c.z += (c.suck.z - c.z) * Math.min(1, dt * 2.5);
      c.y += (3.4 - c.y) * Math.min(1, dt * 2);
      c.rMax *= 1 - Math.min(0.9, dt * 0.9);
    }
    this.clouds = this.clouds.filter((c) => updateCloud(c, dt));
    for (const b of this.bubbles) b.age += dt;
    this.bubbles = this.bubbles.filter((b) => b.age < b.life);
    for (const em of this.emissions) {
      if (em.done) continue;
      em.age += dt;
      const cloudAlive = em.cloud && this.clouds.includes(em.cloud);
      if ((em.age > 3.5 && !cloudAlive) || em.age > 25) this.finalize(em);
    }
    this.emissions = this.emissions.filter((e) => !e.done);
    for (const c of this.chains) {
      if (!c.done && !c.toxic && this.chainScore(c) >= TOXIC) this.toxicEvent(c);
      if (!c.done && c.ems.every((e) => e.done) && this.time - c.lastAt > CHAIN_WINDOW) this.finalizeChain(c);
    }
    this.chains = this.chains.filter((c) => !c.done);
    if (!attract) {
      this.foodTimer -= dt;
      if (this.foodTimer <= 0 && this.foods.length < MAX_FOOD) {
        this.foods.push(spawnFood(this.gino.s));
        this.foodTimer = 2.5;
      }
      this.shart = Math.max(0, this.shart - dt * 0.5);
      this.gas.fart = Math.min(this.hero.tank, this.gas.fart + dt * 0.8);
      this.gas.burp = Math.min(this.hero.tank, this.gas.burp + dt * 0.3);
      this.burpStink = Math.max(0, this.burpStink - dt * 0.03);
      this.fleeVoiceCd -= dt;
      if (this.shart > 70 && !this.warned) { this.warned = true; this.ui.toast('💩 Your belly gurgles... careful with the next fart!', 'bad'); }
      if (this.shart < 55) this.warned = false;
    }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    this.record(dt);
  }

  // ---------- Gino ----------
  updatePlayer(dt, inp) {
    const g = this.gino, s = g.s;
    if (this.dazeT > 0) {
      // whacked by the selfie stick: seeing stars, no walking, no blasting
      this.dazeT -= dt;
      s.pose = POSE.DAZED;
      s.move = Math.max(0, s.move - dt * 5);
      this.charge = null;
      this.prev.fart = inp.fart; this.prev.burp = inp.burp;
      if (this.dazeT <= 0) s.pose = POSE.NORMAL;
      return;
    }
    const fx = Math.sin(inp.yaw), fz = Math.cos(inp.yaw);
    // keys give -1/0/1, the phone thumb stick gives anything in between
    const mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0) + (inp.ax || 0), mz = (inp.fwd ? 1 : 0) - (inp.back ? 1 : 0) + (inp.ay || 0);
    let vx = fx * mz - fz * mx, vz = fz * mz + fx * mx;
    const len = Math.hypot(vx, vz);
    const speed = (this.charge ? this.hero.speed * 0.4 : inp.run ? this.hero.run : this.hero.speed) * Math.min(1, len);
    if (this.charge) {
      // aiming: the mouse turns Gino so the blast goes where the camera looks
      // (fart: back towards the target, burp: face towards it)
      s.rot = lerpAngle(s.rot, inp.yaw + (this.charge.kind === 'fart' ? Math.PI : 0), dt * 14);
    }
    if (len > 0.05) {
      vx /= len; vz /= len;
      if (!this.charge) s.rot = lerpAngle(s.rot, Math.atan2(vx, vz), dt * 10);
      s.x += vx * speed * dt; s.z += vz * speed * dt;
      s.move = Math.min(1, s.move + dt * 5);
      s.walk += dt * speed * 2.4;
    } else {
      s.move = Math.max(0, s.move - dt * 5);
    }
    clampToWalkable(s, 0.8);

    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      if (Math.hypot(f.x - s.x, f.z - s.z) < 1.3) { this.eat(FOODS[f.i]); this.foods.splice(i, 1); }
    }

    if (g.poseT > 0) g.poseT -= dt;
    else s.pose = POSE.NORMAL;

    this.emptyCd -= dt;
    if (!this.charge) {
      if (inp.fart && !this.prev.fart) this.startCharge('fart');
      else if (inp.burp && !this.prev.burp) this.startCharge('burp');
    } else {
      const c = this.charge;
      const held = c.kind === 'fart' ? inp.fart : inp.burp;
      s.pose = c.kind === 'fart' ? POSE.FART : POSE.BURP;
      if (held) {
        const avail = this.gas[c.kind];
        c.amount = Math.min(avail, c.amount + dt * 50);
        if (c.amount >= avail - 0.01) c.full += dt;
        if (c.kind === 'fart' && c.full > 1) {
          // straining at full pressure is how accidents happen
          this.shart = Math.min(100, this.shart + dt * 12 / this.hero.control);
          if (!c.warned) { c.warned = true; this.say(-1, pick(this.lines.strain), 'hero'); }
        }
      } else {
        this.release();
      }
    }
    this.prev.fart = inp.fart; this.prev.burp = inp.burp;
  }

  // Eating never makes you shart by itself. It only loads the gun: the risk comes when you fart.
  eat(food) {
    this.gas.fart += food.fart;
    this.gas.burp += food.burp;
    for (const k of ['fart', 'burp']) {
      if (this.gas[k] > this.hero.tank) { this.shart += (this.gas[k] - this.hero.tank) * 0.3 / this.hero.control; this.gas[k] = this.hero.tank; }
    }
    this.shart = Math.min(100, Math.max(0, this.shart + (food.shart > 0 ? food.shart / this.hero.control : food.shart)));
    if (food.style) { this.style = food.style; this.stench = food.stench; this.fartFood = food.id; }
    if (food.burpStink) { this.burpStink = food.burpStink; this.stinkName = food.id === 'garlic' ? 'Garlic' : 'Onion'; }
    this.lastFood = food;
    this.gino.s.pose = POSE.EAT; this.gino.poseT = 0.5;
    this.emit({ synth: food.drink ? 'drink' : 'eat' });
    if (Math.random() < 0.35) this.say(-1, pick(this.lines.eat), 'hero');
    this.ui.ate(food);
  }

  startCharge(kind) {
    if (this.gas[kind] < 3) {
      if (this.emptyCd <= 0) { this.say(-1, pick(this.lines.empty), 'hero'); this.emptyCd = 1.5; }
      return;
    }
    this.charge = { kind, amount: Math.min(this.gas[kind], 4), full: 0, warned: false };
  }

  release() {
    const { kind, amount } = this.charge;
    this.charge = null;
    this.gas[kind] = Math.max(0, this.gas[kind] - amount);
    const tier = tierOf(amount);
    if (kind === 'fart') this.fart(tier); else this.burp(tier);
  }

  chargeInfo() {
    if (!this.charge) return null;
    const { kind, amount } = this.charge;
    const tier = tierOf(amount), style = kind === 'fart' ? this.style : null;
    const blastR = blastRadius(kind, tier, style) * this.hero.power, hearR = hearRadius(kind, tier, style) * this.hero.power;
    // count who would be hit right now, to help aiming
    const g = this.gino.s, sign = kind === 'fart' ? -1 : 1;
    const fx = Math.sin(g.rot) * sign, fz = Math.cos(g.rot) * sign;
    let inBlast = 0, inHear = 0;
    for (const n of this.npcs) {
      const dx = n.s.x - g.x, dz = n.s.z - g.z, d = Math.hypot(dx, dz) || 0.01;
      if (d < blastR && (d < 1.6 || (dx * fx + dz * fz) / d > BLAST_COS)) inBlast++;
      else if (d < hearR) inHear++;
    }
    return { kind, amount, avail: this.gas[kind], tier, blastR, hearR, inBlast, inHear,
      name: kind === 'fart' ? FART_NAMES[this.style][tier - 1] : this.burpName(tier) };
  }

  burpName(tier) { return (this.burpStink > 0.3 ? this.stinkName + ' ' : '') + BURP_NAMES[tier - 1]; }

  fart(tier) {
    const g = this.gino, s = g.s, style = this.style;
    this.shart = Math.min(100, this.shart + (style === 'wet' ? 4 : 1.5) * tier / this.hero.control);
    const m = this.shart;
    const chance = m > 55 ? ((m - 55) / 45) ** 2 * (0.35 + tier * 0.13) : 0;
    if (m >= 100 || Math.random() < chance) { this.doShart(); return; }

    s.pose = POSE.FART; g.poseT = 0.35 + tier * 0.15;
    const sbd = style === 'sbd';
    this.shake = sbd ? 0 : tier * 0.07;
    const back = { x: -Math.sin(s.rot), z: -Math.cos(s.rot) };
    const ch = g.ch, st = this.stench * this.hero.stench * (sbd ? 1.3 : 1);
    const cloud = makeCloud({ x: s.x + back.x * ch.buttZ, y: ch.buttY, z: s.z + back.z * ch.buttZ, tier, stench: st, color: sbd ? 3 : 0, dirX: back.x, dirZ: back.z });
    this.clouds.push(cloud);
    const name = FART_NAMES[style][tier - 1];
    const mult = { dry: 1, wet: 1.25, squeak: 1.1, sbd: 0.5 }[style];
    const em = this.newEmission('fart', name, tier, BASE[tier - 1] * mult, cloud);
    this.addToChain(em);
    const seed = (Math.random() * 1e9) | 0;
    const ev = this.sfx.settings.mode === 'real'
      ? this.sfx.realFart(style, tier, this.fartFood)
      : { s: 'fart', p: fartParams(this.fartFood, tier, seed), gain: sbd ? 0.35 : 0.62 + tier * 0.08, lp: sbd ? 1100 : 0 };
    this.emit(this.voiced(ev));
    if (!sbd) this.emit({ fx: 'wind', kind: 'fart', x: s.x + back.x * ch.buttZ, y: ch.buttY, z: s.z + back.z * ch.buttZ, dx: back.x, dz: back.z, tier });
    if (tier >= 4 && !sbd) this.ui.duck();
    const pw = this.hero.power;
    this.broadcast(em, hearRadius('fart', tier, style) * pw, blastRadius('fart', tier, style) * pw, -1);
    if (tier >= 3 && Math.random() < 0.4) setTimeout(() => this.say(-1, pick(this.lines.hero), 'hero'), 700);
  }

  burp(tier) {
    const g = this.gino, s = g.s;
    s.pose = POSE.BURP; g.poseT = 0.35 + tier * 0.15;
    this.shake = tier * 0.05;
    const fwd = { x: Math.sin(s.rot), z: Math.cos(s.rot) };
    let cloud = null;
    const stink = this.burpStink > 0.3;
    if (stink) {
      cloud = makeCloud({ x: s.x + fwd.x * 1, y: g.ch.mouthY, z: s.z + fwd.z * 1, tier, stench: this.burpStink * 0.8 * this.hero.stench, color: 1, dirX: fwd.x, dirZ: fwd.z });
      this.clouds.push(cloud);
    }
    const em = this.newEmission('burp', this.burpName(tier), tier, BASE[tier - 1] * (stink ? 1.2 : 1), cloud);
    this.addToChain(em);
    this.emit(this.voiced(this.sfx.burp(tier)));
    this.emit({ fx: 'wind', kind: 'burp', x: s.x + fwd.x * g.ch.mouthZ, y: g.ch.mouthY, z: s.z + fwd.z * g.ch.mouthZ, dx: fwd.x, dz: fwd.z, tier });
    if (tier >= 4) this.ui.duck();
    this.broadcast(em, hearRadius('burp', tier) * this.hero.power, blastRadius('burp', tier) * this.hero.power, 1);
  }

  doShart() {
    if (this.sharting) return;
    this.charge = null;
    this.sharting = true;
    this.shartT = 3.8;
    const s = this.gino.s;
    s.stain = 1;
    s.pose = POSE.SHART;
    this.shake = 0.6;
    const back = { x: -Math.sin(s.rot), z: -Math.cos(s.rot) };
    const ch = this.gino.ch;
    const cloud = makeCloud({ x: s.x + back.x * ch.buttZ, y: ch.buttY, z: s.z + back.z * ch.buttZ, tier: 5, stench: 2, color: 2 });
    this.clouds.push(cloud);
    const em = this.newEmission('shart', 'SHART', 5, 0, cloud);
    this.shartClip = em.clip;
    this.emit(this.voiced(this.sfx.settings.mode === 'real' ? this.sfx.realShart() : { s: 'fart', p: shartParams((Math.random() * 1e9) | 0), gain: 1 }));
    this.emit({ fx: 'wind', kind: 'shart', x: s.x + back.x * ch.buttZ, y: ch.buttY, z: s.z + back.z * ch.buttZ, dx: back.x, dz: back.z, tier: 4 });
    this.broadcast(em, 30, 3, -1);
    this.say(-1, pick(this.lines.shart), 'hero');
    this.ui.toast('💩 SHART! 💩', 'bad');
  }

  // ---------- scoring ----------
  newEmission(kind, name, tier, base, cloud) {
    const em = { kind, name, tier, base: Math.round(base), points: 0, people: 0, age: 0, cloud, done: false, reacted: new Set(), voices: 0, fans: 0, crowd: false };
    em.clip = { kind, name, score: 0, dt: SNAP_DT, roster: this.roster, hero: this.hero.id, frames: this.ring.slice(), sounds: [], t0: this.ring.length * SNAP_DT };
    this.recording.push(em.clip);
    if (cloud) cloud.em = em;
    this.emissions.push(em);
    return em;
  }

  score(em) { return Math.round((em.base + em.points) * (1 + Math.min(3, em.people * 0.15)) * (em.kind === 'burp' ? BURP_FACTOR : 1)); }

  addPoints(em, pts, npcIdx) {
    if (em.done || em.kind === 'shart') return;
    const n = this.npcs[npcIdx];
    const lady = n.kind === 'lady';
    pts = Math.round(pts * (lady ? 2 : 1));   // the fancy lady is worth double
    em.points += pts;
    em.people++;
    this.bubbles.push({ owner: -2, text: `+${pts}${lady ? ' x2' : ''}`, cls: 'pts', age: 0, life: 1.9, x: n.s.x, y: n.ch.height + 0.9, z: n.s.z });
  }

  finalize(em) {
    em.done = true;
    if (em.kind === 'shart') em.clip.stopAt = Math.min(MAX_FRAMES, em.clip.frames.length + 20);
  }

  // ---------- combos ----------
  // Blasts fired within CHAIN_WINDOW of each other form one combo: the scores add up and get
  // multiplied (x1.5 for two, x2 for three ...). Farts and burps mix freely.
  addToChain(em) {
    const c = this.chain;
    if (c && !c.done && this.time - c.lastAt <= CHAIN_WINDOW) {
      // same combo: one replay for the whole combo
      this.recording = this.recording.filter((x) => x !== em.clip);
      em.clip = c.clip;
    } else {
      this.chain = { ems: [], clip: em.clip, lastAt: 0, done: false };
      this.chains.push(this.chain);
    }
    const ch = this.chain;
    ch.ems.push(em);
    ch.lastAt = this.time;
    em.chain = ch;
    // five farts in a row inside one combo: the fart train leaves the station
    ch.fartRun = em.kind === 'fart' ? (ch.fartRun || 0) + 1 : 0;
    if (ch.fartRun === 5 || ch.fartRun === 10) {
      this.emit({ fx: 'train', n: ch.fartRun });
      this.emit({ f: 'fx_whistle', rate: 1, gain: 0.7 });
    }
    const n = ch.ems.length;
    if (n >= 2) {
      // said right away, over the hero's head: you see the combo grow while you do it
      this.bubbles.push({ owner: -2, text: `${this.chainTitle(ch)} x${n}!`, cls: 'combo', age: 0, life: 2.2, x: this.gino.s.x, y: this.gino.ch.height + 1.2, z: this.gino.s.z });
    }
  }

  chainTitle(c) {
    const n = c.ems.length;
    if (n === 1) return c.ems[0].name;
    const farts = c.ems.filter((e) => e.kind === 'fart').length, burps = n - farts;
    if (n >= 6) return 'LEGENDARY BUTT PIG';
    if (n >= 4) return 'BUTT PIG';
    if (!burps) return 'Chain Farter';
    if (!farts) return this.hero.id === 'boy' ? 'Burping Brat' : 'Belching Boomer';
    return 'Two-Way Tornado';
  }

  chainScore(c) {
    const n = c.ems.length;
    const mixed = c.ems.some((e) => e.kind === 'fart') && c.ems.some((e) => e.kind === 'burp');
    return Math.round(c.ems.reduce((a, e) => a + this.score(e), 0) * chainMult(n) * (mixed ? 1.2 : 1));
  }

  finalizeChain(c) {
    c.done = true;
    const sc = this.chainScore(c), n = c.ems.length;
    const name = n > 1 ? `${this.chainTitle(c)} x${n}` : c.ems[0].name;
    const clip = c.clip;
    clip.stopAt = Math.min(MAX_FRAMES, clip.frames.length + 20);
    clip.score = sc;
    clip.name = name;
    if (!this.best || sc > this.best.score) {
      this.best = { score: sc, name, clip };
      this.ui.toast(`NEW BEST! ${name} ${sc.toLocaleString('en-US')}`, 'gold');
    } else {
      this.ui.toast(`${name}: ${sc.toLocaleString('en-US')} (best ${this.best.score.toLocaleString('en-US')})`);
    }
  }

  // The combo being built right now, for the HUD.
  liveCombo() {
    const c = this.chains.filter((x) => !x.done).at(-1);
    if (!c) return null;
    return { name: c.ems.length > 1 ? `${this.chainTitle(c)} x${c.ems.length}` : c.ems[0].name, score: this.chainScore(c), n: c.ems.length,
      window: Math.max(0, CHAIN_WINDOW - (this.time - c.lastAt)), toxic: !!c.toxic,
      people: c.ems.reduce((a, e) => a + e.people, 0) };
  }

  // ---------- toxic combo events ----------
  // A combo past TOXIC points: one of these shows up (two past twice that). Each is over in 10 s.
  toxicEvent(c) {
    c.toxic = true;
    const alive = c.ems.map((e) => e.cloud).filter((cl) => cl && this.clouds.includes(cl));
    const target = alive.at(-1) || this.gino.s;
    const kinds = ['birds', 'firetruck', 'hazmat', 'windows'].sort(() => Math.random() - 0.5);
    const count = this.chainScore(c) >= TOXIC * 2 ? 2 : 1;
    this.ui.toast('☢️ TOXIC COMBO! ☢️', 'gold');
    for (const kind of kinds.slice(0, count)) {
      const ev = { fx: 'toxic', kind, x: target.x, z: target.z, seed: (Math.random() * 1e9) | 0 };
      if (kind === 'firetruck') {
        // the truck comes in from the side away from the hero, stops next to the cloud, then leaves
        const side = this.gino.s.x > target.x ? -1 : 1;
        ev.lane = Math.max(-HALF + 3, Math.min(HALF - 3, target.z + 2.6));
        ev.x0 = side * (HALF - 1);
        ev.stopX = Math.max(-HALF + 4, Math.min(HALF - 4, target.x + side * 3));
        ev.x1 = -side * (HALF + 8);
        for (const cl of alive) cl.suck = { at: this.time + 3.2, x: ev.stopX, z: ev.lane };
      }
      this.emit(ev);
    }
  }

  // The fancy lady caught you: dazed, gas gone, and the combo is over.
  ladyHit(n, i) {
    const g = this.gino.s;
    this.emit({ f: 'fx_slap', rate: 1, gain: 1, x: g.x, z: g.z });
    this.dazeT = DAZE;
    this.gas.fart = 0;
    this.gas.burp = 0;
    this.charge = null;
    this.shake = 0.8;
    if (this.chain) this.chain.lastAt = -99;
    this.say(-1, pick(this.lines.dazed), 'hero');
    this.bubbles.push({ owner: -3, text: '💫 ⭐ 💫', cls: 'stars', age: 0, life: DAZE, x: g.x, y: this.gino.ch.height + 0.2, z: g.z });
    this.say(i, pick(this.lines.ladyHit), 'curse');
    this.ui.toast('💫 Whacked by the selfie stick! Gas gone!', 'bad');
    n.mode = 'walk';
    n.target = randomSpot();
    n.chaseCd = 15;
  }

  // Tell everyone nearby that something just happened. dirSign -1 = blast goes out the back.
  broadcast(em, hearR, blastR, dirSign) {
    const s = this.gino.s;
    const fx = Math.sin(s.rot) * dirSign, fz = Math.cos(s.rot) * dirSign;
    this.npcs.forEach((n, i) => {
      const dx = n.s.x - s.x, dz = n.s.z - s.z, d = Math.hypot(dx, dz) || 0.01;
      const inBlast = d < blastR && (d < 1.6 || (dx * fx + dz * fz) / d > BLAST_COS);
      let type = null, delay = 0.05;
      const female = n.kind === 'woman' || n.kind === 'lady';
      if (inBlast) type = female ? 'hair' : n.kind === 'fan' ? 'fanClose' : 'blast';
      else if (d < hearR) {
        delay = 0.15 + d / 40 + Math.random() * 0.35;
        if (n.kind === 'fan') type = 'fan';
        else if (female) type = Math.random() < 0.8 ? 'womanMeh' : null;
        else type = Math.random() < 0.75 ? 'meh' : null;
      }
      if (type && (!n.pending || inBlast)) n.pending = { type, at: this.time + delay, em };
    });
  }

  // A crowd voice at a pedestrian's spot. Women get the same voices pitched up a little.
  voice(kind, n, em) {
    const v = this.sfx.voice(kind);
    if (!v) return;
    const woman = n.kind === 'woman';
    this.emit({ s: 'voice', f: v.f, rate: woman ? 1.12 + Math.random() * 0.12 : 0.9 + Math.random() * 0.12, gain: 0.9, x: n.s.x, z: n.s.z });
    if (em) em.voices++;
  }

  react(n, i, type, em) {
    if (em.reacted.has(i)) return;
    em.reacted.add(i);
    const t = em.tier, s = n.s;
    const burp = em.kind === 'burp';
    let pose = POSE.SHOCK, dur = 1.6, text = '', cls = '', pts = 0, voice = null;
    switch (type) {
      case 'fan': pose = POSE.THUMBS; dur = 2.4; text = pick(em.chain?.ems.length > 1 ? this.lines.fanCombo : burp ? this.lines.fanBurp : this.lines.fan); cls = 'fan'; pts = 20 + 12 * t; voice = 'ooh'; em.fans++; break;
      case 'fanClose': pose = POSE.THUMBS; dur = 2.8; text = pick(this.lines.fanClose); cls = 'fan'; pts = 35 + 18 * t; voice = 'ooh'; em.fans++; break;
      case 'meh': pose = POSE.SHOCK; dur = 1.3; text = pick(this.lines.meh); pts = 5 + 3 * t; voice = 'gasp'; break;
      case 'blast': pose = POSE.SHOCK; dur = 1.8; text = pick(this.lines.blast); pts = 15 + 6 * t; s.green = 0.6; voice = 'eww'; break;
      case 'womanMeh': pose = POSE.CURSE; dur = 1.4; text = pick(this.lines.womanMeh); pts = 6 + 3 * t; voice = 'eww'; break;
      case 'hair':
        pose = POSE.CURSE; dur = 2.8; text = pick(this.lines.curse); cls = 'curse'; pts = 60 + 20 * t; voice = 'gasp';
        s.hair = 1; n.hairT = 9; s.red = 1;
        break;
    }
    if (n.kind === 'lady' && type === 'hair' && em.tier >= 3 && em.kind !== 'shart' && n.chaseCd <= 0) {
      // a hard one right next to her: the selfie stick goes up and she comes for you
      this.leaveGroup(n);
      n.mode = 'chase'; n.modeT = LADY_CHASE;
      s.pose = POSE.CHASE;
      this.say(i, pick(this.lines.ladyAngry), 'curse');
      if (em.voices < 3) this.voice('gasp', n, em);
      this.addPoints(em, pts, i);
      return;
    }
    if (n.mode !== 'flee' || type === 'hair') {
      n.mode = 'react'; n.modeT = dur; n.reactPose = pose;
    }
    this.say(i, text, cls);
    // a few single voices, then the crowd takes over
    if (em.voices < 3) this.voice(voice, n, em);
    else if (!em.crowd && em.reacted.size >= 5) {
      em.crowd = true;
      this.emit({ s: 'voice', f: this.sfx.voice(em.fans >= 3 ? 'crowd_ooh' : 'crowd_gasp').f, rate: 1, gain: 0.8, x: n.s.x, z: n.s.z });
    }
    this.addPoints(em, pts, i);
  }

  say(owner, text, cls = '') {
    this.bubbles = this.bubbles.filter((b) => b.owner !== owner || b.cls === 'pts');
    this.bubbles.push({ owner, text, cls, age: 0, life: 3 });
  }

  // ---------- conversation groups ----------
  joinGroup(n, i) {
    const free = this.groups.filter((g) => g.slots.includes(-1));
    if (!free.length) return false;
    // prefer groups that already have people: crowds attract crowds
    free.sort((a, b) => b.slots.filter((x) => x >= 0).length - a.slots.filter((x) => x >= 0).length + (Math.random() - 0.5) * 3);
    const g = free[0];
    n.group = g;
    n.slot = g.slots.indexOf(-1);
    g.slots[n.slot] = i;
    return true;
  }

  leaveGroup(n) {
    if (!n.group) return;
    n.group.slots[n.slot] = -1;
    n.group = null;
    n.slot = -1;
  }

  slotPos(g, k) {
    const a = (k / g.cap) * Math.PI * 2 + g.x * 0.1, r = 0.75 + g.cap * 0.14;
    return { x: g.x + Math.sin(a) * r, z: g.z + Math.cos(a) * r };
  }

  updateGroups(dt) {
    for (const g of this.groups) {
      g.speakT -= dt;
      if (g.speakT > 0) continue;
      const here = g.slots.filter((i) => i >= 0 && this.npcs[i].mode === 'chat');
      g.speakT = 2 + Math.random() * 3;
      if (here.length < 2) { g.speaker = -1; continue; }
      g.speaker = pick(here);
      if (Math.random() < 0.35) this.say(g.speaker, pick(this.lines.chat), 'chat');
    }
  }

  // ---------- pedestrians ----------
  updateNpcs(dt) {
    const gs = this.gino.s;
    this.npcs.forEach((n, i) => {
      const s = n.s;
      s.green = Math.max(0, s.green - dt * 0.2);
      s.red = Math.max(0, s.red - dt * 0.25);
      if (n.hairT > 0) n.hairT -= dt; else s.hair = Math.max(0, s.hair - dt * 0.3);
      if (n.chaseCd > 0) n.chaseCd -= dt;
      if (n.pending && this.time >= n.pending.at) {
        const p = n.pending; n.pending = null;
        this.react(n, i, p.type, p.em);
      }
      // smell check: the strongest cloud you are standing in
      let worst = null, worstK = 0;
      for (const c of this.clouds) {
        if (c.strength < 0.1) continue;
        const d = Math.hypot(s.x - c.x, s.z - c.z), R = smellRadius(c);
        if (d < R && c.strength * (1 - d / R) + 0.01 > worstK) { worst = c; worstK = c.strength * (1 - d / R) + 0.01; }
      }
      if (worst && n.mode !== 'chase') {   // rage beats stench: a chasing lady ignores the cloud
        if (n.mode !== 'flee') {
          n.mode = 'flee';
          this.leaveGroup(n);
          if (Math.random() < 0.6) this.say(i, pick(this.lines.flee));
          if (this.fleeVoiceCd <= 0) { this.fleeVoiceCd = 0.35; this.voice(Math.random() < 0.15 ? 'sniff' : 'eww', n, null); }
        }
        n.fleeFrom = worst;
        s.green = 1;
        if (!worst.counted.has(i)) {
          worst.counted.add(i);
          const em = worst.em;
          if (em && !em.done) this.addPoints(em, 15 + 10 * em.tier * (worst.rMax / 5), i);
        }
      }

      let vx = 0, vz = 0, speed = 0;
      switch (n.mode) {
        case 'flee': {
          const c = n.fleeFrom;
          const dx = s.x - c.x, dz = s.z - c.z, d = Math.hypot(dx, dz) || 0.01;
          vx = dx / d; vz = dz / d; speed = 4.6;
          s.pose = POSE.FLEE;
          if (!this.clouds.includes(c) || d > smellRadius(c) + 2.5) {
            n.mode = 'walk'; s.pose = POSE.NORMAL;
            n.target = randomSpot();
          }
          break;
        }
        case 'react': {
          n.modeT -= dt;
          s.pose = n.reactPose;
          s.rot = lerpAngle(s.rot, Math.atan2(gs.x - s.x, gs.z - s.z), dt * 8);
          if (n.modeT <= 0) {
            s.pose = POSE.NORMAL;
            if (n.group) { n.mode = 'toChat'; } else n.mode = 'walk';
          }
          break;
        }
        case 'idle': {
          n.modeT -= dt;
          s.pose = n.kind === 'lady' ? POSE.SELFIE : POSE.NORMAL;
          if (n.modeT <= 0) this.nextPlan(n, i);
          break;
        }
        case 'chase': {
          // the fancy lady, selfie stick up, straight at the hero
          n.modeT -= dt;
          s.pose = POSE.CHASE;
          const dx = gs.x - s.x, dz = gs.z - s.z, d = Math.hypot(dx, dz) || 0.01;
          vx = dx / d; vz = dz / d; speed = 5.3;
          if (d < 1.55 && this.dazeT <= 0 && !this.sharting && !this.over) this.ladyHit(n, i);
          else if (n.modeT <= 0) {
            this.say(i, pick(this.lines.ladyGiveUp), 'curse');
            n.mode = 'walk'; n.target = randomSpot(); n.chaseCd = 10;
          }
          break;
        }
        case 'toChat': {
          s.pose = POSE.NORMAL;
          const sp = this.slotPos(n.group, n.slot);
          const dx = sp.x - s.x, dz = sp.z - s.z, d = Math.hypot(dx, dz);
          if (d < 0.3) { n.mode = 'chat'; n.modeT = 12 + Math.random() * 30; } else { vx = dx / d; vz = dz / d; speed = Math.min(n.speed, d * 3 + 0.3); }
          break;
        }
        case 'chat': {
          const g = n.group;
          n.modeT -= dt;
          s.rot = lerpAngle(s.rot, Math.atan2(g.x - s.x, g.z - s.z), dt * 4);
          s.pose = g.speaker === i ? POSE.TALK : POSE.NORMAL;
          if (n.modeT <= 0) { this.leaveGroup(n); n.mode = 'walk'; n.target = randomSpot(); }
          break;
        }
        default: {
          s.pose = POSE.NORMAL;
          const dx = n.target.x - s.x, dz = n.target.z - s.z, d = Math.hypot(dx, dz);
          if (d < 1) this.nextPlan(n, i);
          else { vx = dx / d; vz = dz / d; speed = n.speed; }
        }
      }
      // steer around clouds they can see coming
      if (n.mode === 'walk' || n.mode === 'toChat') {
        for (const c of this.clouds) {
          if (c.strength < 0.1) continue;
          const dx = s.x - c.x, dz = s.z - c.z, d = Math.hypot(dx, dz) || 0.01, R = smellRadius(c) + 3;
          if (d < R) { const k = ((R - d) / R) * 2.5; vx += (dx / d) * k; vz += (dz / d) * k; }
        }
        const l = Math.hypot(vx, vz);
        if (l > 1) { vx /= l; vz /= l; }
      }
      if (speed > 0 && (vx || vz)) {
        s.x += vx * speed * dt; s.z += vz * speed * dt;
        if (n.mode !== 'react') s.rot = lerpAngle(s.rot, Math.atan2(vx, vz), dt * 8);
        s.move = Math.min(1, s.move + dt * 5);
        s.walk += dt * speed * 3.2;
      } else s.move = Math.max(0, s.move - dt * 5);
      // personal space: Gino is wide
      const dx = s.x - gs.x, dz = s.z - gs.z, d = Math.hypot(dx, dz);
      if (d < 1.3 && d > 0) { s.x = gs.x + (dx / d) * 1.3; s.z = gs.z + (dz / d) * 1.3; }
      for (let j = i + 1; j < this.npcs.length; j++) {
        const o = this.npcs[j].s, ex = s.x - o.x, ez = s.z - o.z, e = Math.hypot(ex, ez);
        if (e < 0.6 && e > 0) { const k = (0.6 - e) / 2; s.x += (ex / e) * k; s.z += (ez / e) * k; o.x -= (ex / e) * k; o.z -= (ez / e) * k; }
      }
      clampToWalkable(s, 0.4);
    });
  }

  // What does a pedestrian do next? Join a chat, stand around, or stroll on.
  nextPlan(n, i) {
    const r = Math.random();
    if (n.kind === 'lady') {
      // she never chats: she strolls and stops for selfies
      if (r < 0.55) {
        n.mode = 'idle'; n.modeT = 2.5 + Math.random() * 3;
        if (Math.random() < 0.5) this.say(i, pick(this.lines.selfie), 'chat');
      } else { n.mode = 'walk'; n.target = randomSpot(); }
      return;
    }
    if (r < 0.5 && this.joinGroup(n, i)) n.mode = 'toChat';
    else if (r < 0.7) { n.mode = 'idle'; n.modeT = 1 + Math.random() * 4; }
    else { n.mode = 'walk'; n.target = randomSpot(); }
  }

  // Same sound, the hero's own pitch: little Luca squeaks, Nonno rumbles.
  voiced(ev) {
    return ev && { ...ev, rate: (ev.rate || 1) * this.hero.pitch };
  }

  // ---------- events and recording ----------
  // Every sound and effect goes through here, so replays get them too.
  emit(ev) {
    if (!ev) return;
    this.ui.event(ev);
    for (const clip of this.recording) clip.sounds.push({ t: clip.frames.length * SNAP_DT, ev });
  }

  frame() {
    return {
      p: stateArr(this.gino.s),
      n: this.npcs.map((n) => stateArr(n.s)),
      c: this.clouds.map((c) => cloudSnap(c).map(r2)),
      f: this.foods.map((f) => [r2(f.x), r2(f.z), f.i]),
      b: this.bubbles.map((b) => [b.owner, b.text, b.cls, r2(b.age), r2(b.x || 0), r2(b.y || 0), r2(b.z || 0), b.life]),
    };
  }

  record(dt) {
    this.snapAcc += dt;
    while (this.snapAcc >= SNAP_DT) {
      this.snapAcc -= SNAP_DT;
      const f = this.frame();
      this.ring.push(f);
      if (this.ring.length > PRE_FRAMES) this.ring.shift();
      for (const clip of this.recording) clip.frames.push(f);
      this.recording = this.recording.filter((c) => c.frames.length < (c.stopAt ?? MAX_FRAMES));
    }
  }

  endRound(reason) {
    this.over = true;
    this.charge = null;
    for (const em of this.emissions) if (!em.done) this.finalize(em);
    for (const c of this.chains) if (!c.done) this.finalizeChain(c);
    this.ui.ended(reason);
  }
}
