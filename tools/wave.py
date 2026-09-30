import sys, subprocess, numpy as np, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
SR = 22050
names = sys.argv[2:]
fig, axs = plt.subplots(len(names), 3, figsize=(18, 2.3 * len(names)))
for row, n in zip(axs, names):
    fn = n if n.endswith(('.wav', '.mp3')) else f"../public/sfx/{n}.mp3"
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", fn, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout, np.int16) / 32768
    t = np.arange(len(x)) / SR
    row[0].plot(t, x, lw=0.4); row[0].set_title(n.split('/')[-1], fontsize=8)
    pk = np.argmax(np.abs(x)); a = max(0, pk - int(0.06 * SR)); b = a + int(0.12 * SR)
    row[1].plot(t[a:b], x[a:b], lw=0.7); row[1].set_title("120 ms zoom at peak", fontsize=8)
    row[2].specgram(x, NFFT=1024, Fs=SR, noverlap=900, cmap="magma"); row[2].set_ylim(0, 2500)
fig.tight_layout(); fig.savefig(sys.argv[1], dpi=55)
