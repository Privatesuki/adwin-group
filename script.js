/* =========================================================
   ADWIN GROUP — script.js
   1. Utils  2. Logo  3. Watermark  4. Cursors  5. Intro sim
   6. Live-build  7. Router  8. Preview modal  9. Guest cursor
   10. Contact  11. Chatbot
   ========================================================= */
(() => {
'use strict';

/* ---------- 1. UTILS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mk = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safe = (fn) => { try { return fn(); } catch (_) { return undefined; } };

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* A Session lets us cancel every running choreography at once. */
class Session { constructor() { this.alive = true; } stop() { this.alive = false; } }
const wait = (S, ms) => new Promise(r => setTimeout(() => r(!S || S.alive), ms));
const tween = (S, dur, fn, ease = easeInOut) => new Promise(res => {
  const t0 = performance.now();
  const step = now => {
    if (S && !S.alive) return res(false);
    const p = clamp((now - t0) / dur, 0, 1);
    fn(ease(p), p);
    p < 1 ? requestAnimationFrame(step) : res(true);
  };
  requestAnimationFrame(step);
});

const body = document.body;
const intro = $('#intro');
const app = $('#app');
let started = false;

/* ---------- 2. LOGO (vector render) ---------- */
const LOGO = {
  ring: { cx: 626, cy: 600, rx: 456, ry: 430 },
  p1: 'M629 229 866 580 810 657 629 398 441 657 387 578Z',
  p2: 'M218 567H338L476 750 629 545 778 750 913 567H1035L785 903 629 697 467 903Z'
};
let logoUid = 0;
function logoSVG(kind) {
  const id = 'lg' + (++logoUid);
  const full = kind === 'hero' || kind === 'intro';
  const stat = kind === 'mini' ? ' static' : '';
  const L = LOGO.ring;
  const construct = full ? `
    <g class="construct">
      <rect x="150" y="155" width="953" height="890"/>
      <line x1="60" y1="600" x2="1194" y2="600"/><line x1="626" y1="60" x2="626" y2="1194"/>
      <ellipse cx="${L.cx}" cy="${L.cy}" rx="${L.rx - 80}" ry="${L.ry - 80}"/>
      <rect class="hnd" x="137" y="142" width="26" height="26"/><rect class="hnd" x="1090" y="142" width="26" height="26"/>
      <rect class="hnd" x="137" y="1032" width="26" height="26"/><rect class="hnd" x="1090" y="1032" width="26" height="26"/>
      <text x="150" y="118">ADWIN_MARK.svg</text>
    </g>` : '';
  return `<svg class="logo-svg ${kind}${stat}" viewBox="0 0 1254 1254" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff4b8"/><stop offset=".45" stop-color="#FFD700"/><stop offset="1" stop-color="#a67c00"/></linearGradient></defs>
    ${construct}
    <ellipse class="draw ring" pathLength="1" cx="${L.cx}" cy="${L.cy}" rx="${L.rx}" ry="${L.ry}" stroke="url(#${id})"/>
    <path class="draw mark p1" pathLength="1" d="${LOGO.p1}" fill="url(#${id})" stroke="url(#${id})"/>
    <path class="draw mark p2" pathLength="1" d="${LOGO.p2}" fill="url(#${id})" stroke="url(#${id})"/>
  </svg>`;
}
$$('[data-logo]').forEach(el => { el.innerHTML = logoSVG(el.dataset.logo); });

/* ---------- 3. RUNNING WATERMARK ---------- */
(function buildWatermark() {
  const root = $('#wm-rot');
  if (!root) return;
  const rows = [
    ['big line', 'ADWIN GROUP', 1.00], ['term', '> ADWIN GROUP', 1.00], ['big fill', 'ADWIN GROUP', 1.00],
    ['big line', 'ADWIN GROUP', 1.00], ['term', '// ADWIN GROUP', 1.00], ['big fill', 'ADWIN GROUP', 1.00],
    ['big line', 'ADWIN GROUP', 1.00], ['term', '$ ADWIN GROUP', 1.00], ['big fill', 'ADWIN GROUP', 1.00],
    ['big line', 'ADWIN GROUP', 1.00], ['term', '> ADWIN GROUP', 1.00], ['big fill', 'ADWIN GROUP', 1.00],
    ['big line', 'ADWIN GROUP', 1.00], ['term', '// ADWIN GROUP', 1.00], ['big fill', 'ADWIN GROUP', 1.00],
    ['big line', 'ADWIN GROUP', 1.00]
  ];
  rows.forEach(([cls, text], i) => {
    const row = mk('div', 'wm-row ' + cls + (i % 2 ? ' rev' : ''), root);
    const dur = cls.startsWith('term') ? rand(70, 100) : rand(95, 150);
    for (let k = 0; k < 2; k++) {
      const track = mk('div', 'wm-track', row);
      track.style.setProperty('--t', dur.toFixed(1) + 's');
      track.style.setProperty('--o', (-rand(0, dur)).toFixed(1) + 's');
      const sep = cls.startsWith('term') ? '  ·  ' : '  ✦  ';
      track.innerHTML = Array.from({ length: 9 }, () => `<span>${text}${sep}</span>`).join('');
      /* both tracks share the same delay so they stay seamlessly joined */
      if (k === 1) track.style.setProperty('--o', row.firstChild.style.getPropertyValue('--o'));
    }
  });
})();

/* ---------- 4. COLLABORATION CURSORS ---------- */
class Cursor {
  constructor(layer, cfg) {
    this.cfg = cfg; this.x = -200; this.y = -200; this.bubTimer = 0;
    const el = this.el = mk('div', 'cur is-hidden', layer);
    el.style.setProperty('--c', cfg.color);
    el.innerHTML = '<svg class="cur-arrow" viewBox="0 0 24 24"><path d="M3 2l17 8.2-7.4 2.1-2.6 7.7L3 2z"/></svg><span class="cur-tag"></span><span class="cur-bub"></span>';
    $('.cur-tag', el).textContent = cfg.name;
    this.bub = $('.cur-bub', el);
    this.set(-200, -200);
  }
  set(x, y) { this.x = x; this.y = y; this.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; }
  show() { this.el.classList.remove('is-hidden'); }
  hide() { this.el.classList.add('is-hidden'); }
  down() { this.el.classList.remove('down'); void this.el.offsetWidth; this.el.classList.add('down'); }
  up() { this.el.classList.remove('down'); }
  say(text, ms = 2000) {
    this.bub.textContent = text; this.bub.classList.add('show');
    clearTimeout(this.bubTimer); this.bubTimer = setTimeout(() => this.bub.classList.remove('show'), ms);
  }
  /* curved, eased glide */
  moveTo(S, x, y, dur) {
    const x0 = this.x, y0 = this.y, dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy) || 1;
    const bend = Math.min(d * .16, 70) * (Math.random() < .5 ? -1 : 1);
    const cx = x0 + dx / 2 - (dy / d) * bend, cy = y0 + dy / 2 + (dx / d) * bend;
    return tween(S, dur, e => {
      const u = 1 - e;
      this.set(u * u * x0 + 2 * u * e * cx + e * e * x, u * u * y0 + 2 * u * e * cy + e * e * y);
    });
  }
}

/* ---------- 5. INTRO SIMULATION ---------- */
const INTRO_CFG = [
  { name: 'Adam (Founder)', color: '#FFD700', delay: 200, tasks: ['draw', 'type', 'rewrite'],
    z: [.04, .10, .30, .26], zm: [.04, .05, .52, .16],
    code: [['const brand = "ADWIN GROUP";', 'export default ecosystem;'], ['units.add("AD DJAYA");', 'units.add("DTech HUB");', 'units.add("DWIX Labs");']],
    rewrite: ['founder: "Adam Winatra"', 'founder: "Daw"'] },
  { name: 'DWIX Labs Dev', color: '#FFB347', delay: 900, tasks: ['type', 'rewrite', 'type'],
    z: [.04, .62, .32, .28], zm: [.04, .74, .56, .2],
    code: [['esp32.connect({ wifi, mqtt });', 'board.on("sensor", push);'], ['<Dashboard live={true} />', 'api.get("/telemetry");']],
    rewrite: ['const mode = "draft";', 'const mode = "production";'] },
  { name: 'UI/UX Designer', color: '#F5E6B3', delay: 1500, tasks: ['draw', 'drag', 'draw'],
    z: [.66, .10, .30, .26], zm: [.46, .17, .5, .15],
    code: [['.hero { letter-spacing: .24em; }', 'color: #FFD700;']],
    rewrite: ['gap: 12px;', 'gap: 24px;'] },
  { name: 'DTech HUB', color: '#E8E4D8', delay: 2200, tasks: ['type', 'drag', 'rewrite'],
    z: [.64, .62, .32, .28], zm: [.4, .8, .56, .15],
    code: [['$ diagnose --device laptop', '> thermal paste ........ OK', '> ssd health ........... OK']],
    rewrite: ['status: "diagnosing"', 'status: "repaired"'] },
  { name: 'AD DJAYA', color: '#D98E5F', delay: 3000, tasks: ['rewrite', 'drag', 'type'],
    z: [.36, .04, .28, .14], zm: [.5, .04, .46, .12],
    code: [['catalog.add("sparepart");', 'order.ship("ID");']],
    rewrite: ['stock: 12', 'stock: 48'] }
];

const Intro = {
  S: null, cursors: [], layer: null,
  zone(cfg) {
    const w = innerWidth, h = innerHeight, f = w < 760 ? cfg.zm : cfg.z;
    return { x: f[0] * w, y: f[1] * h, w: f[2] * w, h: f[3] * h };
  },
  start() {
    this.layer = $('#sim'); this.S = new Session();
    const S = this.S;
    this.cursors = INTRO_CFG.map(cfg => {
      const c = new Cursor(this.layer, cfg), z = this.zone(cfg);
      c.set(z.x + z.w / 2, z.y + z.h / 2);
      return c;
    });
    if (reduceMotion) { this.cursors.forEach(c => c.show()); return; }
    this.cursors.forEach((c, i) => this.loop(c, INTRO_CFG[i], S));
  },
  stop() {
    if (this.S) this.S.stop();
    if (this.layer) { this.layer.style.transition = 'opacity .8s ease'; this.layer.style.opacity = '0'; }
  },
  async loop(c, cfg, S) {
    if (!await wait(S, cfg.delay)) return;
    const z0 = this.zone(cfg);
    c.set(z0.x - 60, z0.y - 40); c.show();
    let last = '';
    while (S.alive) {
      const choices = cfg.tasks.filter(t => t !== last);
      const t = pick(choices.length ? choices : cfg.tasks);
      last = t;
      try { await TASKS[t](c, this.zone(cfg), S, cfg, this.layer); } catch (_) { /* never let a task kill the loop */ }
      if (!await wait(S, rand(500, 1300))) return;
    }
  }
};

const sleepFade = async (S, el, ms = 650) => { el.classList.add('out'); await wait(S, ms); el.remove(); };

const TASKS = {
  /* typing code snippets */
  async type(c, z, S, cfg, layer) {
    const lines = pick(cfg.code);
    const el = mk('div', 'sim-code', layer);
    const t = mk('span', 't', el), caret = mk('span', 'caret', el);
    t.textContent = lines.reduce((a, b) => (b.length > a.length ? b : a), '') + '\n'.repeat(lines.length - 1);
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.minWidth = w + 'px'; el.style.minHeight = h + 'px'; t.textContent = '';
    const px = clamp(rand(z.x, z.x + Math.max(0, z.w - w)), 10, innerWidth - w - 10);
    const py = clamp(rand(z.y, z.y + Math.max(0, z.h - h)), 10, innerHeight - h - 10);
    el.style.left = px + 'px'; el.style.top = py + 'px';
    if (!await c.moveTo(S, px + 18, py + 14, rand(1500, 2100))) return;
    el.classList.add('on'); c.down(); c.say('typing…', 3200);
    let text = '';
    for (let li = 0; li < lines.length; li++) {
      for (const ch of lines[li]) {
        text += ch; t.textContent = text;
        if (!await wait(S, rand(55, 115))) return;
      }
      if (li < lines.length - 1) { text += '\n'; t.textContent = text; if (!await wait(S, 380)) return; }
    }
    c.up();
    if (!await wait(S, 900)) return;
    c.say('deleting…', 2200);
    while (text.length > 0) {                      /* backspace everything */
      text = text.slice(0, -1); t.textContent = text;
      if (!await wait(S, 26)) return;
    }
    await wait(S, 350);
    await sleepFade(S, el);
  },

  /* type, select, delete, retype */
  async rewrite(c, z, S, cfg, layer) {
    const [a, b] = cfg.rewrite;
    const el = mk('div', 'sim-code', layer);
    const t = mk('span', 't', el); mk('span', 'caret', el);
    t.textContent = a.length > b.length ? a : b;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.minWidth = w + 'px'; t.textContent = '';
    const px = clamp(rand(z.x, z.x + Math.max(0, z.w - w)), 10, innerWidth - w - 10);
    const py = clamp(rand(z.y, z.y + Math.max(0, z.h - h)), 10, innerHeight - h - 10);
    el.style.left = px + 'px'; el.style.top = py + 'px';
    if (!await c.moveTo(S, px + 18, py + h / 2, rand(1400, 2000))) return;
    el.classList.add('on'); c.say('editing…', 3600);
    let text = '';
    for (const ch of a) { text += ch; t.textContent = text; if (!await wait(S, rand(60, 120))) return; }
    if (!await wait(S, 800)) return;
    t.innerHTML = `<span class="sel">${esc(a)}</span>`;        /* select-all */
    c.down(); if (!await wait(S, 700)) return; c.up();
    t.textContent = '';                                         /* delete */
    if (!await wait(S, 450)) return;
    text = '';
    for (const ch of b) { text += ch; t.textContent = text; if (!await wait(S, rand(60, 120))) return; }
    if (!await wait(S, 1100)) return;
    await sleepFade(S, el);
  },

  /* drawing wireframe bounding boxes */
  async draw(c, z, S, cfg, layer) {
    const bw = clamp(z.w * rand(.55, .9), 90, 340), bh = clamp(z.h * rand(.55, .9), 70, 200);
    const x0 = clamp(rand(z.x, z.x + Math.max(0, z.w - bw)), 10, innerWidth - bw - 24);
    const y0 = clamp(rand(z.y, z.y + Math.max(0, z.h - bh)), 10, innerHeight - bh - 30);
    if (!await c.moveTo(S, x0, y0, rand(1400, 2000))) return;
    c.down(); c.say('drawing frame', 3600);
    const box = mk('div', 'sim-box ph', layer);
    box.innerHTML = '<i></i><i></i><i></i><i></i><span class="sim-dim"></span>';
    box.style.left = x0 + 'px'; box.style.top = y0 + 'px';
    const dim = $('.sim-dim', box);
    const ok = await tween(S, rand(1700, 2200), e => {
      const w = bw * e, h = bh * e;
      box.style.width = w + 'px'; box.style.height = h + 'px';
      c.set(x0 + w, y0 + h); dim.textContent = `${Math.round(w)} × ${Math.round(h)}`;
    });
    c.up(); if (!ok) return;
    if (!await wait(S, 700)) return;
    /* nested inner frame */
    const iw = bw * .45, ih = bh * .4, ix = x0 + bw * .14, iy = y0 + bh * .2;
    if (!await c.moveTo(S, ix, iy, 1100)) return;
    c.down(); c.say('nesting component', 2600);
    const box2 = mk('div', 'sim-box', layer);
    box2.innerHTML = '<i></i><i></i><i></i><i></i>';
    box2.style.left = ix + 'px'; box2.style.top = iy + 'px';
    if (!await tween(S, 1100, e => { box2.style.width = iw * e + 'px'; box2.style.height = ih * e + 'px'; c.set(ix + iw * e, iy + ih * e); })) return;
    c.up();
    if (!await wait(S, 1500)) return;
    box.classList.add('out'); box2.classList.add('out');
    await wait(S, 750); box.remove(); box2.remove();
  },

  /* dragging UI elements */
  async drag(c, z, S, cfg, layer) {
    const cw = rand(110, 160), ch = rand(46, 70);
    const x0 = clamp(rand(z.x, z.x + Math.max(0, z.w - cw)), 10, innerWidth - cw - 10);
    const y0 = clamp(rand(z.y, z.y + Math.max(0, z.h - ch)), 10, innerHeight - ch - 10);
    let x1 = clamp(rand(z.x, z.x + Math.max(0, z.w - cw)), 10, innerWidth - cw - 10);
    let y1 = clamp(rand(z.y, z.y + Math.max(0, z.h - ch)), 10, innerHeight - ch - 10);
    if (Math.hypot(x1 - x0, y1 - y0) < 90) x1 = clamp(x0 + (x0 > innerWidth / 2 ? -140 : 140), 10, innerWidth - cw - 10);
    const chip = mk('div', 'sim-chip ' + pick(['v1', 'v2', 'v3']), layer);
    Object.assign(chip.style, { left: x0 + 'px', top: y0 + 'px', width: cw + 'px', height: ch + 'px' });
    void chip.offsetWidth; chip.classList.add('on');
    if (!await c.moveTo(S, x0 + cw * .45, y0 + ch * .5, rand(1300, 1900))) return;
    c.down(); c.say('dragging component', 3200);
    const dx = x1 - x0, dy = y1 - y0;
    const ok = await tween(S, rand(1800, 2400), e => {
      chip.style.transform = `translate3d(${dx * e}px,${dy * e}px,0) rotate(${Math.sin(e * Math.PI) * -3}deg)`;
      c.set(x0 + cw * .45 + dx * e, y0 + ch * .5 + dy * e);
    });
    c.up(); if (!ok) return;
    chip.classList.add('drop');
    if (!await wait(S, 1400)) return;
    await sleepFade(S, chip);
  }
};

/* ---------- 6. SCROLL-DRIVEN LIVE-BUILD ---------- */
const Live = (() => {
  const stage = $('#stage');
  const layer = $('#live-layer');
  const foot = $('#foot');
  const CURS = [
    { name: 'Adam (Founder)', color: '#FFD700' },
    { name: 'UI/UX Designer', color: '#F5E6B3' },
    { name: 'DWIX Labs Dev', color: '#FFB347' },
    { name: 'DTech HUB', color: '#E8E4D8' },
    { name: 'AD DJAYA', color: '#D98E5F' }
  ];
  let S = new Session(), io = null, blocks = [];
  let mQ = [], dQ = [], mBusy = false, master = null, pool = [];
  const timers = new Map();

  const pageRect = el => {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };
  const near = (el, m = 650) => { const r = el.getBoundingClientRect(); return r.bottom > -m && r.top < innerHeight + m; };

  function wake(cur, tx, ty) {
    clearTimeout(timers.get(cur));
    const sw = stage.clientWidth;
    if (cur.el.classList.contains('is-hidden') || Math.hypot(cur.x - tx, cur.y - ty) > 1100) {
      cur.set(clamp(tx + rand(-320, -120), 6, sw - 40), ty + rand(-200, -70));
    }
    cur.show();
  }
  function rest(cur) { clearTimeout(timers.get(cur)); timers.set(cur, setTimeout(() => cur.hide(), 2800)); }

  function revealAll(b, step = .08) {
    $$('.px', b).forEach((p, i) => { p.style.setProperty('--d', (i * step).toFixed(2) + 's'); p.classList.add('in'); });
  }
  function quick(b) {
    b.classList.add('is-wire', 'is-built');
    revealAll(b, .06);
    setTimeout(() => b.classList.add('polished'), 700);
  }

  /* MASTER: draws the wireframe, then builds the card frame */
  async function buildFrame(b, scale, SS) {
    if (reduceMotion || !near(b)) { quick(b); return; }
    const head = b.classList.contains('blk--head');
    const r0 = pageRect(b);
    wake(master, r0.x - 40, r0.y - 30);
    master.say(head ? 'writing heading' : 'drawing frame', 2600);
    if (!await master.moveTo(SS, r0.x - 6, r0.y - 6, 1150 * scale)) return;
    if (head) {
      b.classList.add('is-wire', 'is-built'); revealAll(b, .14);
      await wait(SS, 700 * scale); return;
    }
    const r = pageRect(b);
    master.down();
    const wf = mk('div', 'wf', layer);
    wf.innerHTML = '<i></i><i></i><i></i><i></i><span class="wf-dim"></span>';
    wf.style.left = r.x + 'px'; wf.style.top = r.y + 'px';
    const dim = $('.wf-dim', wf);
    const ok = await tween(SS, 1500 * scale, e => {
      const w = r.w * e, h = r.h * e;
      wf.style.width = w + 'px'; wf.style.height = h + 'px';
      master.set(r.x + w, r.y + h);
      dim.textContent = `${Math.round(w)} × ${Math.round(h)}`;
    });
    master.up();
    if (!ok) { wf.remove(); return; }
    b.classList.add('is-wire');
    if (!await wait(SS, 450 * scale)) { wf.remove(); return; }
    b.classList.add('is-built');
    wf.classList.add('out'); setTimeout(() => wf.remove(), 800);
    await wait(SS, 500 * scale);
  }

  async function runMaster(SS) {
    if (mBusy) return;
    mBusy = true;
    while (SS.alive && mQ.length) {
      const b = mQ.shift();
      const scale = clamp(1 - .14 * (mQ.length + dQ.length * .5), .4, 1);
      await buildFrame(b, scale, SS);
      if (!SS.alive) return;
      b.classList.add('is-wire', 'is-built');
      if (!b.classList.contains('blk--head')) { dQ.push(b); kickDetail(SS); }
    }
    if (SS === S) { mBusy = false; rest(master); }
  }

  /* DETAIL: reveals the interior in up to three passes, then polishes */
  async function polish(b, slot, SS) {
    const cur = slot.cur;
    const px = $$('.px', b);
    if (reduceMotion || !px.length || !near(b)) { revealAll(b); b.classList.add('polished'); return; }
    const groups = [[], [], []];
    px.forEach((p, i) => groups[Math.min(2, Math.floor(i * 3 / px.length))].push(p));
    for (const g of groups) {
      if (!g.length) continue;
      if (!SS.alive) return;
      if (!near(b)) { g.forEach((p, i) => { p.style.setProperty('--d', (i * .05) + 's'); p.classList.add('in'); }); continue; }
      const scale = clamp(1 - .14 * (mQ.length + dQ.length), .45, 1);
      const r = pageRect(g[0]);
      wake(cur, r.x - 30, r.y);
      cur.say(pick(['polishing', 'adding content', 'tuning spacing', 'refining type']), 1700);
      if (!await cur.moveTo(SS, r.x + Math.min(40, r.w * .3), r.y + Math.min(r.h * .5, 30), 850 * scale)) return;
      cur.down();
      if (!await wait(SS, 150)) return;
      cur.up();
      g.forEach((p, i) => { p.style.setProperty('--d', (i * .12).toFixed(2) + 's'); p.classList.add('in'); });
      if (!await wait(SS, 520 * scale + g.length * 70)) return;
    }
    b.classList.add('polished');
    await wait(SS, 300);
  }

  function kickDetail(SS) {
    while (SS.alive && dQ.length) {
      const slot = pool.find(p => !p.busy);
      if (!slot) return;
      const b = dQ.shift();
      slot.busy = true;
      polish(b, slot, SS).catch(() => {}).then(() => {
        slot.busy = false;
        if (!SS.alive) return;
        if (dQ.length) kickDetail(SS); else rest(slot.cur);
      });
    }
  }

  function enter(viewEl) {
    S.stop(); S = new Session();
    const SS = S;
    if (io) io.disconnect();
    timers.forEach(t => clearTimeout(t)); timers.clear();
    mQ = []; dQ = []; mBusy = false;
    layer.innerHTML = '';
    master = new Cursor(layer, CURS[0]);
    pool = CURS.slice(1).map(c => ({ cur: new Cursor(layer, c), busy: false }));

    blocks = [...$$('.blk', viewEl), foot];
    blocks.forEach(b => {
      b.classList.remove('is-wire', 'is-built', 'polished');
      $$('.px', b).forEach(p => { p.classList.remove('in'); p.style.removeProperty('--d'); });
    });

    if (!('IntersectionObserver' in window)) { blocks.forEach(quick); return; }
    setTimeout(() => {
      if (!SS.alive) return;
      io = new IntersectionObserver(entries => {
        let any = false;
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          io.unobserve(en.target); mQ.push(en.target); any = true;
        });
        if (any) { mQ.sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b)); runMaster(SS); }
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      blocks.forEach(b => io.observe(b));
    }, reduceMotion ? 0 : 750);   /* a beat of pure blank canvas */
  }

  return { enter };
})();

/* ---------- 7. ROUTER (tab-switching views) ---------- */
const VIEWS = ['home', 'projects', 'structure', 'contact'];
const TITLES = {
  home: 'ADWIN GROUP - Official Portfolio & Business Ecosystem',
  projects: 'Projects — ADWIN GROUP',
  structure: 'Struktur — ADWIN GROUP',
  contact: 'Hubungi Kami — ADWIN GROUP'
};
let currentView = null;
const viewFromHash = () => { const h = location.hash.replace('#', ''); return VIEWS.includes(h) ? h : 'home'; };

function showView(name) {
  if (!VIEWS.includes(name)) name = 'home';
  if (name === currentView) return;
  currentView = name;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== name; });
  $$('[data-go]').forEach(a => {
    const on = a.dataset.go === name && (a.classList.contains('nav-link') || a.classList.contains('dock-link'));
    if (a.classList.contains('nav-link') || a.classList.contains('dock-link')) {
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    }
  });
  document.title = TITLES[name];
  window.scrollTo(0, 0);
  Live.enter($('#view-' + name));
}
function go(name) {
  if (location.hash.replace('#', '') === name) { showView(name); return; }
  location.hash = name;            /* triggers hashchange → showView */
}
window.addEventListener('hashchange', () => { if (started) showView(viewFromHash()); });

/* ---------- GET STARTED ---------- */
function start() {
  if (started) return;
  started = true;
  Intro.stop();
  app.hidden = false;
  body.classList.add('started');
  intro.classList.add('leaving');
  showView(viewFromHash());
  setTimeout(() => { intro.remove(); }, 1500);
}
$('#get-started').addEventListener('click', start);

/* ---------- 8. IN-APP LINK PREVIEW MODAL ---------- */
const PV = (() => {
  const root = $('#pv'), frame = $('#pv-frame'), loader = $('#pv-loader'), note = $('#pv-note');
  const titleEl = $('#pv-title'), urlEl = $('#pv-url');
  const NOTE_DEFAULT = note.textContent;
  const EMBED_BLOCKERS = /(instagram|linkedin|github|tiktok|youtube|shopee|facebook|whatsapp|wa\.me|twitter|x\.com)/i;
  let url = '', lastFocus = null, warnTimer = 0, loadTimer = 0;

  function open(href, title) {
    url = href; lastFocus = document.activeElement;
    let host = href; try { host = new URL(href).hostname.replace(/^www\./, ''); } catch (_) {}
    titleEl.textContent = title || host;
    urlEl.textContent = href;
    loader.classList.remove('done'); note.classList.remove('warn');
    const blocked = EMBED_BLOCKERS.test(host);
    note.textContent = blocked
      ? `${host} biasanya memblokir tampilan embed (kebijakan situs). Jika preview kosong, pilih “Buka di Tab Baru”.`
      : NOTE_DEFAULT;
    if (blocked) note.classList.add('warn');
    root.hidden = false; body.classList.add('lock');
    requestAnimationFrame(() => root.classList.add('open'));
    frame.onload = () => { loader.classList.add('done'); clearTimeout(loadTimer); };
    frame.src = href;
    clearTimeout(loadTimer); loadTimer = setTimeout(() => loader.classList.add('done'), 7000);
    clearTimeout(warnTimer); warnTimer = setTimeout(() => note.classList.add('warn'), 3500);
    $('#pv-close').focus({ preventScroll: true });
  }
  function close() {
    if (root.hidden) return;
    root.classList.remove('open');
    clearTimeout(warnTimer); clearTimeout(loadTimer);
    setTimeout(() => { root.hidden = true; frame.onload = null; frame.src = 'about:blank'; body.classList.remove('lock'); }, 450);
    if (lastFocus && lastFocus.focus) safe(() => lastFocus.focus({ preventScroll: true }));
  }
  function proceed() {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    close();
  }
  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  $('#pv-go').addEventListener('click', proceed);
  document.addEventListener('keydown', e => {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {                                   /* tiny focus trap */
      const f = $$('button', root).filter(b => b.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return { open, close, get isOpen() { return !root.hidden; } };
})();

/* Universal click routing: internal views + external link interception */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented) return;
  if (a.dataset.go) { e.preventDefault(); if (started) go(a.dataset.go); return; }
  const href = a.getAttribute('href') || '';
  if (!/^https?:\/\//i.test(href)) return;                   /* mailto:, #hash … pass through */
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
  e.preventDefault();
  PV.open(href, a.dataset.title);
});

/* ---------- 9. GUEST CURSOR ---------- */
(function guestCursor() {
  const g = $('#guest');
  if (!finePointer) { g.remove(); return; }
  document.documentElement.classList.add('has-guest');
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    g.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    g.classList.add('on');
  }, { passive: true });
  document.addEventListener('pointerover', e => {
    const t = e.target;
    g.classList.toggle('is-link', !!t.closest('a, button, [role="button"], label, select'));
    g.classList.toggle('is-text', !!t.closest('input, textarea'));
  });
  document.addEventListener('pointerdown', () => g.classList.add('down'));
  document.addEventListener('pointerup', () => g.classList.remove('down'));
  document.documentElement.addEventListener('mouseleave', () => g.classList.remove('on'));
  document.documentElement.addEventListener('mouseenter', () => g.classList.add('on'));
  /* inside the iframe the real browser cursor takes over */
  const fr = $('#pv-frame');
  fr.addEventListener('mouseenter', () => g.classList.add('hide'));
  fr.addEventListener('mouseleave', () => g.classList.remove('hide'));
})();

/* Photos: if an image fails to load, fall back to the vector/placeholder underneath */
document.addEventListener('error', e => {
  const img = e.target;
  if (img && img.tagName === 'IMG') { const w = img.closest('.photo-wrap'); if (w) w.classList.add('no-photo'); }
}, true);
$$('.photo-wrap img').forEach(img => { if (img.complete && img.naturalWidth === 0) img.closest('.photo-wrap').classList.add('no-photo'); });

/* Card spotlight (pointer-follow glow) */
document.addEventListener('pointermove', e => {
  const b = e.target.closest && e.target.closest('.glass');
  if (!b) return;
  const r = b.getBoundingClientRect();
  b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  b.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });

/* ---------- 10. CONTACT FORM ---------- */
const toastEl = $('#toast');
let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}
function getFormData() {
  const f = { name: $('#name'), email: $('#email'), unit: $('#unit'), message: $('#message') };
  [f.name, f.message, f.email].forEach(i => i.classList.remove('invalid'));
  const data = { name: f.name.value.trim(), email: f.email.value.trim(), unit: f.unit.value, message: f.message.value.trim() };
  if (!data.name || !data.message) {
    if (!data.name) f.name.classList.add('invalid');
    if (!data.message) f.message.classList.add('invalid');
    toast('Harap isi Nama Lengkap dan Pesan Anda terlebih dahulu.');
    (!data.name ? f.name : f.message).focus();
    return null;
  }
  if (data.email && !f.email.checkValidity()) {
    f.email.classList.add('invalid'); toast('Format alamat email belum valid.'); f.email.focus(); return null;
  }
  return data;
}
$('#btn-wa').addEventListener('click', () => {
  const d = getFormData(); if (!d) return;
  const phone = '6282179175960';                             /* international format, no + */
  const text =
`Yth. *Adam Winatra (ADWIN GROUP)*,

Perkenalkan, saya *${d.name}*.
Melalui pesan ini, saya ingin mengajukan permohonan / pertanyaan terkait unit kerja *${d.unit}*.

Berikut adalah detail informasi kontak saya:
• *Nama:* ${d.name}
• *Email:* ${d.email || '-'}
• *Unit Tujuan:* ${d.unit}

*Pesan / Perihal:*
${d.message}

Demikian pesan ini saya sampaikan. Atas perhatian dan kesediaan Bapak/Ibu, saya ucapkan terima kasih.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
});
$('#btn-gmail').addEventListener('click', () => {
  const d = getFormData(); if (!d) return;
  const to = 'dtechhub.official@gmail.com';
  const subject = encodeURIComponent(`[Form Kontak] Pesan dari ${d.name} - ${d.unit}`);
  const bodyTxt = encodeURIComponent(
    `Nama Lengkap: ${d.name}\nEmail Pengirim: ${d.email || '-'}\nTujuan Unit Bisnis: ${d.unit}\n\nPesan:\n${d.message}`);
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${bodyTxt}`, '_blank', 'noopener,noreferrer');
});
$('#contactForm').addEventListener('submit', e => e.preventDefault());
$$('#contactForm .form-control').forEach(i => i.addEventListener('input', () => i.classList.remove('invalid')));

/* ---------- 11. CHATBOT ---------- */
const chatBox = $('#chat-box'), chatToggle = $('#chat-toggle-btn');
function setChat(open) {
  chatBox.classList.toggle('hidden', !open);
  chatToggle.setAttribute('aria-expanded', String(open));
  if (open) setTimeout(() => $('#chat-input').focus({ preventScroll: true }), 300);
}
chatToggle.addEventListener('click', e => { e.stopPropagation(); setChat(chatBox.classList.contains('hidden')); });
$('#chat-close-btn').addEventListener('click', e => { e.stopPropagation(); setChat(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !PV.isOpen && !chatBox.classList.contains('hidden')) setChat(false); });

function scrollBottom() { const c = $('#chat-messages'); c.scrollTop = c.scrollHeight; }
function appendMsg(text, cls, asHTML) {
  const m = mk('div', 'message ' + cls, $('#chat-messages'));
  if (asHTML) m.innerHTML = text; else m.textContent = text;
  scrollBottom();
  return m;
}
function sendMessage() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  appendMsg(text, 'user-message', false);
  input.value = '';
  const loading = appendMsg('Sedang mengetik...', 'bot-message', false);
  setTimeout(() => { loading.innerHTML = getAIReply(text); scrollBottom(); }, 600);
}
$('#chat-send-btn').addEventListener('click', sendMessage);
$('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
$$('[data-quick]').forEach(b => b.addEventListener('click', () => { $('#chat-input').value = b.dataset.quick; sendMessage(); }));

/* ---------- BOOT ---------- */
Intro.start();

/* DATABASE JAWABAN BOT (selalu mengembalikan string) */
function getAIReply(input) {
  if (!input) return "Ada yang bisa saya bantu?";
  
  const query = input.toLowerCase().trim();

  // FUNGSI HELPER: Mengecek apakah input mengandung salah satu kata kunci
  const hasAny = (...keywords) => keywords.some(kw => query.includes(kw));

  // 1. SAPAAN & PENYAMBUTAN
  if (['hai', 'hi', 'halo', 'helo', 'p', 'ping', 'pagi', 'siang', 'malam', 'tes', 'test'].some(g => query === g)) {
    return "Halo! 👋 Selamat datang di AI Assistant <b>ADWIN GROUP</b>. Ada yang bisa saya bantu seputar <b>DWIX Labs</b>, <b>DTech HUB</b>, atau <b>AD DJAYA</b>?";
  }

  // 2. ADWIN GROUP (HOLDING)
  if (hasAny('adwin group', 'adwin', 'holding', 'perusahaan', 'profile', 'profil', 'tentang bisnis')) {
    return "<b>ADWIN GROUP</b> adalah ekosistem bisnis teknologi terintegrasi sejak tahun 2022. Membawahi 3 unit bisnis utama: <b>AD DJAYA</b> (Retail), <b>DTech HUB</b> (Hardware Service), dan <b>DWIX Labs</b> (IoT & Web).";
  }

  // 3. DAFTAR UNIT BISNIS
  if (hasAny('unit', 'anak perusahaan', 'cabang', 'divisi', 'daftar bisnis', 'layanan', 'produk')) {
    return "<b>Ekosistem Bisnis ADWIN GROUP:</b><br>" +
           "1. <b>DWIX Labs:</b> IoT, Automation, & Web Development.<br>" +
           "2. <b>DTech HUB:</b> Hardware Service, Maintenance, & Troubleshooting.<br>" +
           "3. <b>AD DJAYA:</b> Retail & Penjualan Perangkat/Produk Resmi.";
  }

  // 4. FOUNDER / CEO
  if (hasAny('adam', 'winatra', 'founder', 'ceo', 'pemilik', 'pendiri', 'bos', 'pimpinan')) {
    return "<b>Adam Winatra</b> adalah Founder & CEO dari ADWIN GROUP, praktisi teknologi yang berfokus pada integrasi sistem jaringan, hardware elektronik, dan pengembangan solusi digital.";
  }

  // 5. TAHUN BERDIRI
  if (hasAny('sejarah', 'kapan berdiri', 'sejak kapan', 'tahun berapa', 'lama berdiri')) {
    return "<b>ADWIN GROUP</b> didirikan pada tahun <b>2022</b> oleh Adam Winatra dan terus berkembang membawahi sektor Hardware Service, Retail, hingga IoT & Software Development.";
  }

  // DWIX LABS - IOT & WEB DEVELOPMENT (COMBINED)
  if (hasAny('dwix', 'iot', 'internet of things', 'mikrokontroler', 'esp32', 'arduino', 'sensor', 'otomatisasi', 'automation', 'hardware dev', 'web', 'website', 'aplikasi', 'software', 'bikin web', 'buat web', 'frontend', 'backend', 'fullstack')) {
    return "<b>DWIX Labs</b> melayani dua divisi utama:<br>" +
           "• <b>Divisi IoT:</b> Riset & pengembangan hardware berbasis IoT, mikrokontroler (ESP32/Arduino), integrasi sensor, smart device, hingga dashboard monitoring real-time.<br>" +
           "• <b>Divisi Web Dev:</b> Pembuatan website perusahaan (company profile), web application, sistem manajemen, landing page, dan integrasi API modern.";
  }

  // 8. DTECH HUB - JASA SERVIS & HARDWARE
  if (hasAny('dtech', 'hub', 'servis', 'service', 'hardware', 'perbaikan', 'rusak', 'laptop', 'komputer', 'pc', 'maintenance', 'benerin')) {
    return "<b>DTech HUB:</b> Melayani perbaikan (servis) hardware, pemeliharaan komputer/laptop, pembersihan rutin, hingga penanganan masalah teknis (*troubleshooting*).";
  }

  // 9. AD DJAYA - RETAIL & PENJUALAN
  if (hasAny('djaya', 'retail', 'toko', 'jual', 'beli', 'produk', 'stok', 'tokopedia', 'shopee', 'belanja')) {
    return "<b>AD DJAYA:</b> Unit bisnis retail resmi di bawah ADWIN GROUP yang berfokus pada penyediaan dan penjualan produk teknologi, komponen elektronik, dan perlengkapan hardware berkualitas.";
  }

  // 10. HARGA & ESTIMASI BIAYA
  if (hasAny('harga', 'biaya', 'tarif', 'berapa', 'estimasi', 'bayar', 'pricelist')) {
    return "Estimasi biaya bervariasi:<br>" +
           "• <b>DWIX Labs:</b> Sesuai kompleksitas fitur Web/IoT.<br>" +
           "• <b>DTech HUB:</b> Tergantung tingkat kerusakan & suku cadang.<br>" +
           "• <b>AD DJAYA:</b> Sesuai katalog produk.<br>" +
           "Hubungi kami untuk konsultasi penawaran harga pasti!";
  }

  // 11. ALUR PEMESANAN / CARA ORDER
  if (hasAny('cara order', 'cara pesan', 'alur', 'proses', 'alur kerja', 'cara sewa', 'alur pemesanan')) {
    return "<b>Alur Pemesanan & Kerjasama:</b><br>" +
           "1. Konsultasi Kebutuhan / Diagnosa Masalah.<br>" +
           "2. Penawaran Biaya (Quotation) & Kesepakatan.<br>" +
           "3. Pengerjaan Proyek / Servis oleh Tim.<br>" +
           "4. Pengujian (Testing) & Penyerahan Hasil.";
  }

  // 12. GARANSI & AFTER SALES
  if (hasAny('garansi', 'warranty', 'terpercaya', 'aman', 'kualitas', 'aftersales', 'after sales')) {
    return "Setiap layanan servis di <b>DTech HUB</b>, proyek sistem di <b>DWIX Labs</b>, maupun pembelian di <b>AD DJAYA</b> dilengkapi jaminan garansi resmi dan dukungan purna jual (*after-sales support*).";
  }

  // 13. LOKASI / ALAMAT / KONTAK
  if (hasAny('lokasi', 'alamat', 'dimana', 'kantor', 'kontak', 'hubungi', 'wa', 'whatsapp', 'admin', 'email')) {
    return "Untuk diskusi proyek, konsultasi servis, atau pembelian produk, Anda dapat menghubungi <b>Admin ADWIN GROUP</b> via tombol kontak atau WhatsApp resmi di platform ini.";
  }

  // 14. KERJASAMA / MITRA / PROPOSAL
  if (hasAny('kerjasama', 'kerja sama', 'mitra', 'partnership', 'investasi', 'proposal', 'vendor')) {
    return "<b>ADWIN GROUP</b> terbuka untuk kemitraan, kolaborasi proyek, maupun vendor pasokan teknologi. Silakan ajukan proposal atau hubungi manajemen kami via kontak resmi.";
  }

  // 15. VISI & MISI
  if (hasAny('visi', 'misi', 'tujuan', 'target')) {
    return "<b>Visi ADWIN GROUP:</b> Menjadi ekosistem teknologi terdepan yang mengintegrasikan layanan hardware, software, dan retail secara efisien serta andal untuk skala personal maupun bisnis.";
  }

  // 16. KONSULTASI / CUSTOM PROJECT
  if (hasAny('custom', 'konsultasi', 'request', 'minta buatkan', 'bisa buat', 'bisa gak')) {
    return "Tentu bisa! Tim <b>DWIX Labs</b> dan <b>DTech HUB</b> siap menerima permintaan *custom* sesuai kebutuhan proyek IoT, aplikasi web, ataupun spesifikasi hardware Anda.";
  }

  // 17. JAM OPERASIONAL / JAM KERJA
  if (hasAny('jam', 'buka', 'tutup', 'operasional', 'hari apa')) {
    return "Layanan operasional <b>ADWIN GROUP</b> aktif pada jam kerja resmi. Untuk konsultasi via chat/WhatsApp dapat diakses kapan saja dan akan dibalas secepat mungkin oleh admin.";
  }

  // 18. PEMBAYARAN / PAYMENT METHOD
  if (hasAny('transfer', 'bayar', 'pembayaran', 'bank', 'qris', 'rekening', 'dp')) {
    return "Pembayaran transaksi bisnis di unit <b>ADWIN GROUP</b> mendukung berbagai metode resmi seperti Transfer Bank, QRIS, dan sistem DP (Down Payment) untuk pengerjaan proyek.";
  }

  // 19. KOMPLAIN / TROUBLESHOOTING
  if (hasAny('komplain', 'kendala', 'masalah', 'error', 'rusak lagi', 'bantu', 'retur')) {
    return "Mohon maaf atas kendalanya. Silakan sampaikan detail masalah kendala atau nomor nota/pemesanan Anda ke <b>Kontak ADWIN GROUP</b> untuk konsultasi secepatnya.";
  }

  // 20. KEUNGGULAN / KENAPA HARUS ADWIN GROUP
  if (hasAny('keunggulan', 'kelebihan', 'kenapa harus', 'kenapa memilih', 'alasan')) {
    return "<b>Mengapa Memilih ADWIN GROUP?</b><br>" +
           "• Solusi Terintegrasi (Hardware, Software, Retail dalam 1 ekosistem).<br>" +
           "• Ditangani oleh praktisi berpengalaman.<br>" +
           "• Jaminan garansi transparan & respon cepat.";
  }

  // 21. TENTANG DWIX LABS SECARA UMUM
  if (hasAny('apa itu dwix', 'dwix labs itu apa', 'profil dwix')) {
    return "<b>DWIX Labs</b> adalah laboratorium riset & pengembangan (R&D) berbasis teknologi di bawah ADWIN GROUP yang berfokus pada inovasi IoT dan pembuatan Web Application.";
  }

  // 22. TENTANG DTECH HUB SECARA UMUM
  if (hasAny('apa itu dtech', 'dtech hub itu apa', 'profil dtech')) {
    return "<b>DTech HUB</b> adalah pusat perbaikan dan perawatan teknis hardware elektronik, komputer, dan perangkat jaringan di bawah naungan ADWIN GROUP.";
  }

  // 23. TENTANG AD DJAYA SECARA UMUM
  if (hasAny('apa itu ad djaya', 'ad djaya itu apa', 'profil ad djaya')) {
    return "<b>AD DJAYA</b> adalah unit usaha retail resmi ADWIN GROUP yang melayani penjualan produk teknologi, perangkat hardware, dan sparepart berkualitas.";
  }

  // 24. PENGATURAN SMART HOME (DWIX LABS)
  if (hasAny('smart home', 'rumah pintar', 'otomatisasi rumah', 'saklar otomatis')) {
    return "<b>DWIX Labs</b> dapat mengembangkan sistem *Smart Home* berbasis IoT yang memungkinkan Anda mengontrol lampu, perangkat elektronik, dan keamanan rumah via smartphone.";
  }

  // 25. MONITORING DAN SENSOR (DWIX LABS)
  if (hasAny('monitoring', 'pantau', 'sensor suhu', 'kelembaban', 'log data')) {
    return "<b>DWIX Labs</b> menyediakan solusi monitoring berbasis sensor untuk membaca data lingkungan, suhu, atau status perangkat secara real-time melalui web dashboard.";
  }

  // 26. PEMBUATAN PORTFOLIO & COMPANY PROFILE (DWIX LABS)
  if (hasAny('company profile', 'portofolio web', 'web bisnis', 'web perorangan')) {
    return "<b>DWIX Labs</b> melayani pembuatan website Company Profile dan Portofolio interaktif yang modern, responsif, dan ringan untuk memperkuat branding Anda.";
  }

  // 27. PEMBUATAN LANDING PAGE (DWIX LABS)
  if (hasAny('landing page', 'web promosi', 'halaman penjualan')) {
    return "Butuh halaman khusus jualan/promosi? <b>DWIX Labs</b> merancang Landing Page yang cepat, menarik, dan teroptimasi untuk meningkatkan konversi penjualan Anda.";
  }

  // 28. INTEGRASI API & DASHBOARD WEB (DWIX LABS)
  if (hasAny('api', 'dashboard', 'backend web', 'database web', 'sistem web')) {
    return "<b>DWIX Labs</b> berpengalaman dalam membangun REST API, Dashboard admin, dan pengelolaan database untuk menghubungkan sistem web dengan perangkat IoT Anda.";
  }

  // 29. SERVIS LAPTOP & COMPUTER (DTECH HUB)
  if (hasAny('servis laptop', 'servis pc', 'laptop mati', 'komputer lambat', 'lemot')) {
    return "<b>DTech HUB</b> melayani perbaikan laptop/PC lambat, mati total, ganti sparepart, instal ulang sistem, hingga perawatan termal (thermal paste).";
  }

  // 30. MAINTENANCE & PERAWATAN ROUTINE (DTECH HUB)
  if (hasAny('maintenance', 'perawatan', 'bersihin pc', 'pembersihan hardware', 'rakit pc')) {
    return "<b>DTech HUB</b> menyediakan jasa perawatan pembersihan debu hardware, manajemen kabel (cable management), serta perakitan PC sesuai kebutuhan anggaran Anda.";
  }

  // 31. SOLUSI MIKROKONTROLER (DWIX LABS)
  if (hasAny('node mcu', 'stm32', 'raspberry', 'board iot')) {
    return "Tim <b>DWIX Labs</b> berpengalaman mengonfigurasi dan memrogram berbagai board mikrokontroler seperti ESP32, NodeMCU, Arduino, hingga Raspberry Pi.";
  }

  // 32. KATALOG PENJUALAN (AD DJAYA)
  if (hasAny('katalog', 'daftar barang', 'barang ready', 'jual apa aja')) {
    return "<b>AD DJAYA</b> menyediakan berbagai komponen elektronik, modul IoT, perlengkapan hardware komputer, dan aksesori teknologi resmi. Hubungi admin untuk katalog terbaru!";
  }

  // 33. PEMESANAN BARANG RETAIL (AD DJAYA)
  if (hasAny('pesan barang', 'beli komponen', 'order sparepart')) {
    return "Anda bisa memesan komponen hardware atau sparepart langsung melalui <b>AD DJAYA</b> dengan jaminan produk asli dan pengiriman aman.";
  }

  // 34. DISKON & PROMO
  if (hasAny('diskon', 'promo', 'potongan harga', 'cashback', 'murah')) {
    return "<b>ADWIN GROUP</b> secara berkala menghadirkan penawaran promo khusus untuk jasa perbaikan di DTech HUB, paket website DWIX Labs, maupun belanja di AD DJAYA!";
  }

  // 35. CLIENT & PORTOFOLIO PROYEK
  if (hasAny('portofolio', 'project yang pernah', 'contoh proyek', 'karya')) {
    return "<b>ADWIN GROUP</b> telah mengerjakan berbagai proyek perbaikan hardware di DTech HUB, sistem monitoring & otomasi di DWIX Labs, serta layanan web interaktif.";
  }

  // 36. DURASI PENGERJAAN PROYEK WEB/IOT
  if (hasAny('berapa lama', 'durasi', 'pengerjaan', 'estimasi waktu', 'proses berapa hari')) {
    return "Waktu pengerjaan bergantung pada skala proyek:<br>• Servis DTech HUB: 1–3 hari.<br>• Web/IoT DWIX Labs: 3 hari hingga beberapa minggu sesuai kompleksitas.";
  }

  // 37. REVISI PROYEK WEB (DWIX LABS)
  if (hasAny('revisi', 'perbaikan web', 'ubah tampilan', 'edit web')) {
    return "Setiap proyek pembuatan website di <b>DWIX Labs</b> mencakup sesi revisi sesuai kesepakatan awal untuk memastikan hasil akhir sesuai keinginan Anda.";
  }

  // 38. DIAGNOSA KERUSAKAN HARDWARE (DTECH HUB)
  if (hasAny('cek kerusakan', 'diagnosa', 'pemeriksaan', 'biaya cek')) {
    return "Bawa perangkat Anda ke <b>DTech HUB</b> untuk pemeriksaan dan diagnosa masalah teknis awal secara akurat sebelum dilakukan perbaikan.";
  }

  // 39. SISTEM DP / DOWN PAYMENT
  if (hasAny('dp berapa', 'uang muka', 'bayar bertahap', 'termin')) {
    return "Untuk pengerjaan proyek IoT dan Web Development di <b>DWIX Labs</b>, sistem pembayaran umumnya menggunakan DP awal sesuai kesepakatan dan pelunasan saat pengerjaan rampung.";
  }

  // 40. PENGIRIMAN BARANG (AD DJAYA)
  if (hasAny('pengiriman', 'kirim paket', 'ongkir', 'ekspedisi', 'jne', 'jnt', 'sicepat')) {
    return "<b>AD DJAYA</b> mendukung pengiriman produk ke seluruh Indonesia menggunakan berbagai opsi ekspedisi terpercaya dengan packing rapi & aman.";
  }

  // 41. DUKUNGAN MAINTENANCE SYSTEM (DWIX LABS)
  if (hasAny('maintenance web', 'rawat web', 'pendampingan', 'support sistem')) {
    return "<b>DWIX Labs</b> menyediakan paket pendampingan dan *system maintenance* berkala agar website atau sistem IoT Anda tetap berjalan lancar tanpa kendala.";
  }

  // 42. KONSULTASI GRATIS
  if (hasAny('konsultasi gratis', 'tanya gratis', 'diskusi proyek')) {
    return "Anda bisa berkonsultasi secara <b>GRATIS</b> dengan tim ADWIN GROUP mengenai kebutuhan perbaikan hardware, ide proyek IoT, ataupun pembuatan website!";
  }

  // 43. LEGALITAS & KEAMANAN BISNIS
  if (hasAny('resmi', 'legal', 'aman gak', 'terpercaya gak')) {
    return "<b>ADWIN GROUP</b> adalah entitas bisnis yang beroperasi secara profesional, amanah, serta transparan sejak tahun 2022 di seluruh lini usahanya.";
  }

  // 44. SYARAT & KETENTUAN GARANSI
  if (hasAny('syarat garansi', 'klaim garansi', 'nota garansi')) {
    return "Klaim garansi di <b>DTech HUB</b> atau <b>AD DJAYA</b> cukup menunjukkan bukti pembayaran/nota resmi dan memastikan segel garansi tidak rusak.";
  }

  // 45. PERBEDAAN DWIX LABS DAN DTECH HUB
  if (hasAny('beda dwix dan dtech', 'perbedaan dwix dtech', 'bedanya apa')) {
    return "<b>Perbedaannya:</b><br>• <b>DTech HUB:</b> Fokus pada *servis hardware* & perbaikan perangkat.<br>• <b>DWIX Labs:</b> Fokus pada *riset & pembuatan* proyek IoT serta Web Development.";
  }

  // 46. CAREER / LOWONGAN / MAGANG
  if (hasAny('karir', 'lowongan', 'loker', 'magang', 'internship', 'kerja di adwin')) {
    return "<b>ADWIN GROUP</b> selalu terbuka untuk bakat-bakat baru di bidang Hardware & Software. Silakan kirimkan CV atau portofolio Anda ke kontak admin resmi kami.";
  }

  // 47. UPGRADE HARDWARE (DTECH HUB)
  if (hasAny('upgrade', 'tambah ram', 'ganti ssd', 'upgrade pc', 'upgrade laptop')) {
    return "Ingin laptop atau PC lebih kencang? <b>DTech HUB</b> menyediakan layanan upgrade RAM, penggantian SSD, dan optimalisasi kinerja hardware.";
  }

  // 48. SOURCING SPAREPART LANGKA (AD DJAYA & DTECH HUB)
  if (hasAny('sparepart langka', 'cari sparepart', 'komponen susah')) {
    return "<b>AD DJAYA</b> & <b>DTech HUB</b> dapat membantu Anda mencarikan komponen atau sparepart elektronik yang sulit ditemukan di pasaran umum.";
  }

  // 49. PERTANYAAN UMUM BANTUAN AI
  if (hasAny('bisa bantu apa', 'fitur ai', 'kamu ai apa', 'tugas kamu')) {
    return "Saya adalah AI Assistant <b>ADWIN GROUP</b>. Saya bertugas memberikan informasi seputar layanan <b>DWIX Labs</b> (IoT/Web), <b>DTech HUB</b> (Service), dan <b>AD DJAYA</b> (Retail).";
  }

  // 50. PENUTUP / TERIMA KASIH
  if (hasAny('terima kasih', 'makasih', 'thanks', 'suwun', 'ok sip', 'oke sip', 'ok thanks')) {
    return "Sama-sama! 🙏 Senang bisa membantu. Jika ada pertanyaan lain seputar <b>ADWIN GROUP</b>, jangan ragu untuk bertanya lagi!";
  }

  // FALLBACK RESPON (KHUSUS SEPUTAR BISNIS)
  return "Maaf, informasi tersebut belum ada di basis data bisnis saya. Silakan tanyakan hal seputar ekosistem <b>ADWIN GROUP</b>, <b>DWIX Labs</b>, <b>DTech HUB</b>, atau <b>AD DJAYA</b>!";
}

})();
