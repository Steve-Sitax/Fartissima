// Boot, render loop, input, camera, HUD and screens.
import * as THREE from 'three';
import './style.css';
import { buildWorld, HALF } from './world.js';
import { Sfx } from './audio.js';
import { Game, BLAST_COS } from './game.js';
import { CloudRenderer, cloudSnap } from './clouds.js';
import { FoodRenderer } from './food.js';
import { BubbleLayer } from './bubbles.js';
import { Replay } from './replay.js';
import { WindFX, AimGuide } from './fx.js';
import { FOODS, FART_NAMES, BURP_NAMES, HEROES, heroById } from './data.js';
import { Character, POSE, newState } from './characters.js';
import { fartParams, shartParams } from './synth.js';
import { isTouch, setupTouch, goFullscreen } from './touch.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const TOUCH = isTouch();
renderer.setPixelRatio(Math.min(TOUCH ? 1.5 : 2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
buildWorld(scene);
const clouds = new CloudRenderer(scene);
const foods = new FoodRenderer(scene);
const bubbles = new BubbleLayer($('bubbles'));
const wind = new WindFX(scene);
const aim = new AimGuide(scene, BLAST_COS);
const sfx = new Sfx();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Hall of Fame (this computer only) ----------
const HOF_KEY = 'fartissima.hof.v2';   // v2: one best combo instead of best fart + best burp
const loadHof = () => { try { return JSON.parse(localStorage.getItem(HOF_KEY)) || {}; } catch { return {}; } };
let hof = loadHof();
const cleanClip = (c) => c && { kind: c.kind, name: c.name, score: c.score, dt: c.dt, t0: c.t0, roster: c.roster, hero: c.hero, frames: c.frames, sounds: c.sounds };
function saveHof() {
  try { localStorage.setItem(HOF_KEY, JSON.stringify(hof)); }
  catch { toast('Hall of Fame is full. Could not save the replay.', 'bad'); }
}

// ---------- screens ----------
let state = 'title';       // title | play | pause | results | hof | lab
let replaying = false;
const screens = ['title', 'pause', 'results', 'hof', 'lab', 'choose', 'tapstart'];
function show(name) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== name);
  $('hud').classList.toggle('hidden', !(name === null || name === 'pause'));
  touch?.show(name === null);
}

function toast(text, cls = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + cls;
  d.textContent = text;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3400);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}

const fmt = (n) => n.toLocaleString('en-US');

// ---------- events: sounds and effects (live and in replays) ----------
const camRight = new THREE.Vector3();
function handleEvent(ev, speed = 1) {
  if (ev.fx) { wind.spawn(ev); return; }
  if (ev.say) return; // skip calls stored in older replays
  if (ev.synth) { sfx[ev.synth]?.(); return; }
  let pan = 0, dist = 1;
  if (ev.x !== undefined) {
    // voices come from where the person stands
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const dx = ev.x - camera.position.x, dz = ev.z - camera.position.z, d = Math.hypot(dx, dz) || 1;
    pan = ((dx * camRight.x + dz * camRight.z) / d) * 0.8;
    dist = Math.max(0.3, Math.min(1, 1.15 - d / 40));
  }
  sfx.play(ev, { speed, pan, dist });
}

const ui = {
  toast,
  event: (ev) => handleEvent(ev),
  duck: () => sfx.duck(0.85, 2.2),
  ate(food) {
    const style = food.style ? { dry: 'brassy', wet: 'SOGGY', squeak: 'squeaky', sbd: 'silent but deadly' }[food.style] : null;
    $('last-food').innerHTML = `Last ate: <b>${food.emoji} ${food.name}</b><br>${food.note}` + (style ? `<br>Next farts: <b>${style}</b>` : '');
    toast(`${food.emoji} ${food.name}`);
  },
  ended(reason) {
    exitPointer();
    const g = game;
    const sharted = reason === 'shart';
    const h = g.hero;
    $('res-title').textContent = sharted ? '💩 YOU SHARTED! 💩' : h.over;
    $('res-title').classList.toggle('shart', sharted);
    $('res-sub').textContent = sharted ? `${h.sharted} Game over.` : h.home;
    $('res-combo').textContent = fmt(g.best?.score || 0);
    $('res-combo-lbl').textContent = g.best?.name || 'nothing';
    $('btn-rp-combo').disabled = !g.best;
    $('res-shart-card').classList.toggle('hidden', !sharted);
    const record = g.best && g.best.score > (hof.combo?.score || 0);
    $('res-record').textContent = record ? '🏆 NEW RECORD!' : '';
    // let the clips record their last second, then store the all-time best ones
    setTimeout(() => {
      const b = g.best;
      if (record) {
        hof.combo = { score: b.score, name: b.name, hero: g.hero.name, date: new Date().toISOString(), clip: cleanClip(b.clip) };
        saveHof();
      }
    }, 1500);
    state = 'results';
    show('results');
  },
};

const game = new Game(scene, sfx, ui);
if (TOUCH) game.npcCount = 22;   // phones get a slightly smaller crowd
game.reset(sfx.settings.hero || 'fat');
const replay = new Replay(scene, sfx, handleEvent);
if (import.meta.env.DEV) window.__fartissima = { game, replay, sfx, get state() { return state; } };

// ---------- input ----------
const keys = new Set();
const input = { fwd: false, back: false, left: false, right: false, run: false, fart: false, burp: false, yaw: Math.PI };
let pitch = 0.32, mouseFart = false, mouseBurp = false;
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Escape' && state === 'play' && !document.pointerLockElement) pause();
  if (e.code === 'KeyM') { sfx.settings.music = sfx.settings.music > 0 ? 0 : 0.15; sfx.saveSettings(); refreshSettings(); }
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouseFart = mouseBurp = false; if (state === 'play') pause(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'play' || TOUCH) return;
  if (!document.pointerLockElement) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) mouseFart = true;
  if (e.button === 2) mouseBurp = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseFart = false; if (e.button === 2) mouseBurp = false; });
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  input.yaw -= e.movementX * 0.0025;
  pitch = Math.max(0.02, Math.min(1.1, pitch + e.movementY * 0.002));
});
let ignoreUnlock = false;
function exitPointer() { ignoreUnlock = true; document.exitPointerLock?.(); setTimeout(() => (ignoreUnlock = false), 200); }
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state === 'play' && !ignoreUnlock) pause();
});

function readInput(dt) {
  const k = (...c) => c.some((x) => keys.has(x));
  // e.code is the physical key, so WASD also works as ZQSD on a Belgian AZERTY keyboard
  input.fwd = k('KeyW', 'ArrowUp');
  input.back = k('KeyS', 'ArrowDown');
  input.left = k('KeyA', 'ArrowLeft');
  input.right = k('KeyD', 'ArrowRight');
  input.run = k('ShiftLeft', 'ShiftRight') || !!input.touchRun;
  input.fart = mouseFart || k('KeyF', 'Space') || !!input.touchFart;
  input.burp = mouseBurp || k('KeyB') || !!input.touchBurp;
  if (k('KeyQ')) input.yaw += dt * 2.2;   // turn the camera with the keys left/right of W
  if (k('KeyE')) input.yaw -= dt * 2.2;
  return input;
}

const touch = TOUCH ? setupTouch({
  input,
  look: (dx, dy) => { input.yaw -= dx * 0.006; pitch = Math.max(0.02, Math.min(1.1, pitch + dy * 0.004)); },
  isPlaying: () => state === 'play',
  pause: () => pause(),
}) : null;

function pause() {
  $('pause-sub').textContent = game.hero.pause;
  state = 'pause';
  keys.clear(); mouseFart = mouseBurp = false;
  show('pause');
}

async function ensureAudio() {
  if (!sfx.buffers.size) {
    $('loading').classList.remove('hidden');
    await sfx.init((p) => ($('load-pct').textContent = `${Math.round(p * 100)}%`));
    $('loading').classList.add('hidden');
  }
  await sfx.ctx.resume();
  sfx.startBackground();
}

async function startGame(heroId = game.hero.id) {
  await ensureAudio();
  lineup.visible = false;
  game.group.visible = true;
  wind.clear();
  game.reset(heroId);
  sfx.settings.hero = heroId;
  sfx.saveSettings();
  input.yaw = Math.PI;
  pitch = 0.32;
  $('last-food').textContent = 'Tummy: empty. Find food on the street!';
  state = 'play';
  show(null);
  if (TOUCH) goFullscreen(); else canvas.requestPointerLock?.();
}

// ---------- phones: full screen and sideways from the first tap, menus included ----------
if (TOUCH) {
  show('tapstart');
  $('btn-tapstart').onclick = () => { goFullscreen(); state = 'title'; show('title'); };
  // any later tap brings full screen back if the phone dropped out of it (back gesture, app switch)
  document.addEventListener('pointerdown', () => { if (!document.fullscreenElement) goFullscreen(); }, { capture: true });
}

// ---------- settings ----------
const MUSIC_STEPS = [0, 0.15, 0.3, 0.6, 1];
function refreshSettings() {
  const s = sfx.settings;
  for (const el of document.querySelectorAll('.set-mode')) el.textContent = `💨 Farts: ${s.mode === 'real' ? 'Recorded' : 'Artificial'}`;
  for (const el of document.querySelectorAll('.set-music')) el.textContent = `🎵 Music: ${s.music ? Math.round(s.music * 100) + '%' : 'off'}`;
  for (const el of document.querySelectorAll('.set-amb')) el.textContent = `🗣️ Chatter: ${s.amb ? 'on' : 'off'}`;
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const s = sfx.settings;
  if (t.classList.contains('set-mode')) s.mode = s.mode === 'real' ? 'synth' : 'real';
  else if (t.classList.contains('set-music')) s.music = MUSIC_STEPS[(MUSIC_STEPS.indexOf(s.music) + 1) % MUSIC_STEPS.length];
  else if (t.classList.contains('set-amb')) s.amb = s.amb ? 0 : 0.8;
  else return;
  sfx.saveSettings();
  refreshSettings();
});
refreshSettings();

// ---------- sound lab: hear every food at every size ----------
function buildLab() {
  const rows = [];
  const fartFoods = FOODS.filter((f) => f.style);
  for (const f of fartFoods) {
    const names = FART_NAMES[f.style];
    rows.push(`<div class="lab-row"><span class="lab-name">${f.emoji} ${f.name}</span>` +
      [1, 2, 3, 4, 5].map((t) => `<button data-lab="fart" data-food="${f.id}" data-style="${f.style}" data-tier="${t}" title="${names[t - 1]}">${t}</button>`).join('') + '</div>');
  }
  rows.push('<div class="lab-row"><span class="lab-name">🫧 Burp</span>' + [1, 2, 3, 4, 5].map((t) => `<button data-lab="burp" data-tier="${t}" title="${BURP_NAMES[t - 1]}">${t}</button>`).join('') +
    '<button data-lab="shart">💩 Shart</button></div>');
  rows.push('<div class="lab-row"><span class="lab-name">🗣️ People</span>' + ['ooh', 'eww', 'gasp', 'sniff', 'crowd_ooh', 'crowd_gasp'].map((v) => `<button data-lab="voice" data-v="${v}">${v.replace('_', ' ')}</button>`).join('') + '</div>');
  $('lab-grid').innerHTML = rows.join('');
}
buildLab();
$('lab-grid').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset, tier = +d.tier, seed = (Math.random() * 1e9) | 0, real = sfx.settings.mode === 'real';
  sfx.stopAll();
  if (d.lab === 'fart') {
    const sbd = d.style === 'sbd';
    handleEvent(real ? sfx.realFart(d.style, tier, d.food) : { s: 'fart', p: fartParams(d.food, tier, seed), gain: sbd ? 0.35 : 0.62 + tier * 0.08, lp: sbd ? 1100 : 0 });
    $('lab-now').textContent = `${FOODS.find((f) => f.id === d.food).emoji} ${FART_NAMES[d.style][tier - 1]} (${real ? 'recorded' : 'artificial'})`;
  } else if (d.lab === 'burp') {
    handleEvent(sfx.burp(tier));
    $('lab-now').textContent = `${BURP_NAMES[tier - 1]} (recorded)`;
  } else if (d.lab === 'shart') {
    handleEvent(real ? sfx.realShart() : { s: 'fart', p: shartParams(seed), gain: 1 });
  } else if (d.lab === 'voice') {
    const v = sfx.voice(d.v);
    handleEvent({ s: 'voice', f: v.f, gain: 0.9 });
  }
});

// ---------- choose your wind warrior ----------
// The four heroes stand in a row in the piazza, the cards sit underneath.
const LINE_Z = 18;
const lineup = new THREE.Group();
lineup.visible = false;
scene.add(lineup);
const lineChars = HEROES.map((h, i) => {
  const c = new Character('hero', 1, h.id);
  lineup.add(c.root);
  const st = newState((i - 1.5) * 3.5, LINE_Z);
  return { c, st, h };
});
let chosen = sfx.settings.hero || 'fat';
const pips = (n) => `<span class="pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;
function renderChoose() {
  $('hero-cards').innerHTML = HEROES.map((h) => `
    <button class="hero-card${h.id === chosen ? ' sel' : ''}" data-hero="${h.id}">
      <div class="hn">${h.emoji} ${h.name}</div>
      <div class="ha">${h.age} years old</div>
      <div class="stat">Speed ${pips(h.stats.speed)}</div>
      <div class="stat">Blast ${pips(h.stats.blast)}</div>
      <div class="stat">Stench ${pips(h.stats.stench)}</div>
      <div class="stat">Control ${pips(h.stats.control)}</div>
    </button>`).join('');
  const h = heroById(chosen);
  $('hero-info').innerHTML = `<p><b>${h.intro}</b></p><p>${h.blurb}</p><ul>${h.tips.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  $('btn-go').textContent = `Play as ${h.name}!`;
}
$('hero-cards').addEventListener('click', (e) => {
  const b = e.target.closest('[data-hero]');
  if (!b) return;
  chosen = b.dataset.hero;
  renderChoose();
});
async function openChoose() {
  await ensureAudio();
  renderChoose();
  game.group.visible = false;
  lineup.visible = true;
  state = 'choose';
  show('choose');
}
function updateLineup(t) {
  for (const l of lineChars) {
    const sel = l.h.id === chosen;
    l.st.pose = sel ? POSE.THUMBS : POSE.NORMAL;
    l.st.rot = -l.st.x * 0.06 + Math.sin(t * 0.8 + l.st.x) * 0.12;
    l.c.apply(l.st, t);
  }
}

// ---------- buttons ----------
$('btn-start').onclick = () => openChoose();
$('btn-again').onclick = () => startGame();
$('btn-change').onclick = () => openChoose();
$('btn-go').onclick = () => startGame(chosen);
$('btn-choose-back').onclick = () => { lineup.visible = false; game.group.visible = true; state = 'title'; show('title'); };
$('btn-resume').onclick = () => { state = 'play'; show(null); if (TOUCH) goFullscreen(); else canvas.requestPointerLock?.(); };
$('btn-quit').onclick = () => game.endRound('time');
$('btn-menu').onclick = () => { state = 'title'; show('title'); };
$('btn-hof').onclick = async () => { await ensureAudio(); openHof(); };
$('btn-lab').onclick = async () => { await ensureAudio(); state = 'lab'; show('lab'); };
$('btn-lab-back').onclick = () => { sfx.stopAll(); state = 'title'; show('title'); };
$('btn-hof-back').onclick = () => { state = 'title'; show('title'); };
$('btn-hof-clear').onclick = () => {
  if (!confirm('Forget all Hall of Fame farts and burps?')) return;
  localStorage.removeItem(HOF_KEY);
  hof = {};
  openHof();
};
$('btn-rp-combo').onclick = () => startReplay(game.best?.clip);
$('btn-rp-shart').onclick = () => startReplay(game.shartClip, 'SHART CAM');
$('btn-hof-combo').onclick = () => startReplay(hof.combo?.clip);
$('btn-rp-close').onclick = stopReplay;
$('btn-rp-again').onclick = () => { wind.clear(); replay.restart(); };
$('btn-rp-slow').onclick = () => {
  replay.speed = replay.speed === 1 ? 0.5 : 1;
  $('btn-rp-slow').textContent = `🐌 Slow-mo: ${replay.speed === 1 ? 'off' : 'on'}`;
};

function openHof() {
  hof = loadHof();
  const c = hof.combo;
  $('hof-combo').textContent = fmt(c?.score || 0);
  $('hof-combo-lbl').textContent = c ? `${c.name} by ${c.hero}, ${new Date(c.date).toLocaleDateString()}` : 'nothing yet';
  $('btn-hof-combo').disabled = !c?.clip;
  state = 'hof';
  show('hof');
}

function startReplay(clip, title) {
  if (!clip || clip.frames.length < 2) return;
  replaying = true;
  document.body.classList.add('replaying');
  game.group.visible = false;
  wind.clear();
  replay.start(clip);
  $('rp-title').textContent = title || `${clip.name} · ${fmt(clip.score)} pts`;
  $('replay-ui').classList.remove('hidden');
}

function stopReplay() {
  replaying = false;
  replay.stop();
  wind.clear();
  game.group.visible = true;
  document.body.classList.remove('replaying');
  $('replay-ui').classList.add('hidden');
}

// ---------- HUD ----------
function updateHud() {
  const g = game;
  $('m-fart').style.width = `${(g.gas.fart / g.hero.tank) * 100}%`;
  $('m-burp').style.width = `${(g.gas.burp / g.hero.tank) * 100}%`;
  $('m-shart').style.width = `${Math.min(100, g.shart)}%`;
  $('m-shart').parentElement.parentElement.classList.toggle('danger', g.shart > 60);
  const tl = Math.ceil(g.timeLeft);
  $('timer').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('low', tl <= 20);
  $('best-combo').textContent = fmt(g.best?.score || 0);
  $('best-combo-lbl').textContent = g.best?.name || '-';
  const ci = g.chargeInfo();
  $('charge').classList.toggle('hidden', !ci);
  if (ci) {
    $('charge-name').textContent = ci.name;
    $('charge-bar').style.width = `${ci.amount}%`;
    $('charge-aim').textContent = ci.blastR > 0 ? `💥 ${ci.inBlast} in the blast · 👂 ${ci.inHear} will hear it` : `🤫 silent · ${ci.inHear} close enough to hear`;
  }
  const live = g.liveCombo();
  $('live-score').classList.toggle('hidden', !live);
  if (live) $('live-score').textContent = `${live.name}  ${fmt(live.score)}` + (live.people > 1 ? `  · ${live.people} hit` : '');
}

// ---------- camera ----------
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
function followCamera(x, z, dt) {
  // the camera sits closer and lower for small heroes
  const hh = game.gino.ch.height;
  camTarget.set(x, hh * 0.62, z);
  const dist = 4 + hh * 1.35;
  const fx = Math.sin(input.yaw), fz = Math.cos(input.yaw);
  camPos.set(x - fx * dist * Math.cos(pitch), camTarget.y + dist * Math.sin(pitch) + 0.6, z - fz * dist * Math.cos(pitch));
  const lim = HALF + 3;
  camPos.x = Math.max(-lim, Math.min(lim, camPos.x));
  camPos.z = Math.max(-lim, Math.min(lim, camPos.z));
  camera.position.lerp(camPos, Math.min(1, dt * 10));
  const sh = game.shake;
  camera.position.x += (Math.random() - 0.5) * sh;
  camera.position.y += (Math.random() - 0.5) * sh;
  camera.lookAt(camTarget);
}
function orbitCamera(cx, cz, radius, height, angle, lookY = 1.2) {
  camera.position.set(cx + Math.sin(angle) * radius, height, cz + Math.cos(angle) * radius);
  camera.lookAt(cx, lookY, cz);
}

// ---------- loop ----------
const tmpSnap = [];
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  let chars, bubbleList;
  if (replaying) {
    const fr = replay.update(dt);
    replay.chars.forEach((c, i) => c.apply(fr.states[i], t));
    clouds.draw(fr.clouds, t, camera.position);
    foods.draw(fr.foods, t);
    chars = replay.chars;
    bubbleList = fr.bubbles;
    const p = fr.states[0], clip = replay.clip;
    // circle the hero; lean in around the big moment
    const near = Math.exp(-(((replay.t - clip.t0 - 0.8) / 1.6) ** 2));
    aim.update(null);
    orbitCamera(p.x, p.z, 8.5 - near * 3, 3.2 - near * 1.2, p.rot + Math.PI * 0.75 + replay.camSpin * replay.t * 0.25, 1.3);
    $('rp-progress').firstElementChild.style.width = `${(replay.t / replay.duration) * 100}%`;
    wind.update(dt * replay.speed, camera.position);
  } else {
    if (state === 'play') game.update(dt, readInput(dt));
    else if (state !== 'pause') game.update(dt, null, true);
    const gs = game.gino.s;
    game.gino.ch.apply(gs, t);
    for (const n of game.npcs) n.ch.apply(n.s, t);
    tmpSnap.length = 0;
    for (const c of game.clouds) tmpSnap.push(cloudSnap(c));
    clouds.draw(tmpSnap, t, camera.position);
    foods.draw(game.foods.map((f) => [f.x, f.z, f.i]), t);
    chars = [game.gino.ch, ...game.npcs.map((n) => n.ch)];
    bubbleList = game.bubbles.map((b) => [b.owner, b.text, b.cls, b.age, b.x, b.y, b.z, b.life]);
    if (state === 'play' || state === 'pause') followCamera(gs.x, gs.z, dt);
    else if (state === 'results' && game.sharting) orbitCamera(gs.x, gs.z, 6, 2.5, t * 0.3);
    else if (state === 'choose') { updateLineup(t); const back = 9 * Math.max(1, 1.6 / camera.aspect); camera.position.set(0, 1.2, LINE_Z + back); camera.lookAt(0, -2.3 * back / 9, LINE_Z); }
    else orbitCamera(0, 0, 26, 11, t * 0.05, 2);
    if (state === 'play') updateHud();
    aim.update(state === 'play' ? game.chargeInfo() : null, gs, t);
    if (state !== 'pause') wind.update(dt, camera.position);
  }
  renderer.render(scene, camera);
  bubbles.draw(state === 'choose' && !replaying ? [] : bubbleList, chars, camera, window.innerWidth, window.innerHeight);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
