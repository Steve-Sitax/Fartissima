// Plays back a recorded clip with its own puppet characters.
import * as THREE from 'three';
import { Character, newState } from './characters.js';
import { KINDS } from './game.js';

const lerp = (a, b, k) => a + (b - a) * k;
const lerpWrap = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

function lerpState(A, B, k, out) {
  out.x = lerp(A[0], B[0], k);
  out.z = lerp(A[1], B[1], k);
  out.rot = lerpWrap(A[2], B[2], k);
  out.walk = lerpWrap(A[3], B[3], k);
  out.move = lerp(A[4], B[4], k);
  out.pose = A[5];
  out.hair = lerp(A[6], B[6], k);
  out.green = lerp(A[7], B[7], k);
  out.red = lerp(A[8], B[8], k);
  out.stain = A[9];
  return out;
}

export class Replay {
  // onEvent(ev, speed): plays a recorded sound or effect
  constructor(scene, sfx, onEvent) {
    this.scene = scene;
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.clip = null;
  }

  start(clip) {
    this.group.clear();
    this.clip = clip;
    this.chars = [new Character('hero', 1, clip.hero || 'fat'), ...clip.roster.map(([k, seed]) => new Character(KINDS[k], seed))];
    for (const c of this.chars) this.group.add(c.root);
    this.states = this.chars.map(() => newState());
    this.group.visible = true;
    this.speed = this.speed || 1;
    this.restart();
  }

  restart() {
    this.sfx.stopAll();
    this.t = 0;
    this.soundIdx = 0;
    this.ended = false;
    this.camSpin = Math.random() < 0.5 ? 1 : -1;
  }

  get duration() { return (this.clip.frames.length - 1) * this.clip.dt; }

  stop() {
    this.sfx.stopAll();
    this.group.visible = false;
    this.group.clear();
    this.clip = null;
  }

  update(dt) {
    const clip = this.clip;
    this.t = Math.min(this.duration, this.t + dt * this.speed);
    if (this.t >= this.duration) this.ended = true;
    while (this.soundIdx < clip.sounds.length && clip.sounds[this.soundIdx].t <= this.t) {
      this.onEvent(clip.sounds[this.soundIdx++].ev, this.speed);
    }
    const fi = this.t / clip.dt, a = Math.floor(fi), k = fi - a;
    const A = clip.frames[a], B = clip.frames[Math.min(a + 1, clip.frames.length - 1)];
    lerpState(A.p, B.p, k, this.states[0]);
    A.n.forEach((arr, i) => lerpState(arr, B.n[i] || arr, k, this.states[i + 1]));
    return {
      states: this.states,
      clouds: A.c,
      foods: A.f,
      bubbles: A.b.map((b) => { const c = b.slice(); c[3] += k * clip.dt; return c; }),
    };
  }
}
