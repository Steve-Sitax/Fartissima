// Speech bubbles and point pop-ups as HTML over the 3D view.
import * as THREE from 'three';

const v = new THREE.Vector3();

export class BubbleLayer {
  constructor(el) {
    this.el = el;
    this.pool = [];
  }

  node(i) {
    while (this.pool.length <= i) {
      const d = document.createElement('div');
      d.className = 'bubble';
      this.el.appendChild(d);
      this.pool.push({ d, text: '', cls: '' });
    }
    return this.pool[i];
  }

  // list: [owner, text, cls, age, x, y, z, life]; owner -1 = the hero, >= 0 = pedestrian, -2 = world point.
  // chars[0] is the hero, chars[k + 1] is pedestrian k.
  draw(list, chars, camera, w, h) {
    let n = 0;
    for (const [owner, text, cls, age, x, y, z, life] of list) {
      if (owner === -2) v.set(x, y + age * 1.2, z);
      else {
        const ch = chars[owner + 1];
        if (!ch) continue;
        v.set(ch.root.position.x, ch.height + 0.35, ch.root.position.z);
      }
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) continue;
      const b = this.node(n++);
      if (b.text !== text) { b.d.textContent = text; b.text = text; }
      const c = 'bubble' + (cls ? ' ' + cls : '');
      if (b.cls !== c) { b.d.className = c; b.cls = c; }
      const fade = Math.min(1, (life - age) * 3, age * 8);
      b.d.style.opacity = fade;
      b.d.style.left = `${((v.x + 1) / 2) * w}px`;
      b.d.style.top = `${((1 - v.y) / 2) * h}px`;
      b.d.style.display = 'block';
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].d.style.display = 'none';
  }
}
