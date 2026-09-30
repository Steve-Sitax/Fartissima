// Stench clouds. The data lives in plain objects; CloudRenderer only draws snapshots,
// so live play and replays share the same drawing code.
import * as THREE from 'three';

export const CLOUD_COLORS = ['#9ad64f', '#e3d35a', '#8a5a2b', '#5f9a2a'];

export function makeCloud({ x, y, z, tier, stench, color = 0, dirX = 0, dirZ = 0 }) {
  const power = tier * stench;
  return {
    x, y, z,
    vx: dirX * 0.6 + (Math.random() - 0.5) * 0.3,
    vz: dirZ * 0.6 + (Math.random() - 0.5) * 0.3,
    age: 0,
    // capped: a very stinky hero on broccoli must not gas the whole square in one go
    life: Math.min(20, 5 + power * 1.6),
    rMax: Math.min(8, 1.4 + power * 0.6),
    r: 0.5,
    strength: 1,
    color,
    seed: 1 + ((Math.random() * 1e6) | 0),
    counted: new Set(),       // npcs that already fled from this cloud (for points)
  };
}

export function updateCloud(c, dt) {
  c.age += dt;
  c.r = c.rMax * Math.min(1, 0.25 + c.age / 1.8);
  c.strength = Math.pow(Math.max(0, 1 - c.age / c.life), 1.3);
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.vx *= 1 - dt * 0.3; c.vz *= 1 - dt * 0.3;
  c.y = Math.min(c.y + dt * 0.15, 2.2);
  return c.strength > 0.02;
}

// Radius where people still smell it; shrinks as the cloud thins out.
export const smellRadius = (c) => c.r * (0.55 + 0.45 * c.strength);

function puffTexture() {
  const s = 128, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PUFFS = 14;

export class CloudRenderer {
  constructor(scene) {
    this.scene = scene;
    this.tex = puffTexture();
    this.pool = [];
    this.colors = CLOUD_COLORS.map((c) => new THREE.Color(c));
  }

  sprite(i) {
    while (this.pool.length <= i) {
      const m = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      s.renderOrder = 5;
      this.scene.add(s);
      this.pool.push(s);
    }
    return this.pool[i];
  }

  // list: [x, y, z, r, strength, colorIdx, seed, thin][]; thin = toxic cloud, drawn see-through
  // cam: camera position; puffs right in front of the lens fade out so you can still see.
  draw(list, t, cam) {
    let n = 0;
    for (const [x, y, z, r, str, col, seed, thin] of list) {
      let a = seed;
      const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < PUFFS; i++) {
        const s = this.sprite(n++);
        const ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * r * 0.75, h = (rnd() - 0.3) * r * 0.5;
        const wob = t * (0.6 + rnd()) + i;
        s.position.set(x + Math.cos(ang + wob * 0.1) * rad, Math.max(0.3, y + h + Math.sin(wob) * 0.15), z + Math.sin(ang + wob * 0.1) * rad);
        const size = r * (0.55 + rnd() * 0.5) * (1 + Math.sin(wob * 1.3) * 0.08);
        s.scale.set(size, size, 1);
        s.material.color.copy(this.colors[col]);
        const near = cam ? Math.min(1, Math.max(0.15, (s.position.distanceTo(cam) - 1.5) / 4)) : 1;
        s.material.opacity = Math.min(0.55, str * 0.6) * near * (thin ? 0.4 : 1);
        s.visible = true;
      }
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].visible = false;
  }
}

export const cloudSnap = (c) => [c.x, c.y, c.z, c.r, c.strength, c.color, c.seed, c.thin ? 1 : 0];
