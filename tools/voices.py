# Downloads CC0 voice reactions + piazza ambience, trims, measures pitch (to tell men from women), encodes.
import json, os, subprocess, urllib.request, numpy as np
SR = 44100
meta = {}
for f in ("meta_voice.json", "meta_amb.json"):
    for x in json.load(open(f)): meta[x["id"]] = x
# id: (category, max seconds, start offset)
PICK = {
 "870651": ("crowd_ooh", 3, 0), "870652": ("crowd_ooh", 3.5, 0), "870653": ("crowd_ooh", 2.7, 0), "324896": ("crowd_ooh", 3.5, 0),
 "264376": ("crowd_gasp", 3, 0), "324898": ("crowd_gasp", 3.8, 0), "635110": ("crowd_gasp", 1.6, 0),
 "166155": ("ooh", 1.8, 0), "436108": ("ooh", 1, 0), "398933": ("ooh", 1.4, 0), "213939": ("ooh", 1, 0), "848609": ("ooh", 1.3, 0),
 "848610": ("ooh", 1.9, 0), "825430": ("ooh", 2.8, 0), "801213": ("ooh", 1, 0), "818168": ("ooh", 1.1, 0), "414227": ("ooh", 2, 0),
 "466086": ("ooh_multi", 11, 0),
 "776024": ("eww", 1.9, 0), "818915": ("eww", 2.6, 0), "801069": ("eww", 0.8, 0), "801101": ("eww", 0.7, 0), "338960": ("eww", 0.5, 0),
 "377738": ("eww", 3.5, 0), "344036": ("eww", 2.4, 0), "740303": ("eww", 1.7, 0), "554191": ("sniff", 3.2, 0), "763469": ("sniff", 5.1, 0),
 "207779": ("gasp", 1.5, 0), "232263": ("gasp", 1.6, 0), "437667": ("gasp", 0.9, 0), "353924": ("gasp", 1.2, 0), "333412": ("gasp", 2.8, 0),
 "832691": ("amb", 75, 40),
}
os.makedirs("raw", exist_ok=True)
OUT = "../public/sfx"
def decode(fn, ss=0, t=None):
    cmd = ["ffmpeg", "-v", "quiet", "-ss", str(ss), "-i", fn] + (["-t", str(t)] if t else []) + ["-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.int16).astype(np.float32) / 32768
def f0_med(x):
    W = int(0.04 * SR); fs = []
    thr = np.max(np.abs(x)) * 0.1
    for i in range(0, len(x) - W, W // 2):
        fr = x[i:i + W]
        if np.max(np.abs(fr)) < thr: continue
        ac = np.fft.irfft(np.abs(np.fft.rfft(fr * np.hanning(W), 2 * W)) ** 2)[:W]; ac /= ac[0] + 1e-12
        lo, hi = SR // 500, SR // 70; k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.5: fs.append(SR / k)
    return float(np.median(fs)) if fs else 0
def trim(y, th=0.03):
    idx = np.where(np.abs(y) > th * np.abs(y).max())[0]
    return y[max(0, idx[0] - 400): idx[-1] + 2000] if len(idx) else y
def enc(y, name, q="4"):
    subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-q:a", q, f"{OUT}/{name}.mp3"],
                   input=(y * 32767).astype(np.int16).tobytes(), check=True)
out, credits = {}, []
for i, (cat, dur, ss) in PICK.items():
    m = meta[i]; fn = f"raw/{cat}_{i}.mp3"
    if not os.path.exists(fn): urllib.request.urlretrieve(m["mp3"], fn)
    x = decode(fn, ss, dur)
    credits.append(m)
    if cat == "amb":
        # seamless loop: crossfade the last 3 s into the start
        n = 3 * SR; a, b = x[:len(x) - n], x[len(x) - n:]
        ramp = np.linspace(0, 1, n); a[:n] = a[:n] * ramp + b * (1 - ramp)
        a = a / np.abs(a).max() * 0.8
        enc(a, "amb_piazza", "6"); out["amb"] = [{"f": "amb_piazza", "d": round(len(a) / SR, 1)}]
        continue
    segs = [x]
    if cat == "ooh_multi":  # "Oh x7": split on silences
        env = np.convolve(np.abs(x), np.ones(2205) / 2205, "same"); act = env > env.max() * 0.08
        edges = np.flatnonzero(np.diff(act.astype(int))); segs = [x[a:b] for a, b in zip(edges[::2], edges[1::2]) if b - a > 0.25 * SR]
        cat = "ooh"
    for k, y in enumerate(segs):
        y = trim(y); y = y / (np.abs(y).max() + 1e-9) * 0.89
        fi = int(0.01 * SR); y[:fi] *= np.linspace(0, 1, fi); y[-fi * 4:] *= np.linspace(1, 0, fi * 4)
        name = f"v_{cat}_{i}_{k}"
        enc(y, name)
        f0 = f0_med(y)
        out.setdefault(cat, []).append({"f": name, "d": round(len(y) / SR, 2), "f0": round(f0)})
json.dump(out, open("../src/voices.json", "w"), indent=1)
for k, v in out.items(): print(k, len(v))
with open("../CREDITS.md", "a", encoding="utf8") as f:
    f.write("\n## Voices and ambience\n\n| Freesound ID | Title | Creator |\n|---|---|---|\n")
    for s in sorted(credits, key=lambda s: int(s["id"])):
        f.write(f"| [{s['id']}](https://freesound.org/s/{s['id']}/) | {s['title'].replace('|', '/')} | {s['user']} |\n")
