// Cartoon people. One body kit for everybody: smooth lathe-turned torsos, a neck, jointed arms
// (shoulder + elbow) and legs (hip + knee), a face with real eyes. Heroes and pedestrians only
// differ in the numbers. One Character draws one state object:
// { x, z, rot, walk, move, pose, hair, green, red, stain } - the same numbers the replay stores.
import * as THREE from 'three';

export const POSE = { NORMAL: 0, THUMBS: 1, FLEE: 2, CURSE: 3, SHOCK: 4, FART: 5, BURP: 6, SHART: 7, EAT: 8, TALK: 9, DAZED: 10, SELFIE: 11, CHASE: 12, MEASURE: 13, WRITE: 14 };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const matCache = new Map();
const toon = (c) => {
  const k = typeof c === 'string' ? c : '#' + c.getHexString();
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshToonMaterial({ color: k }));
  return matCache.get(k);
};
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2b1d0e', side: THREE.BackSide });

// big = casts a shadow and gets a cartoon outline
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, big = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (big) {
    m.castShadow = true;
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1.06);
    m.add(o);
  }
  parent.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
// A limb piece hanging down from its joint: tapered, round ends.
function limb(parent, r1, r2, len, mat) {
  const g = new THREE.CylinderGeometry(r1, r2, len, 10);
  g.translate(0, -len / 2, 0);
  const m = mesh(g, mat, parent, 0, 0, 0, true);
  mesh(new THREE.SphereGeometry(r2, 10, 8), mat, parent, 0, -len, 0);
  return m;
}
// A body shape turned on a lathe from [radius, height] points, squashed front to back.
function lathe(parent, pts, mat, depth, y = 0) {
  const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0.001, r), h)), 28);
  const m = mesh(geo, mat, parent, 0, y, 0, true);
  m.scale.z = depth;
  return m;
}
function stripeTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKINS = ['#f2c9a0', '#e0ac7e', '#c68a5e', '#8d5a3b', '#f5d6b8', '#a86b45'];
const SHIRTS = ['#e74c3c', '#3498db', '#1abc9c', '#9b59b6', '#f1c40f', '#e67e22', '#2ecc71', '#34495e', '#ff7eb6', '#ffffff'];
const PANTS = ['#2c3e50', '#34495e', '#7f8c8d', '#6d4c41', '#1e3a5f', '#c2b280'];
const SKIRTS = ['#e84393', '#6c5ce7', '#00b894', '#fdcb6e', '#d63031', '#0984e3', '#2d3436'];
const HAIRS = ['#2b1a10', '#5a3a1e', '#d9a441', '#a0522d', '#111', '#c0392b', '#e8d8b0'];
const DOWN = new THREE.Vector3(0, -1, 0);
const tmpV = new THREE.Vector3();
const skinTmp = new THREE.Color();
const GREEN = new THREE.Color('#7bd13a');
const RED = new THREE.Color('#ff3b2f');

// Torso outlines, [radius, height above the hip joint]. The bottom part (below `belt`) is trousers.
const BUILDS = {
  slim:   { pts: [[0.13, -0.1], [0.16, -0.06], [0.165, 0.04], [0.15, 0.2], [0.17, 0.36], [0.2, 0.5], [0.2, 0.57], [0.1, 0.63], [0, 0.64]], depth: 0.62, belt: 0.06, hip: 0.09, shoulder: 0.18, arm: 1 },
  normal: { pts: [[0.14, -0.1], [0.17, -0.06], [0.18, 0.04], [0.18, 0.2], [0.19, 0.36], [0.22, 0.5], [0.22, 0.57], [0.11, 0.64], [0, 0.65]], depth: 0.64, belt: 0.06, hip: 0.1, shoulder: 0.2, arm: 1.05 },
  chubby: { pts: [[0.16, -0.1], [0.2, -0.06], [0.23, 0.06], [0.25, 0.2], [0.24, 0.36], [0.23, 0.5], [0.22, 0.57], [0.11, 0.64], [0, 0.65]], depth: 0.75, belt: 0.06, hip: 0.11, shoulder: 0.2, arm: 1.2 },
  fat:    { pts: [[0.18, -0.1], [0.23, -0.06], [0.28, 0.06], [0.31, 0.2], [0.29, 0.38], [0.25, 0.5], [0.23, 0.57], [0.12, 0.64], [0, 0.65]], depth: 0.85, belt: 0.04, hip: 0.12, shoulder: 0.21, arm: 1.35, belly: 0.26 },
  woman:  { pts: [[0.15, -0.1], [0.19, -0.05], [0.19, 0.05], [0.13, 0.24], [0.16, 0.38], [0.17, 0.47], [0.17, 0.54], [0.09, 0.6], [0, 0.61]], depth: 0.66, belt: 0.08, hip: 0.1, shoulder: 0.16, arm: 0.9 },
  curvy:  { pts: [[0.17, -0.1], [0.22, -0.05], [0.22, 0.06], [0.16, 0.24], [0.19, 0.38], [0.19, 0.47], [0.18, 0.54], [0.09, 0.6], [0, 0.61]], depth: 0.72, belt: 0.08, hip: 0.11, shoulder: 0.17, arm: 1 },
  child:  { pts: [[0.14, -0.1], [0.17, -0.06], [0.18, 0.04], [0.18, 0.2], [0.18, 0.34], [0.19, 0.46], [0.19, 0.52], [0.1, 0.58], [0, 0.59]], depth: 0.7, belt: 0.06, hip: 0.1, shoulder: 0.17, arm: 1 },
  old:    { pts: [[0.13, -0.1], [0.16, -0.06], [0.17, 0.04], [0.18, 0.2], [0.18, 0.36], [0.19, 0.5], [0.18, 0.56], [0.1, 0.62], [0, 0.63]], depth: 0.66, belt: 0.06, hip: 0.09, shoulder: 0.17, arm: 0.95 },
};

// The four playable heroes. s = overall size; body parts are in "adult metres" before scaling.
export const HERO_LOOKS = {
  fat: { s: 1.0, build: 'fat', skin: '#f0b98f', top: '#fbfbf6', sleeves: 'none', bottom: 'shorts', pants: '#3b6fb6', shoes: '#6b3d1d',
    headR: 0.165, hair: 'ring', hairColor: '#3a2616', mustache: true, sauce: true, peek: true },
  man: { s: 1.0, build: 'normal', skin: '#e6b08a', top: '#2f6db5', sleeves: 'short', bottom: 'pants', pants: '#34495e', shoes: '#222',
    headR: 0.155, hair: 'short', hairColor: '#2b1a10', stubble: true, collar: '#ffffff' },
  boy: { s: 0.72, build: 'child', skin: '#f5d0ae', top: '#e74c3c', stripes: '#ffffff', sleeves: 'short', bottom: 'shorts', pants: '#d9a441', shoes: '#2980b9',
    headR: 0.2, hair: 'mop', hairColor: '#6b3d1d', freckles: true },
  old: { s: 0.94, build: 'old', skin: '#e8c0a0', top: '#8b6b4a', sleeves: 'long', bottom: 'pants', pants: '#8a8a8a', shoes: '#3a2616',
    headR: 0.155, hair: 'ring', hairColor: '#eeeeee', mustache: true, mustacheBig: true, flatCap: '#4d4d4d', glasses: true, cane: true, hunch: 0.35 },
};

export class Character {
  // kind: 'hero' (the player; variant = fat | man | boy | old) or 'man' | 'fan' | 'woman' (pedestrians).
  // 'gino' is the old name of the fat hero, still found in saved replays.
  constructor(kind, seed = 1, variant = 'fat') {
    if (kind === 'gino') { kind = 'hero'; variant = 'fat'; }
    this.kind = kind;
    this.variant = variant;
    this.seed = seed;
    this.root = new THREE.Group();
    const r = rng(seed * 7919 + 13);
    const pickC = (arr) => arr[(r() * arr.length) | 0];
    let look;
    if (kind === 'hero') look = HERO_LOOKS[variant] || HERO_LOOKS.fat;
    else if (kind === 'lady') {
      // the fancy lady: long dress, big hat, pearls, sunglasses and a selfie stick
      look = { s: 0.98, build: 'woman', skin: '#f5d6b8', top: '#8e1b4a', skirt: '#8e1b4a', sleeves: 'none', bottom: 'dress', pants: '#8e1b4a', shoes: '#111',
        headR: 0.148, hair: 'bun', hairColor: '#d9a441', hat: '#f5e6c8', hatBand: '#8e1b4a', pearls: true, shades: true, lips: true, selfie: true };
    } else if (kind === 'hazmat') {
      // nuclear team: white suit, yellow boots, gas mask, a Geiger counter or a clipboard
      look = { s: 1, build: 'chubby', skin: '#f2c9a0', top: '#f4f4f4', sleeves: 'long', bottom: 'pants', pants: '#f4f4f4', shoes: '#f1c40f',
        headR: 0.155, hair: 'hood', hairColor: '#f4f4f4', mask: true, tool: variant === 'writer' ? 'clipboard' : 'geiger' };
    } else if (kind === 'woman') {
      const dress = r() < 0.35;
      look = { s: 0.92 + r() * 0.08, build: r() < 0.35 ? 'curvy' : 'woman', skin: pickC(SKINS), top: pickC(SHIRTS), sleeves: r() < 0.5 ? 'short' : 'none',
        bottom: dress ? 'dress' : r() < 0.7 ? 'skirt' : 'pants', skirt: pickC(SKIRTS), pants: pickC(PANTS), shoes: pickC(['#c0392b', '#111', '#8e44ad', '#f5f5f5']),
        headR: 0.148, hair: 'long', hairColor: pickC(HAIRS), hairLen: 0.22 + r() * 0.3, lips: true };
      if (dress) look.top = look.skirt;
    } else {
      const b = r();
      look = { s: 0.95 + r() * 0.1, build: b < 0.3 ? 'slim' : b < 0.8 ? 'normal' : 'chubby', skin: pickC(SKINS), top: pickC(SHIRTS),
        sleeves: r() < 0.6 ? 'short' : 'long', bottom: r() < 0.85 ? 'pants' : 'shorts', pants: pickC(PANTS), shoes: pickC(['#222', '#6b3d1d', '#f5f5f5']),
        headR: 0.152, hair: kind === 'fan' ? 'cap' : pickC(['short', 'short', 'curly', 'ring', 'short']), hairColor: pickC(HAIRS),
        cap: pickC(['#e74c3c', '#2980b9', '#27ae60', '#111', '#f39c12']), shades: kind !== 'fan' && r() < 0.25, beard: r() < 0.2 };
    }
    this.skin = new THREE.Color(look.skin);
    this.headMat = new THREE.MeshToonMaterial({ color: this.skin.clone() });
    this.build(look, r);
  }

  build(L, r) {
    const R = this.root;
    const B = BUILDS[L.build];
    const skin = toon(this.skin), top = L.stripes ? new THREE.MeshToonMaterial({ map: stripeTexture(L.top, L.stripes) }) : toon(L.top);
    const pants = toon(L.pants), shoes = toon(L.shoes), hairM = toon(L.hairColor);
    const legLen = 0.89, hipY = legLen;
    this.hipY = hipY;
    this.hunch = L.hunch || 0;
    this.hip = group(R, 0, hipY, 0);
    const torso = (this.torso = group(this.hip));

    // ---- legs: thigh + knee + shin + shoe
    const bareLegs = L.bottom !== 'pants';
    const makeLeg = (side) => {
      const hipJ = group(R, side * B.hip, hipY, 0);
      const thighM = L.bottom === 'shorts' ? pants : L.bottom === 'pants' ? pants : skin;
      limb(hipJ, 0.085 * B.arm, 0.066, 0.44, thighM);
      if (L.bottom === 'shorts') limb(hipJ, 0.09 * B.arm, 0.085, 0.22, pants); // shorts leg
      const knee = group(hipJ, 0, -0.44, 0);
      limb(knee, 0.063, 0.047, 0.4, bareLegs ? skin : pants);
      const shoe = mesh(new THREE.CapsuleGeometry(0.055, 0.12, 4, 8), shoes, knee, 0, -0.43, 0.05, true);
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.set(1, 1, 0.75);
      return { hipJ, knee };
    };
    ({ hipJ: this.legL, knee: this.kneeL } = makeLeg(1));
    ({ hipJ: this.legR, knee: this.kneeR } = makeLeg(-1));

    // ---- torso: trousers below the belt, top above
    const pts = B.pts;
    const low = pts.filter(([, h]) => h <= B.belt + 0.001);
    const cut = pts.find(([, h]) => h > B.belt);
    const beltR = low.at(-1)[0] + (cut[0] - low.at(-1)[0]) * ((B.belt - low.at(-1)[1]) / (cut[1] - low.at(-1)[1]));
    const dressy = L.bottom === 'dress';
    lathe(torso, [[0, -0.11], ...low, [beltR, B.belt]], dressy ? toon(L.skirt) : L.bottom === 'skirt' ? toon(L.skirt) : pants, B.depth);
    const upper = [[beltR, B.belt], ...pts.filter(([, h]) => h > B.belt)];
    // sleeveless / arm holes: the top stops below the shoulders, skin shows
    this.body = lathe(torso, L.sleeves === 'none' && !dressy ? upper.slice(0, -2).concat([[0, upper.at(-3)[1] + 0.02]]) : upper, top, B.depth);
    if (L.sleeves === 'none' && !dressy) {
      lathe(torso, [[0, 0.5], [0.2 * B.shoulder / 0.2, 0.52], [B.shoulder, 0.57], [0.1, 0.64], [0, 0.65]], skin, B.depth);
      if (L.peek) {
        // the marcelleke straps
        for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 0.14, 0.02), top, torso, sx * 0.1, 0.56, B.depth * 0.13);
      }
    }
    if (L.collar) {
      const c = mesh(new THREE.TorusGeometry(0.075, 0.02, 6, 16), toon(L.collar), torso, 0, 0.635, 0);
      c.rotation.x = Math.PI / 2;
    }
    if (B.belly) {
      // the belly: its own round shape, stretching the shirt
      this.belly = mesh(new THREE.SphereGeometry(B.belly, 24, 18), top, torso, 0, 0.2, 0.1, true);
      this.bellyScale = [1, 0.95, 0.9];
      this.belly.scale.set(...this.bellyScale);
      if (L.peek) mesh(new THREE.SphereGeometry(B.belly * 0.75, 18, 12), skin, torso, 0, 0.05, 0.14); // belly peeks out under the shirt
    }
    if (L.sauce) {
      const st = mesh(new THREE.SphereGeometry(0.05, 10, 8), toon('#c0392b'), torso, 0.07, 0.28, 0.1 + B.belly * 0.9);
      st.scale.set(1, 0.7, 0.3);
      mesh(new THREE.SphereGeometry(0.022, 8, 6), toon('#c0392b'), torso, 0.01, 0.2, 0.1 + B.belly * 0.88).scale.z = 0.3;
    }
    if (L.bottom === 'skirt' || dressy) {
      const skirtTop = pts.find(([, h]) => h >= 0.05)[0] * 1.02;
      const sk = new THREE.CylinderGeometry(skirtTop, skirtTop * 1.5, 0.5, 20, 1, true);
      sk.translate(0, -0.2, 0);
      const skirt = mesh(sk, toon(L.skirt), torso, 0, 0.06, 0, true);
      skirt.material.side = THREE.DoubleSide;
      skirt.scale.z = B.depth + 0.15;
    }
    // butt, and the shart stain that nobody wants to see
    const hipR = pts.find(([, h]) => h >= 0)[0];
    const buttZ = hipR * B.depth;
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(hipR * 0.55, 12, 10), dressy || L.bottom === 'skirt' ? toon(L.skirt) : pants, torso, sx * hipR * 0.42, 0.0, -buttZ * 0.72);
    this.stainMesh = mesh(new THREE.SphereGeometry(hipR * 0.7, 14, 10), toon('#6b4217'), torso, 0, -0.02, -buttZ - 0.01);
    this.stainMesh.scale.set(1.2, 0.9, 0.3);
    this.stainMesh.visible = false;

    // ---- arms: shoulder + elbow
    const shY = pts.at(-3)[1] - 0.04;
    const makeArm = (side) => {
      const sh = group(torso, side * (B.shoulder + 0.03), shY, 0);
      const upperM = L.sleeves === 'none' ? skin : top;
      limb(sh, 0.056 * B.arm, 0.048 * B.arm, 0.28, L.sleeves === 'short' || L.sleeves === 'long' ? top : upperM);
      const elbow = group(sh, 0, -0.28, 0);
      limb(elbow, 0.046 * B.arm, 0.04 * B.arm, 0.25, L.sleeves === 'long' ? top : skin);
      mesh(new THREE.SphereGeometry(0.05 * B.arm, 10, 8), skin, elbow, 0, -0.29, 0.01, true); // hand
      return { sh, elbow };
    };
    ({ sh: this.armL, elbow: this.elbowL } = makeArm(1));
    ({ sh: this.armR, elbow: this.elbowR } = makeArm(-1));
    if (L.selfie) {
      // selfie stick with a phone on the end
      const st = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6);
      st.translate(0, -0.42, 0);
      mesh(st, toon('#222'), this.elbowR, 0, -0.29, 0.02, true);
      mesh(new THREE.BoxGeometry(0.08, 0.15, 0.015), toon('#111'), this.elbowR, 0, -1.16, 0.03, true);
      this.selfie = true;
    }
    if (L.tool === 'geiger') {
      mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), toon('#f1c40f'), this.elbowR, 0, -0.33, 0.06, true);
      const wand = new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6);
      wand.rotateX(Math.PI / 2);
      mesh(wand, toon('#333'), this.elbowR, 0, -0.33, 0.28);
    } else if (L.tool === 'clipboard') {
      const cb = mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), toon('#8b5a2b'), this.elbowL, 0, -0.3, 0.1, true);
      cb.rotation.x = -0.9;
      const paper = mesh(new THREE.BoxGeometry(0.18, 0.24, 0.005), toon('#ffffff'), cb, 0, 0, 0.013);
      void paper;
    }
    if (L.cane) {
      const wood = toon('#5a3a1e');
      const c = new THREE.CylinderGeometry(0.015, 0.015, 0.78, 6);
      c.translate(0, -0.39, 0);
      mesh(c, wood, this.elbowR, 0, -0.29, 0.06, true);
      const handle = mesh(new THREE.TorusGeometry(0.04, 0.014, 6, 12, Math.PI), wood, this.elbowR, 0, -0.27, 0.1);
      handle.rotation.y = Math.PI / 2;
    }

    // ---- neck + head
    const neckY = pts.at(-2)[1];
    mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.1, 10), skin, torso, 0, neckY + 0.02, 0);
    const hr = L.headR;
    const head = (this.head = group(torso, 0, neckY + 0.06, 0));
    const hy = hr * 0.95;       // head centre above the neck
    this.headMesh = mesh(new THREE.SphereGeometry(hr, 24, 18), this.headMat, head, 0, hy, 0, true);
    this.headMesh.scale.set(0.95, 1.06, 1);
    const eyeY = hy + hr * 0.12, eyeX = hr * 0.36, faceZ = hr * 0.86;
    for (const sx of [-1, 1]) {
      const white = mesh(new THREE.SphereGeometry(hr * 0.22, 12, 10), toon('#ffffff'), head, sx * eyeX, eyeY, faceZ);
      white.scale.set(0.85, 1.1, 0.6);
      mesh(new THREE.SphereGeometry(hr * 0.11, 10, 8), toon('#1a1a1a'), head, sx * eyeX, eyeY - hr * 0.02, faceZ + hr * 0.12);
      mesh(new THREE.SphereGeometry(hr * 0.2, 8, 6), this.headMat, head, sx * hr * 0.93, hy, 0); // ears
      const brow = mesh(new THREE.BoxGeometry(hr * 0.36, hr * 0.07, hr * 0.06), hairM, head, sx * eyeX, eyeY + hr * 0.3, faceZ + hr * 0.02);
      brow.rotation.z = sx * -0.15;
      if (L.glasses) {
        const gl = mesh(new THREE.TorusGeometry(hr * 0.24, hr * 0.03, 6, 16), toon('#222'), head, sx * eyeX, eyeY, faceZ + hr * 0.16);
        void gl;
      }
      if (L.freckles) for (let k = 0; k < 3; k++) mesh(new THREE.SphereGeometry(hr * 0.03, 6, 4), toon('#c0703f'), head, sx * (hr * 0.38 + k * hr * 0.07), eyeY - hr * 0.3 - (k % 2) * hr * 0.05, faceZ + hr * 0.05);
    }
    if (L.shades) {
      mesh(new THREE.BoxGeometry(hr * 1.3, hr * 0.26, hr * 0.1), toon('#111'), head, 0, eyeY, faceZ + hr * 0.14);
    }
    mesh(new THREE.SphereGeometry(hr * 0.17, 10, 8), this.kind === 'hero' && L.build === 'fat' ? toon('#e8907a') : this.headMat, head, 0, hy - hr * 0.1, hr * 0.98).scale.set(1, 1, 1.2); // nose
    this.mouth = mesh(new THREE.SphereGeometry(hr * 0.2, 12, 8), toon(L.lips ? '#b03a48' : '#5a1a1a'), head, 0, hy - hr * 0.45, hr * 0.84);
    this.mouth.scale.set(1.2, 0.3, 0.4);
    if (L.mustache) {
      const mst = mesh(new THREE.CapsuleGeometry(hr * (L.mustacheBig ? 0.13 : 0.1), hr * (L.mustacheBig ? 0.75 : 0.6), 4, 8), hairM, head, 0, hy - hr * 0.3, hr * 0.92);
      mst.rotation.z = Math.PI / 2;
    }
    if (L.stubble || L.beard) {
      const st = mesh(new THREE.SphereGeometry(hr * 1.02, 18, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.32), toon(L.beard ? L.hairColor : '#6b5646'), head, 0, hy, 0.005);
      st.scale.set(0.95, 1.06, 1);
      if (!L.beard) { st.material = st.material.clone(); st.material.transparent = true; st.material.opacity = 0.4; }
    }
    // hair
    const cap = (from, to, scale = 1.07) => {
      const m = mesh(new THREE.SphereGeometry(hr * scale, 20, 12, 0, Math.PI * 2, from, to), hairM, head, 0, hy, -hr * 0.03, true);
      m.scale.set(0.95, 1.06, 1);
      return m;
    };
    switch (L.hair) {
      case 'ring': {
        // bald on top, a ring of hair around the back
        const ring = mesh(new THREE.TorusGeometry(hr * 0.88, hr * 0.17, 8, 20, Math.PI), hairM, head, 0, hy - hr * 0.05, -hr * 0.05);
        ring.rotation.set(Math.PI / 2, 0, Math.PI);
        break;
      }
      case 'short': cap(0, Math.PI * 0.42); break;
      case 'curly':
        cap(0, Math.PI * 0.38);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          mesh(new THREE.SphereGeometry(hr * 0.24, 8, 6), hairM, head, Math.sin(a) * hr * 0.62, hy + hr * 0.72, Math.cos(a) * hr * 0.62 - hr * 0.05);
        }
        break;
      case 'mop':
        cap(0, Math.PI * 0.5, 1.1);
        for (let k = -2; k <= 2; k++) mesh(new THREE.SphereGeometry(hr * 0.2, 8, 6), hairM, head, k * hr * 0.2, hy + hr * 0.65, hr * 0.72);
        break;
      case 'cap': {
        cap(0, Math.PI * 0.42);
        // backwards cap: the universal sign of a man who appreciates a good fart
        const cm = toon(L.cap);
        mesh(new THREE.SphereGeometry(hr * 1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), cm, head, 0, hy + hr * 0.05, 0, true);
        const bill = mesh(new THREE.BoxGeometry(hr * 1.2, hr * 0.1, hr * 0.9), cm, head, 0, hy + hr * 0.45, -hr * 1.2);
        bill.rotation.x = -0.2;
        break;
      }
      case 'bun':
        cap(0, Math.PI * 0.55, 1.06);
        mesh(new THREE.SphereGeometry(hr * 0.4, 12, 10), hairM, head, 0, hy + hr * 0.45, -hr * 0.85, true);
        break;
      case 'hood': {
        // hazmat hood: covers the whole head, only the mask shows
        const hood = mesh(new THREE.SphereGeometry(hr * 1.18, 20, 14), hairM, head, 0, hy, -hr * 0.02, true);
        hood.scale.set(1, 1.1, 1);
        break;
      }
      case 'long': {
        cap(0, Math.PI * 0.55, 1.08);
        // hair strands: neat when calm, blown wild after a close blast
        this.strands = [];
        const n = 11, len = L.hairLen;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * 0.38 + (i / (n - 1)) * Math.PI * 1.24; // sides and back, not over the face
          const piv = group(head, Math.sin(a) * hr * 0.75, hy + hr * 0.55, Math.cos(a) * hr * 0.75 - hr * 0.05);
          const g = new THREE.CapsuleGeometry(hr * 0.26, len, 3, 6);
          mesh(g, hairM, piv, 0, -len / 2 - hr * 0.15, 0);
          const neat = new THREE.Vector3(Math.sin(a) * 0.3, -1, Math.cos(a) * 0.3 - 0.1).normalize();
          const wild = new THREE.Vector3(Math.sin(a) * (0.8 + r()), 0.3 + r() * 1.6, Math.cos(a) * (0.8 + r()) + (r() - 0.5)).normalize();
          this.strands.push({ piv, neat, wild, wob: r() * 6 });
        }
        break;
      }
    }
    if (L.hat) {
      const hm = toon(L.hat);
      const brim = mesh(new THREE.CylinderGeometry(hr * 2.3, hr * 2.3, hr * 0.06, 28), hm, head, 0, hy + hr * 0.62, 0, true);
      brim.rotation.x = -0.1;
      mesh(new THREE.CylinderGeometry(hr * 0.95, hr * 1.02, hr * 0.55, 22), hm, head, 0, hy + hr * 0.9, -hr * 0.05, true);
      mesh(new THREE.CylinderGeometry(hr * 1.03, hr * 1.03, hr * 0.14, 22), toon(L.hatBand), head, 0, hy + hr * 0.72, -hr * 0.05);
    }
    if (L.pearls) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        mesh(new THREE.SphereGeometry(0.014, 6, 4), toon('#fffaf0'), torso, Math.sin(a) * 0.075, neckY - 0.01 - Math.max(0, Math.cos(a)) * 0.04, Math.cos(a) * 0.06);
      }
    }
    if (L.mask) {
      // gas mask: a dark visor and two filter cans
      const visor = mesh(new THREE.SphereGeometry(hr * 0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), toon('#223344'), head, 0, hy + hr * 0.05, hr * 0.62);
      visor.rotation.x = Math.PI / 2;
      visor.scale.set(1, 0.5, 0.8);
      for (const sx of [-1, 1]) {
        const can = mesh(new THREE.CylinderGeometry(hr * 0.2, hr * 0.2, hr * 0.3, 10), toon('#555'), head, sx * hr * 0.42, hy - hr * 0.45, hr * 0.95, true);
        can.rotation.x = Math.PI / 2;
      }
    }
    if (L.flatCap) {
      const fc = toon(L.flatCap);
      const c = mesh(new THREE.CylinderGeometry(hr * 1.02, hr * 1.08, hr * 0.32, 20), fc, head, 0, hy + hr * 0.78, -hr * 0.04, true);
      c.rotation.x = -0.12;
      const brim = mesh(new THREE.BoxGeometry(hr * 1.4, hr * 0.08, hr * 0.6), fc, head, 0, hy + hr * 0.68, hr * 0.9);
      brim.rotation.x = 0.25;
    }

    // world-space measurements (the whole body is scaled by L.s)
    const s = L.s;
    R.scale.setScalar(s);
    this.height = (hipY + neckY + 0.06 + hy + hr * 1.06) * s;
    this.mouthZ = (hr + 0.05) * s;
    this.mouthY = (hipY + neckY + 0.06 + hy - hr * 0.45) * s;
    this.buttY = hipY * s;
    this.buttZ = (buttZ + 0.05) * s;
    this.armOut = this.kind === 'hero' && L.build === 'fat' ? 0.3 : 0.1;
  }

  // Positions all parts for state s. t = seconds, for idle wiggles.
  apply(s, t) {
    const R = this.root;
    R.position.set(s.x, 0, s.z);
    R.rotation.y = s.rot;
    const mv = s.move, w = s.walk;
    const sw = Math.sin(w) * 0.7 * mv;
    const out = this.armOut;
    // walking: legs swing, the knee bends on the back swing, arms swing the other way
    this.legL.rotation.set(sw, 0, 0);
    this.legR.rotation.set(-sw, 0, 0);
    this.kneeL.rotation.set(Math.max(0, sw) * 1.3 + 0.05, 0, 0);
    this.kneeR.rotation.set(Math.max(0, -sw) * 1.3 + 0.05, 0, 0);
    this.armL.rotation.set(-sw * 0.8, 0, out);
    this.armR.rotation.set(sw * 0.8, 0, -out);
    this.elbowL.rotation.set(-0.25 - mv * 0.3, 0, 0);
    this.elbowR.rotation.set(-0.25 - mv * 0.3, 0, 0);
    this.hip.position.y = this.hipY + Math.abs(Math.cos(w)) * 0.04 * mv;
    this.hip.rotation.set(0, 0, Math.sin(w) * 0.05 * mv);
    this.torso.rotation.set(0, Math.sin(w) * 0.08 * mv, 0);
    this.head.rotation.set(0, 0, 0);
    if (this.selfie && s.pose === POSE.NORMAL) {
      // holds the selfie stick forward like a sceptre
      this.armR.rotation.set(-0.35, 0, -0.1);
      this.elbowR.rotation.set(-1.25, 0, 0);
    }
    if (this.hunch && s.pose === POSE.NORMAL) {
      // an old back: bent forward, head up, the cane taps along
      this.torso.rotation.x = this.hunch;
      this.head.rotation.x = -this.hunch * 0.8;
      this.armR.rotation.set(-0.35 + Math.sin(w) * 0.25 * mv, 0, -0.1);
      this.elbowR.rotation.set(-0.1, 0, 0);
    }
    let mouthOpen = 0.35;
    switch (s.pose) {
      case POSE.THUMBS: {
        this.armR.rotation.set(-2.6 + Math.sin(t * 14) * 0.25, 0, -0.2);
        this.elbowR.rotation.set(-0.3, 0, 0);
        this.armL.rotation.set(-0.6, 0, 0.4);
        this.elbowL.rotation.set(-1.2, 0, 0);
        this.hip.position.y += Math.abs(Math.sin(t * 9)) * 0.08;
        mouthOpen = 1.3;
        break;
      }
      case POSE.FLEE: {
        this.armR.rotation.set(-1.25, 0, 0.35);         // pinch the nose
        this.elbowR.rotation.set(-1.9, 0, 0);
        this.armL.rotation.set(-2.6 + Math.sin(t * 20) * 0.6, 0, 0.8); // flail
        this.elbowL.rotation.set(-0.4, 0, 0);
        this.torso.rotation.x = 0.2;
        mouthOpen = 1;
        break;
      }
      case POSE.CURSE: {
        this.armR.rotation.set(-2.7 + Math.sin(t * 22) * 0.3, 0, -0.1);
        this.elbowR.rotation.set(-0.7, 0, 0);
        this.armL.rotation.set(0.2, 0, 0.7);            // hand on hip
        this.elbowL.rotation.set(-1.6, 0.6, 0);
        this.torso.rotation.x = -0.08 + Math.sin(t * 22) * 0.03;
        mouthOpen = 1.8;
        break;
      }
      case POSE.SHOCK: {
        this.armL.rotation.set(-0.3, 0, 2.2);
        this.armR.rotation.set(-0.3, 0, -2.2);
        this.elbowL.rotation.set(-0.5, 0, 0);
        this.elbowR.rotation.set(-0.5, 0, 0);
        this.torso.rotation.x = -0.18;
        mouthOpen = 2;
        break;
      }
      case POSE.FART: {
        // the push: knees bent, bum out, fists clenched
        const q = 0.1 + Math.sin(t * 30) * 0.015;
        this.hip.position.y -= q;
        this.legL.rotation.set(-0.55, 0, 0.08); this.legR.rotation.set(-0.55, 0, -0.08);
        this.kneeL.rotation.set(0.9, 0, 0); this.kneeR.rotation.set(0.9, 0, 0);
        this.torso.rotation.x = 0.4;
        this.head.rotation.x = -0.4;
        this.armL.rotation.set(-0.4, 0, 0.5); this.armR.rotation.set(-0.4, 0, -0.5);
        this.elbowL.rotation.set(-1.4, 0, 0); this.elbowR.rotation.set(-1.4, 0, 0);
        mouthOpen = 0.9;
        break;
      }
      case POSE.BURP: {
        this.torso.rotation.x = -0.28;
        this.head.rotation.x = -0.45;
        this.armL.rotation.set(0.1, 0, 0.7); this.armR.rotation.set(0.1, 0, -0.7);
        this.elbowL.rotation.set(-0.8, 0, 0); this.elbowR.rotation.set(-0.8, 0, 0);
        mouthOpen = 2.4;
        break;
      }
      case POSE.SHART: {
        // knees together, both hands on the bum
        this.legL.rotation.set(0, 0, -0.12); this.legR.rotation.set(0, 0, 0.12);
        this.kneeL.rotation.set(0.35, 0, 0); this.kneeR.rotation.set(0.35, 0, 0);
        this.armL.rotation.set(0.7, 0, 0.3); this.armR.rotation.set(0.7, 0, -0.3);
        this.elbowL.rotation.set(-0.9, 0, 0); this.elbowR.rotation.set(-0.9, 0, 0);
        this.torso.rotation.x = 0.2 + Math.sin(t * 25) * 0.04;
        this.hip.position.y -= 0.06;
        mouthOpen = 1.5;
        break;
      }
      case POSE.EAT: {
        this.armR.rotation.set(-1.1, 0, 0.3);
        this.elbowR.rotation.set(-2 + Math.sin(t * 18) * 0.25, 0, 0);
        mouthOpen = 1 + Math.abs(Math.sin(t * 18));
        break;
      }
      case POSE.DAZED: {
        // seeing stars: wobbling in circles, arms dangling
        this.torso.rotation.set(Math.cos(t * 6) * 0.12, 0, Math.sin(t * 6) * 0.15);
        this.head.rotation.set(Math.cos(t * 6 + 1) * 0.2, 0, Math.sin(t * 6 + 1) * 0.3);
        this.armL.rotation.set(0, 0, 0.25 + Math.sin(t * 6) * 0.2); this.armR.rotation.set(0, 0, -0.25 + Math.sin(t * 6) * 0.2);
        this.elbowL.rotation.set(0, 0, 0); this.elbowR.rotation.set(0, 0, 0);
        this.kneeL.rotation.set(0.25, 0, 0); this.kneeR.rotation.set(0.25, 0, 0);
        mouthOpen = 1.2;
        break;
      }
      case POSE.SELFIE: {
        // stick up and out, head tilted, duck face
        this.armR.rotation.set(-2.2, 0, -0.5);
        this.elbowR.rotation.set(-0.15, 0, 0);
        this.armL.rotation.set(0.1, 0, 0.5);
        this.elbowL.rotation.set(-1.7, 0, 0);
        this.head.rotation.set(-0.1, 0.25, 0.2);
        mouthOpen = 0.9;
        break;
      }
      case POSE.CHASE: {
        // stick raised high, ready to strike
        this.armR.rotation.set(-2.9 + Math.sin(t * 16) * 0.35, 0, -0.15);
        this.elbowR.rotation.set(-0.4 + Math.sin(t * 16) * 0.3, 0, 0);
        this.armL.rotation.set(-sw * 1.2, 0, 0.3);
        this.torso.rotation.x = 0.15;
        mouthOpen = 2;
        break;
      }
      case POSE.MEASURE: {
        // Geiger counter held out, sweeping
        this.armR.rotation.set(-1.2 + Math.sin(t * 3) * 0.2, Math.sin(t * 2) * 0.4, -0.1);
        this.elbowR.rotation.set(-0.2, 0, 0);
        this.torso.rotation.x = 0.25;
        this.head.rotation.x = 0.3;
        break;
      }
      case POSE.WRITE: {
        this.armL.rotation.set(-0.9, 0, 0.2);
        this.elbowL.rotation.set(-0.9, 0, 0);
        this.armR.rotation.set(-0.8, 0, -0.1);
        this.elbowR.rotation.set(-1.2 + Math.sin(t * 20) * 0.1, 0, 0);
        this.head.rotation.x = 0.35;
        break;
      }
      case POSE.TALK: {
        // chatting: hands going like a real Italian
        const k = this.seed % 7;
        this.armR.rotation.set(-0.6 + Math.sin(t * (3 + k * 0.3) + k) * 0.35, 0, -0.3 + Math.sin(t * 2.1 + k) * 0.15);
        this.elbowR.rotation.set(-1.3 + Math.sin(t * 4 + k) * 0.4, 0, 0);
        this.armL.rotation.set(-0.3 + Math.sin(t * 2.7 + k * 2) * 0.25, 0, 0.25);
        this.elbowL.rotation.set(-1 + Math.sin(t * 3.3 + k) * 0.3, 0, 0);
        this.head.rotation.x = Math.sin(t * 2.3 + k) * 0.08;
        mouthOpen = 0.6 + Math.abs(Math.sin(t * 11 + k)) * 1.1;
        break;
      }
    }
    if (this.belly) {
      const j = Math.sin(w * 2) * 0.04 * mv + (s.pose === POSE.FART ? Math.sin(t * 40) * 0.03 : 0);
      const [bx, by, bz] = this.bellyScale;
      this.belly.scale.set(bx + j * 0.5, by - j, bz + j * 0.5);
    }
    this.mouth.scale.set(1.2, 0.3 * mouthOpen, 0.4);
    // face tint: green from stench, red from rage
    skinTmp.copy(this.skin);
    if (s.green > 0) skinTmp.lerp(GREEN, Math.min(1, s.green) * 0.8);
    if (s.red > 0) skinTmp.lerp(RED, Math.min(1, s.red) * 0.6);
    this.headMat.color.copy(skinTmp);
    if (this.strands) {
      const h = Math.min(1, s.hair);
      for (const st of this.strands) {
        tmpV.copy(st.neat).lerp(st.wild, h);
        if (h > 0.05) tmpV.x += Math.sin(t * 9 + st.wob) * 0.15 * h;
        tmpV.normalize();
        st.piv.quaternion.setFromUnitVectors(DOWN, tmpV);
      }
    }
    this.stainMesh.visible = s.stain > 0;
  }
}

export function newState(x = 0, z = 0) {
  return { x, z, rot: 0, walk: 0, move: 0, pose: 0, hair: 0, green: 0, red: 0, stain: 0 };
}
