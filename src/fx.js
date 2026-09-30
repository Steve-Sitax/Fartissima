// Visible wind: streaks blasting out of the butt (fart) or the mouth (burp), a shock ring on the
// ground for big ones, and spit drops for burps.
import * as THREE from 'three';

const MAX = 700;

function puffTexture() {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}
const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), V = new THREE.Vector3(), S = new THREE.Vector3();

export class WindFX {
  constructor(scene) {
    this.p = [];
    // every streak is a ribbon (two triangles) turned towards the camera
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 4 * 3);
    this.col = new Float32Array(MAX * 4 * 4);
    const idx = new Uint16Array(MAX * 6);
    for (let i = 0; i < MAX; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    this.lines = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 6;
    scene.add(this.lines);
    this.puffTex = puffTexture();
    this.puffs = [];
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    this.scene = scene;
    this.dropGeo = new THREE.SphereGeometry(0.05, 6, 4);
    this.dropMat = new THREE.MeshBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.85 });
    this.drops = [];
    this.pukeMat = new THREE.MeshBasicMaterial({ color: '#a9c23f' });
    this.puddles = [];
  }

  // ev: { fx: 'wind', x, y, z, dx, dz, tier, kind: 'fart' | 'burp' | 'shart', color }
  spawn(ev) {
    const { x, y, z, dx, dz, tier } = ev;
    const n = 18 + tier * 22;
    const speed = 5 + tier * 2.6;
    const tint = ev.kind === 'shart' ? [0.55, 0.35, 0.15] : ev.kind === 'burp' ? [1, 1, 0.9] : ev.sbd ? [0.6, 0.85, 0.35] : [0.85, 1, 0.7];
    for (let i = 0; i < n && this.p.length < MAX; i++) {
      const spread = 0.35 + Math.random() * 0.35 * (1 + tier * 0.1);
      const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * spread * 2;
      const up = (Math.random() - 0.35) * 0.6;
      const v = speed * (0.5 + Math.random() * 0.8);
      this.p.push({
        x: x + (Math.random() - 0.5) * 0.2, y: y + (Math.random() - 0.5) * 0.25, z: z + (Math.random() - 0.5) * 0.2,
        vx: Math.sin(a) * v, vy: up * v * 0.4, vz: Math.cos(a) * v,
        life: 0.35 + Math.random() * 0.35 + tier * 0.06, age: -Math.random() * 0.12 * tier, c: tint,
      });
    }
    // air puffs bursting out of the hole
    for (let i = 0; i < 3 + tier * 2; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: new THREE.Color(...tint), transparent: true, depthWrite: false }));
      m.position.set(x, y, z);
      this.scene.add(m);
      const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.9, v = 1.5 + Math.random() * (1 + tier);
      this.puffs.push({ m, vx: Math.sin(a) * v, vy: (Math.random() - 0.3) * 0.8, vz: Math.cos(a) * v, age: -i * 0.03, life: 0.5 + tier * 0.1, size: 0.4 + tier * 0.18 });
    }
    if (tier >= 3 && ev.kind !== 'burp') {
      const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + dx * 0.4, 0.05, z + dz * 0.4);
      this.scene.add(m);
      this.rings.push({ m, age: 0, life: 0.5 + tier * 0.12, size: 1.5 + tier * 1.4 });
    }
    if (ev.kind === 'burp') {
      for (let i = 0; i < tier * 3; i++) {
        const m = new THREE.Mesh(this.dropGeo, this.dropMat);
        m.position.set(x, y, z);
        this.scene.add(m);
        const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.7, v = 2 + Math.random() * 3;
        this.drops.push({ m, vx: Math.sin(a) * v, vy: 1 + Math.random() * 2, vz: Math.cos(a) * v, age: 0 });
      }
    }
  }

  // Someone being sick: a green-yellow arc from the mouth and a puddle that stays a while.
  spawnPuke(ev) {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(this.dropGeo, this.pukeMat);
      m.position.set(ev.x, ev.y, ev.z);
      m.scale.setScalar(1.2 + Math.random() * 1.2);
      this.scene.add(m);
      const a = Math.atan2(ev.dx, ev.dz) + (Math.random() - 0.5) * 0.5, v = 1.2 + Math.random() * 1.6;
      this.drops.push({ m, vx: Math.sin(a) * v, vy: 0.5 + Math.random() * 1.2, vz: Math.cos(a) * v, age: -i * 0.04 });
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: '#b5c93a', transparent: true, opacity: 0.85, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(ev.x + ev.dx * 0.5, 0.03, ev.z + ev.dz * 0.5);
    pool.scale.setScalar(0.1);
    this.scene.add(pool);
    this.puddles.push({ m: pool, age: 0 });
  }

  clear() {
    for (const q of this.puddles) { this.scene.remove(q.m); q.m.material.dispose(); }
    this.puddles.length = 0;
    this.p.length = 0;
    for (const r of this.rings) this.scene.remove(r.m);
    for (const d of this.drops) this.scene.remove(d.m);
    for (const q of this.puffs) { this.scene.remove(q.m); q.m.material.dispose(); }
    this.puffs.length = 0;
    this.rings.length = 0;
    this.drops.length = 0;
  }

  update(dt, cam) {
    let k = 0;
    this.p = this.p.filter((q) => (q.age += dt) < q.life);
    for (const q of this.p) {
      if (q.age < 0) continue;
      const drag = Math.exp(-dt * 2.2);
      q.vx *= drag; q.vy *= drag; q.vz *= drag;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      const f = q.age / q.life, a = Math.sin(Math.PI * Math.min(1, f * 1.3)) * 0.8;
      A.set(q.x, q.y, q.z);
      B.set(q.x - q.vx * 0.09, q.y - q.vy * 0.09, q.z - q.vz * 0.09);
      D.subVectors(A, B);
      V.subVectors(cam, A);
      S.crossVectors(D, V).normalize().multiplyScalar(0.035 + 0.03 * (1 - f));
      const i = k * 12, j = k * 16;
      this.pos.set([A.x + S.x, A.y + S.y, A.z + S.z, A.x - S.x, A.y - S.y, A.z - S.z, B.x + S.x, B.y + S.y, B.z + S.z, B.x - S.x, B.y - S.y, B.z - S.z], i);
      const [r, g, b] = q.c;
      this.col.set([r, g, b, a, r, g, b, a, r, g, b, 0, r, g, b, 0], j);
      k++;
    }
    const geo = this.lines.geometry;
    geo.setDrawRange(0, k * 6);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    this.rings = this.rings.filter((r) => {
      r.age += dt;
      const f = r.age / r.life;
      r.m.scale.setScalar(0.3 + f * r.size);
      r.m.material.opacity = 0.6 * (1 - f);
      if (f >= 1) { this.scene.remove(r.m); r.m.material.dispose(); return false; }
      return true;
    });
    this.puffs = this.puffs.filter((q) => {
      q.age += dt;
      if (q.age < 0) { q.m.visible = false; return true; }
      q.m.visible = true;
      const f = q.age / q.life, drag = Math.exp(-dt * 3);
      q.vx *= drag; q.vy *= drag; q.vz *= drag;
      q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
      q.m.scale.setScalar(q.size * (0.4 + f * 1.4));
      q.m.material.opacity = 0.55 * (1 - f);
      if (f >= 1) { this.scene.remove(q.m); q.m.material.dispose(); return false; }
      return true;
    });
    this.puddles = this.puddles.filter((q) => {
      q.age += dt;
      q.m.scale.setScalar(Math.min(1, 0.1 + q.age * 0.9));
      q.m.material.opacity = 0.85 * Math.min(1, (10 - q.age) / 2);
      if (q.age > 10) { this.scene.remove(q.m); q.m.material.dispose(); return false; }
      return true;
    });
    this.drops = this.drops.filter((d) => {
      d.age += dt;
      if (d.age < 0) { d.m.visible = false; return true; }
      d.m.visible = true;
      d.vy -= 9.8 * dt;
      d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
      if (d.m.position.y < 0.02 || d.age > 2) { this.scene.remove(d.m); return false; }
      return true;
    });
  }
}

// Aiming help while the hero builds up pressure: the blast cone on the ground and the hearing circle.
export class AimGuide {
  constructor(scene, blastCos) {
    const half = Math.acos(blastCos);
    const mat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; };
    this.group = new THREE.Group();
    this.cone = new THREE.Group();
    this.coneMat = mat('#9ad64f', 0.35);
    this.edgeMat = mat('#ffffff', 0.7);
    // sector pointing along -Z; the group turns it to the hero's back (fart) or front (burp)
    this.cone.add(new THREE.Mesh(flat(new THREE.CircleGeometry(1, 48, Math.PI / 2 - half, half * 2)), this.coneMat));
    this.cone.add(new THREE.Mesh(flat(new THREE.RingGeometry(0.96, 1, 48, 1, Math.PI / 2 - half, half * 2)), this.edgeMat));
    this.close = new THREE.Mesh(flat(new THREE.CircleGeometry(1, 32)), this.coneMat);
    this.hear = new THREE.Mesh(flat(new THREE.RingGeometry(0.985, 1, 96)), mat('#ffffff', 0.35));
    this.group.add(this.cone, this.close, this.hear);
    this.group.position.y = 0.04;
    this.group.renderOrder = 4;
    this.group.visible = false;
    scene.add(this.group);
  }

  // info from Game.chargeInfo(); s = the hero's state
  update(info, s, t) {
    this.group.visible = !!info;
    if (!info) return;
    this.group.position.x = s.x;
    this.group.position.z = s.z;
    const fart = info.kind === 'fart';
    this.cone.rotation.y = s.rot + (fart ? 0 : Math.PI);
    const R = Math.max(0.01, info.blastR);
    this.cone.scale.set(R, 1, R);
    this.cone.visible = this.close.visible = info.blastR > 0;
    this.close.scale.setScalar(Math.min(1.6, R));
    this.hear.scale.setScalar(info.hearR);
    this.coneMat.color.set(fart ? '#9ad64f' : '#ffd66b');
    this.coneMat.opacity = 0.28 + 0.1 * Math.sin(t * 8);
  }
}
