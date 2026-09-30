// Food lying around the piazza. Drawn from snapshots [x, z, foodIndex] like the clouds.
import * as THREE from 'three';
import { FOODS, FOOD_WEIGHT } from './data.js';
import { randomSpot } from './world.js';

export const MAX_FOOD = 14;

export function randomFoodIndex() {
  const total = FOODS.reduce((a, f) => a + FOOD_WEIGHT[f.id], 0);
  let r = Math.random() * total;
  for (let i = 0; i < FOODS.length; i++) { r -= FOOD_WEIGHT[FOODS[i].id]; if (r <= 0) return i; }
  return 0;
}

export function spawnFood(awayFrom) {
  let p;
  do { p = randomSpot(); } while (awayFrom && Math.hypot(p.x - awayFrom.x, p.z - awayFrom.z) < 8);
  return { x: p.x, z: p.z, i: randomFoodIndex() };
}

function emojiTexture(emoji) {
  const s = 128, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  // a white sticker behind the emoji, so it pops on the cobbles
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.strokeStyle = '#2b1d0e'; g.lineWidth = 6;
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); g.fill(); g.stroke();
  g.font = '82px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, s / 2, s / 2 + 6);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FoodRenderer {
  constructor(scene) {
    this.scene = scene;
    this.mats = FOODS.map((f) => new THREE.SpriteMaterial({ map: emojiTexture(f.emoji) }));
    this.shadowGeo = new THREE.CircleGeometry(0.45, 16);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false });
    this.pool = [];
  }

  item(i) {
    while (this.pool.length <= i) {
      const s = new THREE.Sprite(this.mats[0]);
      const sh = new THREE.Mesh(this.shadowGeo, this.shadowMat);
      sh.rotation.x = -Math.PI / 2;
      this.scene.add(s, sh);
      this.pool.push({ s, sh });
    }
    return this.pool[i];
  }

  draw(list, t) {
    list.forEach(([x, z, fi], k) => {
      const { s, sh } = this.item(k);
      s.material = this.mats[fi];
      const bob = Math.sin(t * 3 + k) * 0.12;
      s.position.set(x, 0.9 + bob, z);
      s.scale.setScalar(1.1);
      sh.position.set(x, 0.02, z);
      s.visible = sh.visible = true;
    });
    for (let k = list.length; k < this.pool.length; k++) this.pool[k].s.visible = this.pool[k].sh.visible = false;
  }
}
