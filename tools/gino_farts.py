# One consistent fart voice for Gino: Jixolros's "realpoot" recordings (CC0), cut, measured and sorted.
import json, os, subprocess, urllib.request, numpy as np
SR = 44100
src = {x["id"]: x for x in json.load(open("meta_poot.json")) if x["user"] == "Jixolros"}
src.update({x["id"]: x for x in json.load(open("meta_pack.json"))})
OUT = "../public/sfx"
def decode(fn):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", fn, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
def f0_med(y):
    W = int(0.06 * SR); fs = []; thr = np.abs(y).max() * 0.15
    for i in range(0, len(y) - W, W // 2):
        fr = y[i:i + W]
        if np.abs(fr).max() < thr: continue
        ac = np.fft.irfft(np.abs(np.fft.rfft(fr * np.hanning(W), 2 * W)) ** 2)[:W]; ac /= ac[0] + 1e-12
        lo, hi = SR // 900, SR // 25; k = lo + np.argmax(ac[lo:hi])
        fs.append((SR / k, ac[k]))
    if not fs: return 0, 0
    fs = np.array(fs); v = fs[fs[:, 1] > 0.45]
    return (float(np.median(v[:, 0])) if len(v) else 0), float(np.mean(fs[:, 1] > 0.45))
def crackle(y):
    n = 512; S = np.array([np.abs(np.fft.rfft(y[i:i + n] * np.hanning(n))) for i in range(0, len(y) - n, 256)])
    if len(S) < 3: return 0
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    peaks = (flux[1:-1] > flux[:-2]) & (flux[1:-1] > flux[2:]) & (flux[1:-1] > np.median(flux) * 3)
    return float(peaks.sum() / (len(y) / SR))
clips = []
for i, m in sorted(src.items()):
    fn = f"raw/poot_{i}.mp3"
    if not os.path.exists(fn): urllib.request.urlretrieve(m["mp3"], fn)
    x = decode(fn)
    hop = 441; n = len(x) // hop
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, 1)) + 1e-9)
    act = db > max(db.max() - 30, -52)
    segs, st, last = [], None, None
    for k, a in enumerate(act):
        if a:
            if st is None: st = k
            elif k - last > 35: segs.append((st, last)); st = k
            last = k
    if st is not None: segs.append((st, last))
    for j, (a, b) in enumerate(segs):
        a0, b0 = max(0, a * hop - 900), min(len(x), (b + 1) * hop + 5000)
        y = x[a0:b0].copy(); d = len(y) / SR
        if d < 0.2 or d > 8: continue
        fo = int(0.06 * SR); y[-fo:] *= np.linspace(1, 0, fo); y[:200] *= np.linspace(0, 1, 200)
        y = y / np.abs(y).max() * 0.89
        f0, voiced = f0_med(y)
        t = m["title"].lower()
        cr = crackle(y)
        style = "sbd" if "sneaky" in t else "wet" if ("wet" in t or cr > 9) else "squeak" if (f0 > 260 and voiced > 0.5) else "dry"
        tier = 1 + sum(d >= c for c in (0.45, 0.8, 1.4, 2.3))
        name = f"gfart_{i}_{j}"
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-q:a", "4", f"{OUT}/{name}.mp3"],
                       input=(y * 32767).astype(np.int16).tobytes(), check=True)
        clips.append({"f": name, "d": round(d, 2), "f0": round(f0), "voiced": round(voiced, 2), "crackle": round(cr, 1), "style": style, "tier": tier, "title": m["title"], "id": i})
json.dump(clips, open("gino_farts.json", "w"), indent=1)
for c in sorted(clips, key=lambda c: (c["style"], c["tier"], c["d"])):
    print(c["style"].ljust(6), c["tier"], c["d"], "f0", c["f0"], "v", c["voiced"], "cr", c["crackle"], "|", c["f"], c["title"])
print(len(clips))
