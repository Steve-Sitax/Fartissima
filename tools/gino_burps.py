# One consistent burp voice for Gino: all belches by MisterDerp (CC0), cut into single burps, sorted by size.
import json, os, subprocess, urllib.request, numpy as np
SR = 44100
meta = {x["id"]: x for x in json.load(open("meta.json"))}
IDS = ["671214", "671216", "671217", "671218", "671215", "671205", "671208", "671204", "671209", "671211", "671212", "671206", "671207", "321048", "321581"]
OUT = "../public/sfx"
def decode(fn):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", fn, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
pools = {}
for i in IDS:
    fn = f"raw/gino_{i}.mp3"
    if not os.path.exists(fn): urllib.request.urlretrieve(meta[i]["mp3"], fn)
    x = decode(fn)
    hop = 441; n = len(x) // hop
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, 1)) + 1e-9)
    act = db > max(db.max() - 26, -48)
    segs, st, last = [], None, None
    for k, a in enumerate(act):
        if a:
            if st is None: st = k
            elif k - last > 25: segs.append((st, last)); st = k
            last = k
    if st is not None: segs.append((st, last))
    for j, (a, b) in enumerate(segs):
        a0, b0 = max(0, a * hop - 900), min(len(x), (b + 1) * hop + 4000)
        y = x[a0:b0].copy(); d = len(y) / SR
        if d < 0.25 or d > 7.5: continue
        fo = int(0.05 * SR); y[-fo:] *= np.linspace(1, 0, fo); y[:200] *= np.linspace(0, 1, 200)
        y = y / np.abs(y).max() * 0.89
        tier = 1 + sum(d >= c for c in (0.5, 0.85, 1.35, 2.2))
        name = f"gburp_{i}_{j}"
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-q:a", "4", f"{OUT}/{name}.mp3"],
                       input=(y * 32767).astype(np.int16).tobytes(), check=True)
        pools.setdefault(f"gino_burp_{tier}", []).append({"f": name, "d": round(d, 2)})
snd = json.load(open("../src/sounds.json"))
for k in [k for k in snd if k.startswith("gino_burp")]: del snd[k]
snd.update(pools)
json.dump(dict(sorted(snd.items())), open("../src/sounds.json", "w"), indent=1)
for k, v in sorted(pools.items()): print(k, len(v), [c["d"] for c in v])
