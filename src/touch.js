// Phone and tablet controls: a thumb stick on the left, big FART and BURP buttons on the right.
// Hold a button to build up; drag your thumb while holding to aim. Drag anywhere else to look around.
export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function setupTouch({ input, look, isPlaying, pause }) {
  document.body.classList.add('touch');
  const el = document.createElement('div');
  el.id = 'touch';
  el.className = 'hidden';
  el.innerHTML = `
    <div id="stick-zone"><div id="stick-base"><div id="stick-knob"></div></div></div>
    <div id="look-zone"></div>
    <button id="t-burp" class="t-btn">🫧<span>BURP</span></button>
    <button id="t-fart" class="t-btn">💨<span>FART</span></button>
    <button id="t-pause" class="t-small">❚❚</button>`;
  document.body.appendChild(el);
  const $ = (id) => document.getElementById(id);

  // ---- thumb stick (analog walk; push to the edge to run)
  const zone = $('stick-zone'), base = $('stick-base'), knob = $('stick-knob');
  let stickId = null, ox = 0, oy = 0;
  const R = 60;
  zone.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY;
    base.style.left = `${ox - r.left}px`;
    base.style.top = `${oy - r.top}px`;
    base.classList.add('on');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.ax = dx / R;
    input.ay = -dy / R;
    input.touchRun = d > R * 1.15;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    input.ax = input.ay = 0;
    input.touchRun = false;
    knob.style.transform = '';
    base.classList.remove('on');
  };
  zone.addEventListener('pointerup', endStick);
  zone.addEventListener('pointercancel', endStick);

  // ---- look around by dragging the right half
  const lookZone = $('look-zone');
  let lookId = null, lx = 0, ly = 0;
  lookZone.addEventListener('pointerdown', (e) => { lookId = e.pointerId; lookZone.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY; });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    look(e.clientX - lx, e.clientY - ly);
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // ---- hold-to-blast buttons; sliding the thumb while holding aims the blast
  const holdButton = (btn, key) => {
    let id = null, bx = 0, by = 0;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      btn.setPointerCapture(e.pointerId);
      bx = e.clientX; by = e.clientY;
      input[key] = true;
      btn.classList.add('on');
    });
    btn.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      look((e.clientX - bx) * 1.4, (e.clientY - by) * 0.6);
      bx = e.clientX; by = e.clientY;
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      input[key] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  };
  holdButton($('t-fart'), 'touchFart');
  holdButton($('t-burp'), 'touchBurp');
  $('t-pause').addEventListener('click', () => { if (isPlaying()) pause(); });

  // stop the browser from scrolling, zooming or selecting while playing
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    show(on) { el.classList.toggle('hidden', !on); if (!on) { input.ax = input.ay = 0; input.touchFart = input.touchBurp = input.touchRun = false; } },
  };
}

// Full screen and landscape on phones, where the browser allows it.
export async function goFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch { /* iPhone Safari and some browsers say no; the game still works */ }
}
