// All game audio: artificial or recorded farts/burps, crowd voices, piazza ambience, music.
import pools from './sounds.json';
import voices from './voices.json';
import { renderFart, FART_VOICE } from './synth.js';
import { Music } from './music.js';

const rand = (a, b) => a + Math.random() * (b - a);
const SETTINGS_KEY = 'fartissima.settings.v4';   // v4: music starts very low

export class Sfx {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.synthCache = new Map();
    this.lastPick = {};
    this.active = new Set();
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { /* first run */ }
    this.settings = { mode: 'real', music: 0.15, amb: 0.8, ...saved };
  }

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* private mode */ }
    if (this.music) this.music.volume = this.settings.music;
    if (this.ambBus) this.ambBus.gain.value = 0.35 * this.settings.amb;
  }

  async init(onProgress) {
    if (this.ctx) return;
    const ctx = (this.ctx = new AudioContext());
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(this.comp);
    // Short slap-back reverb: the piazza walls echo every fart back at you.
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeImpulse(1.1);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.22;
    this.verb.connect(verbGain).connect(this.comp);
    this.voiceBus = ctx.createGain();
    this.voiceBus.gain.value = 0.35;   // the crowd reacts, but the farts stay the stars
    this.voiceBus.connect(this.master);
    this.ambBus = ctx.createGain();
    this.ambDuck = ctx.createGain();
    this.ambBus.connect(this.ambDuck).connect(this.comp);
    this.music = new Music(ctx, this.comp);
    this.saveSettings();

    const files = [...new Set([...Object.values(pools), ...Object.values(voices)].flat().map((c) => c.f))];
    let done = 0;
    await Promise.all(files.map(async (f) => {
      const res = await fetch(`sfx/${f}.mp3`);
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(f, buf);
      onProgress?.(++done / files.length);
    }));
  }

  startBackground() {
    if (this.bgStarted) return;
    this.bgStarted = true;
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffers.get('amb_piazza');
    s.loop = true;
    s.connect(this.ambBus);
    s.start();
    this.music.start();
  }

  // The piazza goes quiet for a moment after a big one.
  duck(amount, seconds) {
    if (!this.ctx) return;
    const g = this.ambDuck.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(1 - amount, t, 0.05);
    g.setTargetAtTime(1, t + seconds, 0.8);
  }

  makeImpulse(seconds) {
    const ctx = this.ctx, len = (ctx.sampleRate * seconds) | 0;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const early = (i % 2311 < 3 && t < 0.25) ? 0.5 : 0;
        d[i] = ((Math.random() * 2 - 1) * 0.35 + early) * Math.pow(1 - t, 3.2);
      }
    }
    return b;
  }

  pickFrom(key, near) {
    const pool = pools[key] || voices[key];
    if (!pool?.length) return null;
    let cands = pool;
    if (near && pool.length > 2) {
      // recorded mode: keep to the clips whose pitch fits the food, so beans sound like beans every time
      cands = [...pool].sort((a, b) => Math.abs(Math.log((a.f0 || 100) / near)) - Math.abs(Math.log((b.f0 || 100) / near))).slice(0, 2);
    }
    let c;
    do { c = cands[(Math.random() * cands.length) | 0]; } while (cands.length > 1 && c.f === this.lastPick[key]);
    this.lastPick[key] = c.f;
    return c;
  }

  // Recorded fart for a style and size. Gino's own fart voice (one recorder) comes first,
  // bigger or smaller neighbours next (slowed down or sped up a little), other people last.
  realFart(style, tier, foodId) {
    const near = (FART_VOICE[foodId] || FART_VOICE.default).f0;
    const order = style === 'sbd'
      ? [['gino_fart', 'sbd', Math.min(tier, 2)], ['gino_fart', 'sbd', 1], ['gino_fart', 'sbd', 2]]
      : [['gino_fart', style, tier], ['gino_fart', style, tier - 1], ['gino_fart', style, tier + 1], ['fart', style, tier],
         ['gino_fart', 'dry', tier], ['gino_fart', style, tier - 2], ['gino_fart', 'dry', tier - 1], ['fart', 'dry', tier], ['fart', 'dry', tier - 1]];
    for (const [pool, s, t] of order) {
      if (t < 1 || t > 5) continue;
      const c = this.pickFrom(`${pool}_${s}_${t}`, near);
      if (!c) continue;
      if (style === 'sbd') return { f: c.f, rate: rand(0.95, 1.02), gain: 0.4 + tier * 0.04 };
      const stretch = t < tier ? 0.88 : t > tier ? 1.08 : 1;
      return { f: c.f, rate: rand(0.98, 1.02) * stretch, gain: 0.55 + tier * 0.09 };
    }
    return null;
  }

  // Burps are always real recordings. Gino has one voice (one recorder), so he always sounds like himself.
  burp(tier) {
    for (const [pool, t] of [['gino_burp', tier], ['gino_burp', tier - 1], ['gino_burp', tier + 1], ['burp', tier]]) {
      const c = t >= 1 && t <= 5 && this.pickFrom(`${pool}_${t}`);
      if (c) return { f: c.f, rate: rand(0.97, 1.03) * (t < tier ? 0.9 : 1), gain: 0.55 + tier * 0.09 };
    }
    return null;
  }

  realShart() {
    const c = this.pickFrom('shart');
    return { f: c.f, rate: rand(0.95, 1.02), gain: 1 };
  }

  voice(kind) {
    const c = this.pickFrom(kind);
    return c && { f: c.f };
  }

  synthBuffer(kind, p) {
    const key = kind + JSON.stringify(p);
    let b = this.synthCache.get(key);
    if (!b) {
      const sr = this.ctx.sampleRate;
      const data = renderFart(p, sr);
      b = this.ctx.createBuffer(1, data.length, sr);
      b.copyToChannel(data, 0);
      if (this.synthCache.size > 60) this.synthCache.delete(this.synthCache.keys().next().value);
      this.synthCache.set(key, b);
    }
    return b;
  }

  /**
   * Plays one event. ev forms:
   *   { f, rate, gain, lp }          recorded clip
   *   { s: 'fart', p, gain, lp }  artificial fart
   *   { s: 'voice', f, rate, gain }  crowd voice
   * opts: { speed, pan, dist }
   */
  play(ev, { speed = 1, pan = 0, dist = 1 } = {}) {
    if (!this.ctx || !ev) return null;
    const buf = ev.s === 'fart' ? this.synthBuffer(ev.s, ev.p) : this.buffers.get(ev.f);
    if (!buf) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (ev.rate || 1) * speed;
    const g = ctx.createGain();
    g.gain.value = (ev.gain ?? 1) * dist;
    let node = src;
    if (ev.lp) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = ev.lp;
      node = node.connect(lp);
    }
    if (pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node = node.connect(p);
    }
    node.connect(g);
    g.connect(ev.s === 'voice' ? this.voiceBus : this.master);
    g.connect(this.verb);
    src.start();
    this.active.add(src);
    src.onended = () => this.active.delete(src);
    return src;
  }

  stopAll() {
    for (const s of this.active) { try { s.stop(); } catch { /* already stopped */ } }
    this.active.clear();
  }

  // Crunchy munch: three short filtered noise bites.
  eat() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const len = 0.07, b = ctx.createBuffer(1, (ctx.sampleRate * len) | 0, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = ctx.createBufferSource(); s.buffer = b;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.5;
      s.connect(f).connect(g).connect(this.master);
      s.start(t0 + k * 0.13);
    }
  }

  // Toxic alarm: two rising "whoop"s, so nobody misses a toxic combo.
  alarm() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const t = t0 + k * 0.55;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(1100, t + 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2500;
      o.connect(lp).connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.52);
    }
  }

  // Camera shutter: two quick clicks.
  shutter() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (const [dt, f] of [[0, 3000], [0.06, 1800]]) {
      const b = ctx.createBuffer(1, 400, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const s = ctx.createBufferSource(); s.buffer = b;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5;
      s.connect(bp).connect(g).connect(this.master);
      s.start(t0 + dt);
    }
  }

  // A small bird hitting the cobbles.
  thud() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.16);
  }

  // Geiger counter: dry clicks that get faster and faster.
  geiger(seconds = 4) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const click = ctx.createBuffer(1, 90, ctx.sampleRate), d = click.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    let t = 0;
    while (t < seconds) {
      const rate = 6 + 70 * Math.pow(t / seconds, 2);          // clicks per second
      t += -Math.log(1 - Math.random()) / rate;
      const s = ctx.createBufferSource();
      s.buffer = click;
      const g = ctx.createGain();
      g.gain.value = 0.3;
      s.connect(g).connect(this.master);
      s.start(t0 + t);
    }
  }

  // Glug glug: falling sine blips.
  drink() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + k * 0.18;
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.15);
    }
  }
}
