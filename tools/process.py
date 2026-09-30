# Splits raw CC0 clips into single sounds, trims, normalises, measures, encodes to public/sfx.
import json, subprocess, os, numpy as np
SR = 44100
OUT = "../public/sfx"
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

def decode(fn):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", fn, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def segments(x, gap):
    hop = int(SR * 0.01)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n*hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    th = max(db.max() - 24, -45)
    act = db > th
    segs, start, last = [], None, None
    for i, a in enumerate(act):
        if a:
            if start is None: start = i
            elif i - last > gap / 0.01:
                segs.append((start, last)); start = i
            last = i
    if start is not None: segs.append((start, last))
    return [(s * hop, (e + 1) * hop) for s, e in segs]

def features(y):
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y)), n=1 << int(np.ceil(np.log2(len(y))))))
    fr = np.fft.rfftfreq((len(spec) - 1) * 2, 1 / SR)
    p = spec ** 2
    cen = float((fr * p).sum() / p.sum())
    hf = float(p[fr > 2500].sum() / p.sum())
    band = (fr > 250) & (fr < 2500)
    tonal = float(spec[band].max() / (spec[band].mean() + 1e-9))
    return cen, hf, tonal

sel = json.load(open("selected.json"))
manifest = []
for s in sel:
    x = decode(s["file"])
    if len(x) < SR * 0.1: continue
    gap = 0.18 if s["kind"] == "burp" else 0.35
    segs = segments(x, gap)
    segs = [(a, b) for a, b in segs if 0.18 * SR < b - a < 7 * SR]
    for k, (a, b) in enumerate(segs[:8]):
        a = max(0, a - int(0.02 * SR)); b = min(len(x), b + int(0.08 * SR))
        y = x[a:b].copy()
        fi, fo = int(0.005 * SR), int(0.04 * SR)
        y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
        pk = np.abs(y).max()
        if pk < 1e-3: continue
        y = y / pk * 0.89
        cen, hf, tonal = features(y)
        name = f"{s['kind']}_{s['id']}_{k}"
        pcm = (y * 32767).astype(np.int16).tobytes()
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-c:a", "libmp3lame", "-q:a", "4", f"{OUT}/{name}.mp3"], input=pcm, check=True)
        manifest.append({"name": name, "kind": s["kind"], "src": s["id"], "user": s["user"], "title": s["title"],
                         "query": s["query"], "dur": round(len(y) / SR, 2), "cen": round(cen), "hf": round(hf, 3),
                         "tonal": round(tonal, 1)})
json.dump(manifest, open("features.json", "w"), indent=1)
print(len(manifest))
