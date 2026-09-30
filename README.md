# Fartissima

A third-person browser game about the noble art of public wind.
Pick a wind warrior (Little Luca, Marco, Gino or Nonno Beppe), eat street food, fart, burp, and try not to shart.

## Play

```
npm install
npm run dev
```

Open http://127.0.0.1:5178, click **Choose your wind warrior**, pick a hero and play.

`npm run build` makes a static site in `dist/` that any web server can host.

## Controls

| Action | Key |
|---|---|
| Walk | WASD (ZQSD on AZERTY) or arrow keys |
| Run | Shift |
| Look | Mouse (click the game first) · Q / E turn the camera |
| Fart | Hold left mouse, F or Space (the mouse aims while you hold) |
| Burp | Hold right mouse or B |
| Music on/off | M |
| Pause | Esc |

## Sounds

- **Farts** are real recordings by one person (Jixolros), so the hero always sounds like himself.
  Each hero plays them at his own pitch: Luca squeaks, Nonno rumbles.
  The food decides the kind (brassy, wet, squeaky, sneaky), the hold time decides the size.
- **Burps** are real recordings by one person (MisterDerp), at the hero's pitch.
- **Crowd voices** ("ooh", "wow", "eww", gasps) and the **piazza chatter** are real recordings.
- **Music** is made live in the browser (plucked guitar, pad, mandolin tremolo). No file, no licence.
- **Artificial farts** (`src/synth.js`) are an option in the Sound lab. They copy what the recordings
  show: a row of sharp "slaps", a swell, a slowing tail, bubbles and gaps for wet ones.

All recordings come from Freesound with the CC0 licence. See [CREDITS.md](CREDITS.md).

## Tools (`tools/`)

| Script | Job |
|---|---|
| `scrape_freesound.py` | List CC0 sounds for a search |
| `pick.py`, `process.py`, `manifest.py` | First fart/burp library: download, cut, sort |
| `gino_farts.py`, `gino_burps.py` | The heroes' fart and burp voice |
| `voices.py` | Crowd voices and piazza chatter |
| `analyze.py`, `wave.py` | Measure clips, draw waveforms and spectrograms |
| `synth_test.mjs` | Render artificial farts to WAV for comparison |
