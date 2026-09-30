// Artificial farts, modelled on the recorded ones (see tools/analyze.py).
// What the recordings show:
//  - a fart is a train of "flap slaps": a sharp spike, then a short damped ring (20-300 per second)
//  - the pulse rate rises a little at the start, then falls; at the end the flap slows down ("pbbt-t-t")
//  - wet farts: irregular pulses, bubble pops (short rising chirps), crackle and gaps (sputters)
//  - squeaks: fast narrow pulses (250-900 Hz), almost a tone, with wobble
// Burps stay real recordings: an artificial burp never sounded human enough.
// Pure DSP, no Web Audio: the same code runs in the browser and in Node (for tools/synth_test.mjs).

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() - 1.5) * 1.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Sputter gate: on/off with random gaps. Heavy sputter = real silences between bursts.
function gate(n, sr, amount, r) {
  const g = new Float32Array(n).fill(1);
  if (amount <= 0) return g;
  let i = (0.08 + r() * 0.15) * sr;
  while (i < n * 0.9) {
    const on = (0.05 + r() * 0.4 * (1.15 - amount)) * sr;
    const off = (0.02 + r() * 0.2 * amount * amount) * sr;
    i += on;
    const depth = Math.min(1, 0.55 + r() * 0.3 + amount * 0.4);
    const fade = Math.min(off * 0.3, 0.012 * sr);
    for (let k = 0; k < off && i + k < n; k++) {
      const edge = Math.min(1, k / fade, (off - k) / fade);
      g[(i + k) | 0] = 1 - depth * edge;
    }
    i += off;
  }
  return g;
}

// Envelope like the recordings: quick attack, swell to a peak around 30 %, long sagging decay.
function envelope(n, sr, attack, release, swell, r) {
  const e = new Float32Array(n);
  const a = attack * sr, rl = release * sr, peak = 0.2 + r() * 0.25, sag = 0.35 + r() * 0.35, wob = 1 + r() * 3;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    let v = i < a ? Math.pow(i / a, 0.6) : 1;
    v *= x < peak ? 0.7 + 0.3 * (x / peak) : 1 - sag * Math.pow((x - peak) / (1 - peak), 1.2);
    if (i > n - rl) v *= Math.pow((n - i) / rl, 1.4);
    v *= 1 - swell * 0.25 + swell * 0.25 * Math.sin(x * Math.PI * wob + 0.3);
    e[i] = v;
  }
  return e;
}

function finish(out, sr, peak = 0.9) {
  // DC / rumble removal (one-pole high-pass at ~35 Hz) and soft clip
  const k = Math.exp(-2 * Math.PI * 35 / sr);
  let px = 0, py = 0, mx = 1e-9;
  for (let i = 0; i < out.length; i++) {
    const y = k * (py + out[i] - px);
    px = out[i]; py = y;
    out[i] = y;
  }
  for (let i = 0; i < out.length; i++) mx = Math.max(mx, Math.abs(out[i]));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh((out[i] / mx) * 1.1) / Math.tanh(1.1) * peak;
  return out;
}

/**
 * p: { dur, f0, f0End, rise, jitter, shimmer, reso, reso2, damp, noise, wet, sputter, tail, squeak, seed }
 */
export function renderFart(p, sr = 44100) {
  const r = rng(p.seed);
  const tailLen = p.tail * Math.min(0.45, 0.25 + p.dur * 0.05);
  const n = Math.ceil((p.dur + 0.15) * sr);
  const out = new Float32Array(n);
  const body = Math.ceil(p.dur * sr);
  const env = envelope(body, sr, 0.012 + r() * 0.02, Math.min(0.12, p.dur * 0.25), 0.4, r);
  const g = gate(body, sr, p.sputter, r);

  // pulse rate contour
  const f0At = (x) => {
    const peakX = 0.15;
    let f = x < peakX ? p.f0 * (1 + p.rise * (x / peakX)) : p.f0 * (1 + p.rise) + (p.f0End - p.f0 * (1 + p.rise)) * ((x - peakX) / (1 - peakX));
    if (x > 1 - tailLen) {
      // the flap runs out of pressure: pulses spread out
      const q = (x - (1 - tailLen)) / tailLen;
      f *= Math.pow(0.18, q * q);
    }
    if (p.squeak) f *= 1 + 0.02 * Math.sin(x * p.dur * 2 * Math.PI * (5 + r() * 0.1));
    return Math.max(12, f);
  };

  // one flap slap: spike + damped ring at two resonances
  const irLen = Math.ceil(p.damp * 6 * sr);
  const spikeW = (p.squeak ? 0.00015 : 0.0005) * sr;
  const addPulse = (at, amp, reso, reso2, sharp) => {
    const w1 = 2 * Math.PI * reso / sr, w2 = 2 * Math.PI * reso2 / sr, d = 1 / (p.damp * sr), d2 = d * 1.8;
    for (let k = 0; k < irLen; k++) {
      const i = at + k;
      if (i >= n) break;
      // the slap: a sharp one-sided spike, then a small ring of the flesh
      let v = -sharp * Math.exp(-k / spikeW) + Math.exp(-k * d) * Math.sin(w1 * k) * 0.42 + Math.exp(-k * d2) * Math.sin(w2 * k + 1) * 0.22;
      out[i] += v * amp;
    }
  };

  let t = 0, phase = 0;
  while (t < body) {
    const x = t / body;
    const f = f0At(x) * (1 + p.jitter * gauss(r));
    const period = sr / f;
    const amp = env[t | 0] * g[t | 0] * clamp(1 + p.shimmer * gauss(r), 0.2, 1.8);
    // pulses in the tail get stronger individually (each slap is audible)
    const tailBoost = x > 1 - tailLen ? 1.25 : 1;
    if (amp > 0.02) {
      addPulse(t | 0, amp * tailBoost,
        p.reso * (1 + 0.12 * gauss(r)) * (p.squeak ? 1 : 1 - 0.25 * x),
        p.reso2 * (1 + 0.1 * gauss(r)),
        p.squeak ? 0.35 : 1.1 + p.wet * 0.5);
      // turbulent air released at every opening
      if (p.noise > 0) {
        const nl = Math.min(period * 0.7, 0.02 * sr) | 0;
        for (let k = 0; k < nl && t + k < n; k++) out[(t + k) | 0] += (r() * 2 - 1) * p.noise * amp * Math.exp(-k / (nl * 0.3)) * 0.3;
      }
    }
    phase += period;
    t = phase;
  }

  // wet: bubble pops and crackle
  if (p.wet > 0) {
    const pops = Math.floor(p.wet * 45 * p.dur);
    for (let b = 0; b < pops; b++) {
      const at = Math.floor(r() * body);
      const e = env[at] * g[at];
      if (e < 0.05) continue;
      const f0 = 250 + r() * 1300, len = (0.004 + r() * 0.012) * sr, amp = (0.25 + r() * 0.5) * e * p.wet;
      let ph = 0;
      for (let k = 0; k < len && at + k < n; k++) {
        const f = f0 * (1 + 0.8 * (k / len));
        ph += 2 * Math.PI * f / sr;
        out[at + k] += Math.sin(ph) * amp * Math.exp(-k / (len * 0.35));
      }
    }
    const clicks = Math.floor(p.wet * 120 * p.dur);
    for (let c = 0; c < clicks; c++) {
      const at = Math.floor(r() * body);
      const e = env[at] * g[at] * p.wet;
      for (let k = 0; k < 24 && at + k < n; k++) out[at + k] += (r() * 2 - 1) * e * 0.5 * Math.exp(-k / 5);
    }
  }
  // constant hiss of escaping air (mostly for silent-but-deadly)
  if (p.hiss) {
    let lp = 0, bp = 0;
    for (let i = 0; i < body; i++) {
      const w = r() * 2 - 1;
      lp += 0.12 * (w - lp);
      bp = w - lp;
      out[i] += bp * p.hiss * env[i] * g[i];
    }
  }
  return finish(out, sr, 0.92);
}

// ---------- food voices: every food has its own fart character ----------
// len: duration multiplier; the rest are renderFart params before size scaling.
export const FART_VOICE = {
  beans:   { f0: 88,  f0End: 62,  rise: 0.15, jitter: 0.05, shimmer: 0.18, reso: 330, reso2: 720, damp: 0.006, noise: 0.15, wet: 0.04, sputter: 0.15, tail: 0.7, len: 1.1 },
  chili:   { f0: 125, f0End: 80,  rise: 0.2,  jitter: 0.14, shimmer: 0.3,  reso: 420, reso2: 950, damp: 0.004, noise: 0.35, wet: 0.55, sputter: 0.35, tail: 0.35, len: 1.0 },
  broc:    { f0: 68,  f0End: 48,  rise: 0.08, jitter: 0.07, shimmer: 0.22, reso: 240, reso2: 560, damp: 0.009, noise: 0.2,  wet: 0.08, sputter: 0.25, tail: 0.6, len: 1.25 },
  egg:     { f0: 34,  f0End: 24,  rise: 0,    jitter: 0.2,  shimmer: 0.4,  reso: 160, reso2: 400, damp: 0.004, noise: 0.5,  wet: 0,    sputter: 0.1,  tail: 0.2, len: 1.3, hiss: 0.9 },
  cheese:  { f0: 390, f0End: 520, rise: 0.1,  jitter: 0.02, shimmer: 0.1,  reso: 820, reso2: 1600, damp: 0.0025, noise: 0.08, wet: 0, sputter: 0.2, tail: 0.25, len: 0.9, squeak: 1 },
  garlic:  { f0: 105, f0End: 75,  rise: 0.12, jitter: 0.06, shimmer: 0.2,  reso: 360, reso2: 780, damp: 0.006, noise: 0.2,  wet: 0.05, sputter: 0.2,  tail: 0.6, len: 0.9 },
  onion:   { f0: 115, f0End: 85,  rise: 0.1,  jitter: 0.07, shimmer: 0.2,  reso: 380, reso2: 820, damp: 0.0055, noise: 0.22, wet: 0.05, sputter: 0.25, tail: 0.5, len: 0.9 },
  pizza:   { f0: 100, f0End: 70,  rise: 0.15, jitter: 0.06, shimmer: 0.2,  reso: 350, reso2: 760, damp: 0.006, noise: 0.18, wet: 0.1,  sputter: 0.2,  tail: 0.6, len: 1.0 },
  kebab:   { f0: 110, f0End: 72,  rise: 0.12, jitter: 0.12, shimmer: 0.3,  reso: 390, reso2: 900, damp: 0.0045, noise: 0.3, wet: 0.45, sputter: 0.4,  tail: 0.4, len: 1.1 },
  burrito: { f0: 95,  f0End: 60,  rise: 0.1,  jitter: 0.16, shimmer: 0.35, reso: 380, reso2: 1000, damp: 0.004, noise: 0.35, wet: 0.8, sputter: 0.5,  tail: 0.45, len: 1.3 },
  hotdog:  { f0: 120, f0End: 90,  rise: 0.18, jitter: 0.05, shimmer: 0.15, reso: 400, reso2: 850, damp: 0.005, noise: 0.15, wet: 0.03, sputter: 0.1,  tail: 0.6, len: 0.9 },
  peach:   { f0: 150, f0End: 100, rise: 0.2,  jitter: 0.15, shimmer: 0.3,  reso: 480, reso2: 1100, damp: 0.0035, noise: 0.35, wet: 0.65, sputter: 0.45, tail: 0.3, len: 0.9 },
  gelato:  { f0: 300, f0End: 380, rise: 0.15, jitter: 0.03, shimmer: 0.12, reso: 700, reso2: 1400, damp: 0.003, noise: 0.1, wet: 0.15, sputter: 0.3, tail: 0.3, len: 0.85, squeak: 1 },
  salad:   { f0: 480, f0End: 420, rise: 0.05, jitter: 0.03, shimmer: 0.15, reso: 950, reso2: 1900, damp: 0.002, noise: 0.25, wet: 0, sputter: 0.3, tail: 0.3, len: 0.6, squeak: 1 },
  banana:  { f0: 140, f0End: 110, rise: 0.1,  jitter: 0.05, shimmer: 0.15, reso: 420, reso2: 900, damp: 0.005, noise: 0.2,  wet: 0,    sputter: 0.1,  tail: 0.5, len: 0.7 },
  beer:    { f0: 92,  f0End: 64,  rise: 0.12, jitter: 0.1,  shimmer: 0.28, reso: 320, reso2: 800, damp: 0.006, noise: 0.25, wet: 0.35, sputter: 0.3,  tail: 0.55, len: 1.15 },
  milk:    { f0: 118, f0End: 76,  rise: 0.15, jitter: 0.14, shimmer: 0.32, reso: 400, reso2: 980, damp: 0.0045, noise: 0.3, wet: 0.6, sputter: 0.45, tail: 0.4, len: 1.1 },
  default: { f0: 110, f0End: 78,  rise: 0.12, jitter: 0.06, shimmer: 0.2,  reso: 360, reso2: 780, damp: 0.0055, noise: 0.18, wet: 0.05, sputter: 0.2, tail: 0.6, len: 0.9 },
};

const TIER_DUR = [0.32, 0.65, 1.1, 1.8, 2.9];
const TIER_PITCH = [1.18, 1.07, 1, 0.92, 0.84];

// Same food + same size = same kind of fart. The seed only adds small human variation.
export function fartParams(foodId, tier, seed) {
  const v = FART_VOICE[foodId] || FART_VOICE.default;
  const r = rng(seed);
  const vary = (x, amt) => x * (1 + (r() * 2 - 1) * amt);
  const k = TIER_PITCH[tier - 1];
  return {
    seed,
    dur: vary(TIER_DUR[tier - 1] * v.len, 0.12),
    f0: vary(v.f0 * k, 0.06),
    f0End: vary(v.f0End * k, 0.08),
    rise: v.rise,
    jitter: v.jitter,
    shimmer: v.shimmer,
    reso: vary(v.reso, 0.05),
    reso2: vary(v.reso2, 0.05),
    damp: v.damp * (tier >= 4 ? 1.2 : 1),
    noise: v.noise,
    wet: Math.min(1, v.wet * (0.8 + tier * 0.1)),
    sputter: Math.min(0.9, v.sputter + (tier >= 4 ? 0.12 : 0)),
    tail: v.tail,
    squeak: v.squeak || 0,
    hiss: v.hiss || 0,
  };
}

export function sbdParams(tier, seed) {
  return { ...fartParams('egg', tier, seed) };
}

export function shartParams(seed) {
  return { ...fartParams('burrito', 5, seed), wet: 1, sputter: 0.7, f0: 70, f0End: 40, dur: 2.6, noise: 0.5, tail: 0.3 };
}
