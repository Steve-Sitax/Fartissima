# Event sounds (CC0, Freesound): train whistle, fire-truck siren, vacuum, pigeons, slap.
import json, os, subprocess, urllib.request, numpy as np, glob
SR = 44100
meta = {}
for f in glob.glob('q_*.json') + ['meta_fx.json']:  # meta_fx.json: the picks, raw files cached in raw/
    for x in json.load(open(f)): meta[x['id']] = x
# id: (name, start s, length s)
PICK = {'71778': ('fx_whistle', 0, 3.2), '139324': ('fx_siren', 0, 5.8), '159347': ('fx_vacuum', 3, 5),
        '528250': ('fx_pigeons', 0, 4.2), '564230': ('fx_slap', 0, 1.3)}
pools = {}
for i, (name, ss, t) in PICK.items():
    m = meta[i]; fn = f'raw/{name}_{i}.mp3'
    if not os.path.exists(fn): urllib.request.urlretrieve(m['mp3'], fn)
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-ss', str(ss), '-i', fn, '-t', str(t), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    y = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    y = y / (np.abs(y).max() + 1e-9) * 0.89
    fi, fo = int(0.01 * SR), int(0.25 * SR)
    y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '5', f'../public/sfx/{name}.mp3'],
                   input=(y * 32767).astype(np.int16).tobytes(), check=True)
    pools[name] = [{'f': name, 'd': round(len(y) / SR, 2)}]
    print(name, m['title'], '|', m['user'], round(len(y) / SR, 2))
snd = json.load(open('../src/sounds.json'))
snd.update(pools)
json.dump(dict(sorted(snd.items())), open('../src/sounds.json', 'w'), indent=1)
cred = open('../CREDITS.md', encoding='utf8').read()
rows = ''.join(f"| [{i}](https://freesound.org/s/{i}/) | {meta[i]['title']} | {meta[i]['user']} |\n" for i in PICK if f'[{i}]' not in cred)
if rows:
    open('../CREDITS.md', 'a', encoding='utf8').write('\n## Event sounds\n\n| Freesound ID | Title | Creator |\n|---|---|---|\n' + rows)
