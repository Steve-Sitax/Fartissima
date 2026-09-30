import json, subprocess, numpy as np, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
d = json.load(open("features.json"))
d.sort(key=lambda x: (x["kind"], x["dur"]))
for part, kind in enumerate(["fart", "burp", "shart"]):
    items = [x for x in d if x["kind"] == kind]
    cols = 6; rows = (len(items) + cols - 1) // cols
    fig, axs = plt.subplots(rows, cols, figsize=(cols * 3, rows * 1.6))
    for ax in axs.flat: ax.axis("off")
    for ax, x in zip(axs.flat, items):
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", f"../public/sfx/{x['name']}.mp3", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
        y = np.frombuffer(raw, np.int16).astype(float)
        ax.specgram(y, NFFT=512, Fs=16000, noverlap=384, cmap="magma", vmin=0)
        ax.set_ylim(0, 6000); ax.set_title(f"{x['name'].split('_',1)[1]} {x['dur']}s", fontsize=8)
    fig.tight_layout(); fig.savefig(f"sheet_{kind}.png", dpi=60)
