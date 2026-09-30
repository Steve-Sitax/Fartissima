// Soft, calm piazza music, made on the fly: plucked guitar arpeggios (Karplus-Strong),
// a warm pad, a bass and now and then a mandolin-tremolo melody. Nothing to download, no licence.

const BPM = 76;
const BEAT = 60 / BPM;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 8-bar loop in F major: F Dm Bb C | F Am Bb C
const CHORDS = [[53, 'M'], [50, 'm'], [46, 'M'], [48, 'M'], [53, 'M'], [45, 'm'], [46, 'M'], [48, 'M']];
const ARP = [12, 19, 'T24', 19, 24, 19, 'T24', 19]; // T = third
const MELODY = [
  [[72, 2], [69, 2]], [[74, 3], [72, 1]], [[70, 2], [74, 2]], [[72, 4]],
  [[77, 2], [76, 1], [74, 1]], [[72, 2], [69, 2]], [[70, 2], [67, 2]], [[67, 2], [64, 2]],
];

export class Music {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.2;
    this.out.connect(dest);
    this.cache = new Map();
    this.timer = null;
    this.bar = 0;
  }

  // Karplus-Strong plucked string, rendered once per note.
  pluck(midi, bright = 0.5) {
    const key = midi * 10 + Math.round(bright * 9);
    if (this.cache.has(key)) return this.cache.get(key);
    const sr = this.ctx.sampleRate, len = Math.floor(sr * 2.2);
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / mtof(midi)));
    const ring = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp += bright * ((Math.random() * 2 - 1) - lp); ring[i] = lp; }
    let idx = 0;
    const decay = 0.9965 - (midi > 72 ? 0.002 : 0);
    for (let i = 0; i < len; i++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      const v = (a + b) * 0.5 * decay;
      ring[idx] = v;
      d[i] = a;
      idx = (idx + 1) % N;
    }
    this.cache.set(key, buf);
    return buf;
  }

  note(midi, when, gain, bright = 0.5) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.pluck(midi, bright);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(this.out);
    s.start(when);
  }

  pad(notes, when, dur) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 650;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.03, when + 1.2);
    g.gain.setValueAtTime(0.03, when + dur - 1);
    g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.4);
    f.connect(g).connect(this.out);
    for (const m of notes) for (const det of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      o.connect(f);
      o.start(when); o.stop(when + dur + 0.5);
    }
  }

  scheduleBar(t0) {
    const i = this.bar % 8, [root, q] = CHORDS[i];
    const third = root + (q === 'M' ? 4 : 3);
    // guitar arpeggio in eighths
    ARP.forEach((step, k) => {
      const m = typeof step === 'string' ? third + 24 : root + step;
      this.note(m, t0 + k * BEAT / 2 + Math.random() * 0.012, 0.11 + Math.random() * 0.03, 0.45);
    });
    // bass on 1 and 3
    this.note(root - 12 < 36 ? root : root - 12, t0, 0.2, 0.25);
    this.note(root - 12 + 7 < 36 ? root + 7 : root - 12 + 7, t0 + BEAT * 2, 0.13, 0.25);
    this.pad([root + 12, third + 12, root + 19], t0, BEAT * 4);
    // melody every other time round the loop, as mandolin tremolo
    if (Math.floor(this.bar / 8) % 2 === 1) {
      let b = 0;
      for (const [m, beats] of MELODY[i]) {
        const reps = Math.floor(beats * 4);
        for (let r = 0; r < reps; r++) {
          const fade = 1 - (r / reps) * 0.5;
          this.note(m, t0 + (b + r / 4) * BEAT, (0.05 + Math.random() * 0.02) * fade, 0.7);
        }
        b += beats;
      }
    }
    this.bar++;
  }

  start() {
    if (this.timer) return;
    let next = this.ctx.currentTime + 0.2;
    const tick = () => {
      while (next < this.ctx.currentTime + 0.6) { this.scheduleBar(next); next += BEAT * 4; }
    };
    tick();
    this.timer = setInterval(tick, 150);
  }

  stop() { clearInterval(this.timer); this.timer = null; }

  // 100 % is still soft background music; the farts must always win
  set volume(v) { this.out.gain.setTargetAtTime(0.2 * v, this.ctx.currentTime, 0.2); }
}
