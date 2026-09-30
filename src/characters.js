// Cartoon characters built from simple shapes. One Character draws one state object:
// { x, z, rot, walk, move, pose, hair, green, red, stain } - the same numbers the replay stores.
import * as THREE from 'three';

export const POSE = { NORMAL: 0, THUMBS: 1, FLEE: 2, CURSE: 3, SHOCK: 4, FART: 5, BURP: 6, SHART: 7, EAT: 8, TALK: 9 };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const toon = (c) => new THREE.MeshToonMaterial({ color: c });
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2b1d0e', side: THREE.BackSide });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0, outline = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1 + outline);
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

const SKINS = ['#f2c9a0', '#e0ac7e', '#c68a5e', '#8d5a3b', '#f5d6b8', '#a86b45'];
const SHIRTS = ['#e74c3c', '#3498db', '#1abc9c', '#9b59b6', '#f1c40f', '#e67e22', '#2ecc71', '#34495e', '#ff7eb6', '#ffffff'];
const PANTS = ['#2c3e50', '#34495e', '#7f8c8d', '#6d4c41', '#1e3a5f', '#c2b280'];
const HAIRS = ['#2b1a10', '#5a3a1e', '#d9a441', '#a0522d', '#111', '#c0392b', '#e8d8b0'];
const DOWN = new THREE.Vector3(0, -1, 0);
const tmpV = new THREE.Vector3();
const skinTmp = new THREE.Color();
const GREEN = new THREE.Color('#7bd13a');
const RED = new THREE.Color('#ff3b2f');

// How each playable hero looks. s = overall size (pedestrians are about 1.95 m).
// All heroes share one body layout; the numbers change the build.
export const HERO_LOOKS = {
  fat: { s: 0.66, skin: '#f0b98f', leg: 0.26, waist: [0.55, 0.52], belly: 0.66, bellyScale: [1, 1.08, 1.05], chest: 0.52, arm: 0.64,
    shirt: '#fbfbf6', sleeveless: true, pants: '#3b6fb6', longPants: false, shoes: '#6b3d1d', headR: 0.42, hair: 'ring', hairColor: '#3a2616',
    mustache: true, sauce: true, peek: true },
  man: { s: 0.63, skin: '#e6b08a', leg: 0.2, waist: [0.4, 0.38], belly: 0.46, bellyScale: [1, 1.3, 0.82], chest: 0.46, arm: 0.54,
    shirt: '#2f6db5', pants: '#2c3e50', longPants: true, shoes: '#222', headR: 0.38, hair: 'short', hairColor: '#2b1a10', stubble: true },
  boy: { s: 0.44, skin: '#f5d0ae', leg: 0.2, waist: [0.38, 0.36], belly: 0.42, bellyScale: [1, 1.25, 0.9], chest: 0.4, arm: 0.5,
    shirt: '#e74c3c', stripes: '#ffffff', pants: '#d9a441', longPants: false, shoes: '#2980b9', headR: 0.52, hair: 'mop', hairColor: '#6b3d1d' },
  old: { s: 0.6, skin: '#e8c0a0', leg: 0.2, waist: [0.4, 0.38], belly: 0.44, bellyScale: [1, 1.3, 0.9], chest: 0.44, arm: 0.54,
    shirt: '#8b6b4a', pants: '#8a8a8a', longPants: true, shoes: '#3a2616', headR: 0.39, hair: 'ring', hairColor: '#eeeeee',
    mustache: true, mustacheBig: true, flatCap: '#4d4d4d', glasses: true, cane: true, hunch: 0.35 },
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
    const look = kind === 'hero' ? HERO_LOOKS[variant] || HERO_LOOKS.fat : null;
    this.skin = new THREE.Color(look ? look.skin : pickC(SKINS));
    this.headMat = new THREE.MeshToonMaterial({ color: this.skin.clone() });
    const skinMat = toon(this.skin);
    if (look) this.buildHero(look, skinMat);
    else this.buildPerson(kind, skinMat, r, pickC);
  }

  buildHero(L, skinMat) {
    const R = this.root;
    const pants = toon(L.pants), shirt = toon(L.shirt), hairM = toon(L.hairColor), dark = toon('#3a2616');
    this.hunch = L.hunch || 0;
    this.hip = group(R, 0, 0.95, 0);
    this.legL = group(R, L.leg, 0.95, 0);
    this.legR = group(R, -L.leg, 0.95, 0);
    for (const G of [this.legL, this.legR]) {
      mesh(new THREE.CylinderGeometry(0.2 + L.waist[0] * 0.07, 0.2, 0.4, 14), pants, G, 0, -0.12, 0, 0.05);
      mesh(new THREE.CapsuleGeometry(L.longPants ? 0.15 : 0.14, 0.45, 4, 10), L.longPants ? pants : skinMat, G, 0, -0.52, 0, 0.06);
      mesh(new THREE.BoxGeometry(0.26, 0.1, 0.45), toon(L.shoes), G, 0, -0.9, 0.08, 0.06);
    }
    const torso = (this.torso = group(this.hip));
    mesh(new THREE.CylinderGeometry(L.waist[0], L.waist[1], 0.38, 20), pants, torso, 0, 0.05, 0, 0.03);
    // the belly peeking out under the marcelleke
    if (L.peek) mesh(new THREE.SphereGeometry(0.5, 22, 16), skinMat, torso, 0, 0.38, 0.16, 0.03);
    this.belly = mesh(new THREE.SphereGeometry(L.belly, 24, 18), shirt, torso, 0, 0.82, 0.02, 0.03);
    this.bellyScale = L.bellyScale;
    this.belly.scale.set(...L.bellyScale);
    mesh(new THREE.SphereGeometry(L.chest, 20, 14), shirt, torso, 0, 1.3, -0.02, 0.03);
    if (L.stripes) {
      // striped T-shirt
      for (const y of [0.62, 0.9, 1.18]) {
        const dy = (y - 0.82) / (L.belly * L.bellyScale[1]);
        const rr = L.belly * Math.sqrt(Math.max(0.05, 1 - dy * dy)) * 1.01;
        const st = mesh(new THREE.TorusGeometry(rr, 0.035, 6, 28), toon(L.stripes), torso, 0, y, 0.02);
        st.rotation.x = Math.PI / 2;
        st.scale.set(1, L.bellyScale[2], 1);
      }
    }
    // shoulders: bare in a marcelleke, covered otherwise
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.2, 12, 10), L.sleeveless ? skinMat : shirt, torso, sx * (L.arm - 0.16), 1.38, 0);
    if (L.sauce) {
      // tomato sauce stain, of course
      const stain = mesh(new THREE.SphereGeometry(0.13, 10, 8), toon('#c0392b'), torso, 0.18, 1.05, 0.68);
      stain.scale.set(1, 0.7, 0.25);
      mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#c0392b'), torso, 0.04, 0.9, 0.7).scale.z = 0.3;
    }
    // butt
    const buttX = Math.min(0.19, L.waist[0] * 0.36), buttR = Math.min(0.29, L.waist[0] * 0.55), buttZ = L.waist[0] * 0.58;
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(buttR, 14, 12), pants, torso, sx * buttX, 0.12, -buttZ, 0.04);
    this.stainMesh = mesh(new THREE.SphereGeometry(0.34, 14, 10), toon('#6b4217'), torso, 0, 0.0, -buttZ - buttR * 0.8);
    this.stainMesh.scale.set(buttR * 4, buttR * 3, 0.35);
    this.stainMesh.visible = false;
    // arms
    this.armL = group(torso, L.arm, 1.32, 0);
    this.armR = group(torso, -L.arm, 1.32, 0);
    for (const A of [this.armL, this.armR]) {
      mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 10), L.sleeveless ? skinMat : shirt, A, 0, -0.38, 0, 0.06);
      mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat, A, 0, -0.78, 0, 0.06);
    }
    if (L.cane) {
      const wood = toon('#5a3a1e');
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6), wood, this.armR, 0, -1.25, 0.08);
      const handle = mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12, Math.PI), wood, this.armR, 0, -0.74, 0.18);
      handle.rotation.y = Math.PI / 2;
    }
    // head
    const hr = L.headR;
    const head = (this.head = group(torso, 0, 1.62, 0));
    this.headMesh = mesh(new THREE.SphereGeometry(hr, 22, 16), this.headMat, head, 0, 0.3, 0, 0.05);
    mesh(new THREE.SphereGeometry(hr * 0.28, 10, 8), toon('#e8907a'), head, 0, 0.27, hr * 0.98); // nose
    for (const sx of [-1, 1]) {
      mesh(new THREE.SphereGeometry(hr * 0.2, 10, 8), toon('#fff'), head, sx * hr * 0.36, 0.4, hr * 0.83);
      mesh(new THREE.SphereGeometry(hr * 0.1, 8, 6), toon('#111'), head, sx * hr * 0.36, 0.4, hr * 1.02);
      mesh(new THREE.SphereGeometry(hr * 0.24, 8, 6), this.headMat, head, sx * hr, 0.28, 0); // ears
      const brow = mesh(new THREE.BoxGeometry(hr * 0.38, 0.04, 0.04), L.hair === 'ring' ? hairM : dark, head, sx * hr * 0.36, 0.3 + hr * 0.52, hr * 0.88);
      brow.rotation.z = sx * -0.2;
      if (L.glasses) mesh(new THREE.TorusGeometry(hr * 0.24, 0.02, 6, 16), toon('#222'), head, sx * hr * 0.36, 0.4, hr * 1.05);
    }
    if (L.mustache) {
      const mst = mesh(new THREE.CapsuleGeometry(L.mustacheBig ? 0.08 : 0.06, L.mustacheBig ? 0.4 : 0.3, 4, 8), hairM, head, 0, 0.16, hr * 0.93);
      mst.rotation.z = Math.PI / 2;
    }
    if (L.stubble) {
      const st = mesh(new THREE.SphereGeometry(hr * 1.01, 18, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.3), toon('#5a4636'), head, 0, 0.3, 0);
      st.material.transparent = true;
      st.material.opacity = 0.45;
    }
    if (L.hair === 'ring') {
      // bald on top, a ring of hair around the back
      const ring = mesh(new THREE.TorusGeometry(hr * 0.9, 0.08, 8, 20, Math.PI), hairM, head, 0, 0.3, 0);
      ring.rotation.set(Math.PI / 2, 0, Math.PI);
    } else if (L.hair === 'short') {
      mesh(new THREE.SphereGeometry(hr * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, head, 0, 0.3, -0.02, 0.03);
    } else if (L.hair === 'mop') {
      mesh(new THREE.SphereGeometry(hr * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, head, 0, 0.32, -0.02, 0.03);
      for (let k = -2; k <= 2; k++) mesh(new THREE.SphereGeometry(hr * 0.2, 8, 6), hairM, head, k * hr * 0.2, 0.3 + hr * 0.7, hr * 0.72);
    }
    if (L.flatCap) {
      const cap = mesh(new THREE.CylinderGeometry(hr * 1.02, hr * 1.06, hr * 0.3, 20), toon(L.flatCap), head, 0, 0.3 + hr * 0.78, -0.02, 0.04);
      cap.rotation.x = -0.12;
      const brim = mesh(new THREE.BoxGeometry(hr * 1.4, 0.04, hr * 0.6), toon(L.flatCap), head, 0, 0.3 + hr * 0.68, hr * 0.9);
      brim.rotation.x = 0.2;
    }
    this.mouth = mesh(new THREE.SphereGeometry(hr * 0.17, 10, 8), toon('#5a1a1a'), head, 0, 0.06 + (0.42 - hr) * 0.2, hr * 0.9);
    this.mouth.scale.set(1.2, 0.3, 0.5);
    // world-space sizes: the whole body is scaled by L.s
    R.scale.setScalar(L.s);
    this.height = (0.95 + 1.62 + 0.3 + hr) * L.s;
    this.mouthZ = (hr + 0.08) * L.s;
    this.mouthY = (0.95 + 1.62 + 0.1) * L.s;
    this.buttY = 0.95 * L.s;
    this.buttZ = (buttZ + buttR) * L.s;
  }

  buildPerson(kind, skinMat, r, pickC) {
    const R = this.root;
    const woman = kind === 'woman';
    const s = woman ? 0.95 : 1.0;
    const shirt = toon(pickC(SHIRTS)), pants = toon(pickC(PANTS));
    this.height = 1.95 * s;
    this.hip = group(R, 0, 0.9 * s, 0);
    this.legL = group(R, 0.15, 0.9 * s, 0);
    this.legR = group(R, -0.15, 0.9 * s, 0);
    for (const L of [this.legL, this.legR]) {
      mesh(new THREE.CapsuleGeometry(0.11, 0.6 * s, 4, 8), woman ? skinMat : pants, L, 0, -0.42 * s, 0, 0.08);
      mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), toon(woman ? '#c0392b' : '#222'), L, 0, -0.85 * s, 0.05, 0.08);
    }
    const torso = (this.torso = group(this.hip));
    mesh(new THREE.CapsuleGeometry(0.3, 0.5 * s, 4, 12), shirt, torso, 0, 0.5 * s, 0, 0.06);
    if (woman) {
      const skirt = mesh(new THREE.ConeGeometry(0.48, 0.75, 16, 1, true), toon(pickC(['#e84393', '#6c5ce7', '#00b894', '#fdcb6e', '#d63031', '#0984e3'])), torso, 0, 0.05, 0, 0.04);
      skirt.material.side = THREE.DoubleSide;
    }
    this.armL = group(torso, 0.38, 0.82 * s, 0);
    this.armR = group(torso, -0.38, 0.82 * s, 0);
    for (const A of [this.armL, this.armR]) {
      mesh(new THREE.CapsuleGeometry(0.085, 0.45 * s, 4, 8), shirt, A, 0, -0.3 * s, 0, 0.08);
      mesh(new THREE.SphereGeometry(0.09, 8, 6), skinMat, A, 0, -0.62 * s, 0);
    }
    this.armL.rotation.z = 0.12; this.armR.rotation.z = -0.12;
    const head = (this.head = group(torso, 0, 1.08 * s, 0));
    this.headMesh = mesh(new THREE.SphereGeometry(0.27, 16, 12), this.headMat, head, 0, 0.25, 0, 0.06);
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.04, 8, 6), toon('#111'), head, sx * 0.1, 0.3, 0.24);
    mesh(new THREE.SphereGeometry(0.05, 8, 6), this.headMat, head, 0, 0.24, 0.27); // nose
    this.mouth = mesh(new THREE.SphereGeometry(0.05, 8, 6), toon('#5a1a1a'), head, 0, 0.14, 0.24);
    this.mouth.scale.set(1.2, 0.3, 0.5);
    const hairC = toon(pickC(HAIRS));
    if (woman) {
      mesh(new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairC, head, 0, 0.27, -0.02, 0.04);
      // hair strands: neat when calm, blown wild after a close blast
      this.strands = [];
      const n = 14, long = 0.35 + r() * 0.3;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.35 + (i / (n - 1)) * Math.PI * 1.3; // sides and back, not over the face
        const piv = group(head, Math.sin(a) * 0.2, 0.36, Math.cos(a) * 0.2 - 0.02);
        mesh(new THREE.CapsuleGeometry(0.065, long, 3, 6), hairC, piv, 0, -long / 2 - 0.05, 0);
        const neat = new THREE.Vector3(Math.sin(a) * 0.35, -1, Math.cos(a) * 0.35).normalize();
        const wild = new THREE.Vector3(Math.sin(a) * (0.8 + r()), 0.3 + r() * 1.6, Math.cos(a) * (0.8 + r()) + (r() - 0.5)).normalize();
        this.strands.push({ piv, neat, wild, wob: r() * 6 });
      }
    } else {
      mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hairC, head, 0, 0.27, -0.01);
      if (kind === 'fan') {
        // backwards cap: the universal sign of a man who appreciates a good fart
        const capC = toon(pickC(['#e74c3c', '#2980b9', '#27ae60', '#111', '#f39c12']));
        mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), capC, head, 0, 0.3, 0, 0.05);
        const bill = mesh(new THREE.BoxGeometry(0.34, 0.04, 0.26), capC, head, 0, 0.36, -0.36);
        bill.rotation.x = -0.15;
      } else if (r() < 0.3) {
        // a few men get sunglasses
        mesh(new THREE.BoxGeometry(0.34, 0.08, 0.05), toon('#111'), head, 0, 0.31, 0.25);
      }
    }
    this.mouthZ = 0.3; this.mouthY = 1.08 * s + 0.9 * s + 0.14;
  }

  // Positions all parts for state s. t = seconds, for idle wiggles.
  apply(s, t) {
    const R = this.root;
    R.position.set(s.x, 0, s.z);
    R.rotation.y = s.rot;
    const mv = s.move, w = s.walk;
    const sw = Math.sin(w) * 0.75 * mv;
    const gino = this.kind === 'hero';
    this.legL.rotation.set(sw, 0, 0);
    this.legR.rotation.set(-sw, 0, 0);
    this.armL.rotation.set(-sw * 0.9, 0, gino ? 0.3 : 0.12);
    this.armR.rotation.set(sw * 0.9, 0, gino ? -0.3 : -0.12);
    this.hip.position.y = (gino ? 0.95 : 0.9) + Math.abs(Math.cos(w)) * 0.06 * mv;
    this.hip.rotation.set(0, 0, Math.sin(w) * 0.06 * mv);
    this.torso.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    if (this.hunch && s.pose === POSE.NORMAL) {
      // an old back: bent forward, head up, the cane taps along
      this.torso.rotation.x = this.hunch;
      this.head.rotation.x = -this.hunch * 0.8;
      this.armR.rotation.set(-0.35 + Math.sin(w) * 0.25 * mv, 0, -0.1);
    }
    let mouthOpen = 0.3;
    switch (s.pose) {
      case POSE.THUMBS: {
        this.armR.rotation.set(-2.7 + Math.sin(t * 14) * 0.25, 0, -0.2);
        this.hip.position.y += Math.abs(Math.sin(t * 9)) * 0.12;
        mouthOpen = 1;
        break;
      }
      case POSE.FLEE: {
        this.armR.rotation.set(-2.3, 0, 0.9);          // pinch the nose
        this.armL.rotation.set(-2.6 + Math.sin(t * 20) * 0.6, 0, 0.9); // flail
        this.torso.rotation.x = 0.25;
        mouthOpen = 0.8;
        break;
      }
      case POSE.CURSE: {
        this.armR.rotation.set(-2.9 + Math.sin(t * 22) * 0.35, 0, -0.1);
        this.armL.rotation.set(-0.3, 0, 0.9);           // hand on hip
        this.torso.rotation.x = -0.1 + Math.sin(t * 22) * 0.04;
        mouthOpen = 1.4;
        break;
      }
      case POSE.SHOCK: {
        this.armL.rotation.set(-0.2, 0, 2.3);
        this.armR.rotation.set(-0.2, 0, -2.3);
        this.torso.rotation.x = -0.2;
        mouthOpen = 1.6;
        break;
      }
      case POSE.FART: {
        const q = 0.15 + Math.sin(t * 30) * 0.03;
        this.hip.position.y -= q;
        this.torso.rotation.x = 0.45;
        this.head.rotation.x = -0.35;
        this.legL.rotation.x = -0.5; this.legR.rotation.x = -0.5;
        this.armL.rotation.set(0.3, 0, 0.5); this.armR.rotation.set(0.3, 0, -0.5);
        mouthOpen = 0.8;
        break;
      }
      case POSE.BURP: {
        this.torso.rotation.x = -0.3;
        this.head.rotation.x = -0.45;
        this.armL.rotation.set(0, 0, 0.8); this.armR.rotation.set(0, 0, -0.8);
        mouthOpen = 2.2;
        break;
      }
      case POSE.SHART: {
        this.legL.rotation.set(0, 0, -0.15); this.legR.rotation.set(0, 0, 0.15);
        this.armL.rotation.set(0.9, 0, 0.3); this.armR.rotation.set(0.9, 0, -0.3);
        this.torso.rotation.x = 0.2 + Math.sin(t * 25) * 0.05;
        this.hip.position.y -= 0.1;
        mouthOpen = 1.3;
        break;
      }
      case POSE.TALK: {
        // chatting: hands going like a real Italian
        const k = this.seed % 7;
        this.armR.rotation.set(-1.2 + Math.sin(t * (3 + k * 0.3) + k) * 0.45, 0, -0.4 + Math.sin(t * 2.1 + k) * 0.2);
        this.armL.rotation.set(-0.5 + Math.sin(t * 2.7 + k * 2) * 0.35, 0, 0.35);
        this.head.rotation.x = Math.sin(t * 2.3 + k) * 0.08;
        mouthOpen = 0.6 + Math.abs(Math.sin(t * 11 + k)) * 0.9;
        break;
      }
      case POSE.EAT: {
        this.armR.rotation.set(-2.2 + Math.sin(t * 18) * 0.3, 0, 0.5);
        mouthOpen = 1 + Math.abs(Math.sin(t * 18));
        break;
      }
    }
    if (gino && this.belly) {
      const j = Math.sin(w * 2) * 0.04 * mv + (s.pose === POSE.FART ? Math.sin(t * 40) * 0.03 : 0);
      const [bx, by, bz] = this.bellyScale;
      this.belly.scale.set(bx + j * 0.5, by - j, bz + j * 0.5);
    }
    this.mouth.scale.set(1.2, 0.3 * mouthOpen, 0.5);
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
    if (this.stainMesh) this.stainMesh.visible = s.stain > 0;
  }

  // World-space points for effects.
  buttPos(out) {
    const d = -(this.buttZ || 0.75);
    return out.set(this.root.position.x + Math.sin(this.root.rotation.y) * d, this.buttY || 0.95, this.root.position.z + Math.cos(this.root.rotation.y) * d);
  }
  mouthPos(out) {
    const d = this.mouthZ;
    return out.set(this.root.position.x + Math.sin(this.root.rotation.y) * d, this.mouthY, this.root.position.z + Math.cos(this.root.rotation.y) * d);
  }
}

export function newState(x = 0, z = 0) {
  return { x, z, rot: 0, walk: 0, move: 0, pose: 0, hair: 0, green: 0, red: 0, stain: 0 };
}
