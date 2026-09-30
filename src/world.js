// The piazza: ground, buildings, fountain, props. Also the walkable-area rules.
import * as THREE from 'three';

export const HALF = 36;          // walkable square is [-HALF, HALF] on x and z
export const FOUNTAIN_R = 5.2;   // nobody walks through the fountain

const toon = (color) => new THREE.MeshToonMaterial({ color });

// Keeps a point inside the piazza and out of the fountain.
export function clampToWalkable(p, r = 0.5) {
  p.x = Math.max(-HALF + r, Math.min(HALF - r, p.x));
  p.z = Math.max(-HALF + r, Math.min(HALF - r, p.z));
  const d = Math.hypot(p.x, p.z), min = FOUNTAIN_R + r;
  if (d < min) {
    const k = d < 1e-4 ? 1 : min / d;
    if (d < 1e-4) { p.x = min; } else { p.x *= k; p.z *= k; }
  }
  return p;
}

export function randomSpot(minFromCenter = FOUNTAIN_R + 1.5) {
  let x, z;
  do { x = (Math.random() * 2 - 1) * (HALF - 2); z = (Math.random() * 2 - 1) * (HALF - 2); } while (Math.hypot(x, z) < minFromCenter);
  return { x, z };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cobbleTexture() {
  const t = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#c9b48f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      for (let x = (y / 32) % 2 ? -16 : 0; x < w; x += 32) {
        const l = 70 + Math.random() * 14;
        g.fillStyle = `hsl(${32 + Math.random() * 10}, 28%, ${l}%)`;
        g.beginPath(); g.roundRect(x + 2, y + 2, 28, 28, 7); g.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 18);
  return t;
}

function facadeTexture(base, floors, cols, shop) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const fh = h / floors;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * (w / cols), cy = f * fh + fh * 0.5;
        if (shop && f === floors - 1) {
          g.fillStyle = '#3d2b1f'; g.fillRect(cx - 22, cy - 26, 44, 52);
          g.fillStyle = '#9fd4e8'; g.fillRect(cx - 18, cy - 22, 36, 40);
          continue;
        }
        g.fillStyle = '#5a7d4f'; g.fillRect(cx - 17, cy - 20, 8, 40); g.fillRect(cx + 9, cy - 20, 8, 40); // shutters
        g.fillStyle = '#2d3b4a'; g.fillRect(cx - 9, cy - 20, 18, 40);
        g.fillStyle = '#fff'; g.fillRect(cx - 12, cy + 20, 24, 4);
        if (Math.random() < 0.3) { g.fillStyle = '#e8506b'; g.beginPath(); g.arc(cx - 5, cy + 18, 3, 0, 7); g.arc(cx + 4, cy + 18, 3, 0, 7); g.fill(); }
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, w, 6);
  });
}

export function buildWorld(scene) {
  scene.background = new THREE.Color('#8fd0f5');
  scene.fog = new THREE.Fog('#bfe3f5', 70, 150);

  const hemi = new THREE.HemisphereLight('#fff6e0', '#8a7a5a', 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d0', 2.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 30, HALF * 2 + 30),
    new THREE.MeshToonMaterial({ map: cobbleTexture() }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // fountain
  const f = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(FOUNTAIN_R, FOUNTAIN_R + 0.3, 0.9, 40), toon('#e8dcc4'));
  basin.position.y = 0.45;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(FOUNTAIN_R - 0.4, FOUNTAIN_R - 0.4, 0.1, 40), toon('#5cc2e8'));
  water.position.y = 0.82;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.2, 16), toon('#e8dcc4'));
  column.position.y = 2.2;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.6, 0.5, 24), toon('#e8dcc4'));
  bowl.position.y = 3.6;
  // statue: a proud little cherub... bending over. Fitting.
  const cherub = new THREE.Group();
  const cb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), toon('#f1e6d0'));
  const ch = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), toon('#f1e6d0'));
  ch.position.set(0.35, 0.3, 0);
  const butt = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), toon('#f1e6d0'));
  butt.position.set(-0.35, -0.05, 0.14);
  const butt2 = butt.clone(); butt2.position.z = -0.14;
  cherub.add(cb, ch, butt, butt2);
  cherub.position.y = 4.3;
  cherub.rotation.z = -0.4;
  f.add(basin, water, column, bowl, cherub);
  f.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  scene.add(f);

  // buildings around the square
  const colors = ['#e8a87c', '#f2d17a', '#d97b66', '#f0c8a0', '#c9d98f', '#e8b4c8', '#f5e1b5', '#d99a5b'];
  const awnings = ['#c0392b', '#27ae60', '#2980b9', '#f39c12', '#8e44ad'];
  const edge = HALF + 4;
  const side = (fn) => { for (let i = -edge + 5; i < edge; i += 10) fn(i); };
  const addBuilding = (x, z, rotY) => {
    const floors = 3 + ((Math.random() * 3) | 0), h = floors * 3.4;
    const col = colors[(Math.random() * colors.length) | 0];
    const tex = facadeTexture(col, floors, 3, true);
    const mats = Array.from({ length: 6 }, () => toon(col));
    mats[4] = new THREE.MeshToonMaterial({ map: tex });
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, h, 8), mats);
    b.position.set(x, h / 2, z);
    b.rotation.y = rotY;
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.5, 8.4), toon('#b5553a'));
    roof.position.set(x, h + 0.25, z); roof.rotation.y = rotY;
    scene.add(roof);
    // striped awning over the shop
    const aw = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 2), toon(awnings[(Math.random() * awnings.length) | 0]));
    const dir = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    aw.position.set(x + dir.x * 4.8, 3.3, z + dir.z * 4.8);
    aw.rotation.y = rotY; aw.rotation.x = 0.25;
    aw.castShadow = true;
    scene.add(aw);
  };
  side((i) => addBuilding(i, -edge - 4, 0));
  side((i) => addBuilding(i, edge + 4, Math.PI));
  side((i) => addBuilding(-edge - 4, i, Math.PI / 2));
  side((i) => addBuilding(edge + 4, i, -Math.PI / 2));

  // lamp posts, trees, café tables (decoration; tables near the edges)
  const post = toon('#2d2d2d'), lampM = new THREE.MeshToonMaterial({ color: '#fff3b0', emissive: '#ffe680', emissiveIntensity: 0.5 });
  for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-28, 0], [28, 0], [0, -28], [0, 28]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5, 8), post);
    p.position.set(x, 2.5, z); p.castShadow = true;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), lampM);
    l.position.set(x, 5.1, z);
    scene.add(p, l);
  }
  const trunk = toon('#7a5230'), leaf = toon('#5da33f');
  for (const [x, z] of [[-32, -32], [32, -32], [-32, 32], [32, 32], [-32, -16], [32, 16]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), trunk);
    t.position.set(x, 1.5, z);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), leaf);
    c.position.set(x, 4.2, z);
    t.castShadow = c.castShadow = true;
    scene.add(t, c);
  }
  const cloth = toon('#fff'), check = toon('#d63a3a');
  for (const [x, z] of [[-24, -33], [-20, -33], [22, 33], [26, 33], [33, -24]]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), Math.random() < 0.5 ? cloth : check);
    top.position.set(x, 1, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), post);
    leg.position.set(x, 0.5, z);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 12), check);
    umb.position.set(x, 2.6, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), post);
    pole.position.set(x, 1.8, z);
    for (const m of [top, umb]) m.castShadow = true;
    scene.add(top, leg, umb, pole);
  }
  return { sun };
}
