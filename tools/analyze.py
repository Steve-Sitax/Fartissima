# Measures every game clip: pitch (pulse rate), voicing, loudness shape, sputters, brightness, wet crackle.
import json, subprocess, numpy as np
SR = 22050
def decode(fn):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", fn, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def f0_track(x, fmin=25, fmax=900, win=0.06, hop=0.01):
    W, H = int(win * SR), int(hop * SR)
    out = []
    for i in range(0, len(x) - W, H):
        fr = x[i:i + W] * np.hanning(W)
        e = np.sum(fr ** 2)
        if e < 1e-4: out.append((0, 0, e)); continue
        ac = np.fft.irfft(np.abs(np.fft.rfft(fr, 2 * W)) ** 2)[:W]
        ac /= ac[0] + 1e-12
        lo, hi = int(SR / fmax), min(int(SR / fmin), W - 1)
        k = lo + np.argmax(ac[lo:hi])
        out.append((SR / k, ac[k], e))
    return np.array(out)

d = json.load(open("features.json"))
pools = json.load(open("../src/sounds.json"))
pool_of = {c["f"]: k for k, v in pools.items() for c in v}
res = []
for c in d:
    if c["name"] not in pool_of: continue
    x = decode(f"../public/sfx/{c['name']}.mp3")
    tr = f0_track(x)
    voiced = tr[(tr[:, 1] > 0.45) & (tr[:, 2] > tr[:, 2].max() * 0.03)]
    H = int(0.01 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(H) / H, "same"))[::H]
    envn = env / (env.max() + 1e-9)
    act = envn > 0.08
    # sputters: dips inside the active part
    a0, a1 = np.argmax(act), len(act) - np.argmax(act[::-1])
    inner = envn[a0:a1]
    dips = int(np.sum((inner[1:] < 0.2) & (inner[:-1] >= 0.2)))
    peak_t = (np.argmax(envn) - a0) / max(1, a1 - a0)
    # spectral flux onsets per second (wet crackle)
    n = 512; frames = [np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))) for i in range(0, len(x) - n, 256)]
    S = np.array(frames); flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    onsets = int(np.sum((flux[1:-1] > flux[:-2]) & (flux[1:-1] > flux[2:]) & (flux[1:-1] > np.median(flux) * 3)))
    fr = np.fft.rfftfreq(n, 1 / SR); P = (S ** 2).sum(0)
    lowr = float(P[fr < 300].sum() / P.sum())
    res.append({"name": c["name"], "pool": pool_of[c["name"]], "dur": c["dur"],
        "f0_med": float(np.median(voiced[:, 0])) if len(voiced) else 0, "f0_lo": float(np.percentile(voiced[:, 0], 10)) if len(voiced) else 0,
        "f0_hi": float(np.percentile(voiced[:, 0], 90)) if len(voiced) else 0,
        "f0_slope": float(np.polyfit(np.arange(len(voiced)), voiced[:, 0], 1)[0] * 100) if len(voiced) > 3 else 0,
        "voicing": float(len(voiced) / max(1, np.sum(tr[:, 2] > tr[:, 2].max() * 0.03))), "clarity": float(np.median(voiced[:, 1])) if len(voiced) else 0,
        "dips_per_s": dips / c["dur"], "peak_pos": float(peak_t), "onsets_per_s": onsets / c["dur"], "centroid": c["cen"], "low_ratio": lowr})
json.dump(res, open("analysis.json", "w"), indent=1)
import collections
g = collections.defaultdict(list)
for r in res:
    key = r["pool"].rsplit("_", 1)[0] if r["pool"] != "shart" else "shart"
    g[key].append(r)
keys = ["dur", "f0_med", "f0_lo", "f0_hi", "f0_slope", "voicing", "clarity", "dips_per_s", "peak_pos", "onsets_per_s", "centroid", "low_ratio"]
print("group      n  " + " ".join(f"{k[:9]:>9}" for k in keys))
for k, v in sorted(g.items()):
    print(f"{k:10} {len(v):2} " + " ".join(f"{np.median([r[q] for r in v]):9.2f}" for q in keys))
