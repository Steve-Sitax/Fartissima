# Fartissima

## 💨 [▶ PLAY NOW: steve-sitax.github.io/Fartissima](https://steve-sitax.github.io/Fartissima/)

Runs in the browser on computer and phone. No install.
On a phone: turn it sideways, or use **Add to Home screen** to start it like an app.

A third-person browser game about the noble art of public wind.
Pick a wind warrior (Little Luca, Marco, Gino or Nonno Beppe), eat street food, fart, burp, and try not to shart.

## Run it yourself

```
npm install
npm run dev
```

Open http://127.0.0.1:5178, click **Choose your wind warrior**, pick a hero and play.

`npm run build` makes a static site in `dist/` that any web server can host.

## Scoring

Farts and burps fired within 2.5 seconds of each other form one **combo**. The scores add up and
get multiplied: x1.5 for two, x2 for three, and so on. Mixing farts and burps adds 20 %.
Burps always score a bit less than farts. Only your best combo counts.
Combo names: Chain Farter, Belching Boomer (Burping Brat for Luca), Two-Way Tornado, BUTT PIG.

## Play on a phone

The game is published on GitHub Pages: https://steve-sitax.github.io/Fartissima/
The first tap puts the game full screen and sideways (Android). On iPhone, or to start it like an app,
use "Add to Home screen": it then always opens full screen and sideways. Left thumb: walk (push to the edge to run). Right thumb: hold FART or BURP,
slide while holding to aim. Drag on the right half of the screen to look around.

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

## Licence

Copyright (C) 2026 Steve Windey

The game code is free software under the **GNU General Public License v3.0 or later**.
See [LICENSE](LICENSE).

Parts that come from others keep their own licence:

| Part | Licence | Where it is credited |
|---|---|---|
| [three.js](https://threejs.org) (3D engine, bundled) | MIT | [public/THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt), shipped with the game |
| Recorded sounds (Freesound) | CC0, public domain | [CREDITS.md](CREDITS.md) |
| Fonts Bangers and Nunito (loaded from Google Fonts, not bundled) | SIL Open Font License 1.1 | [CREDITS.md](CREDITS.md) |

The music, the artificial farts, the 3D models and the app icon are made in this project.
