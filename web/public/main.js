import * as THREE from './vendor/three.module.min.js';
import { typedRoles, projects, subdomains, skills } from './data.js';
import { mountChat, chatMarkup } from './chat.js';
import { initialLang, applyStatic } from './i18n.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

/* ---------- 3D background: particles that morph into a shape per section ---------- */
const N = 12000;

// Each generator fills N points (x, y, z) roughly within a radius of ~3.
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
// Each generator maps particle index i -> [x, y, z] (roughly within radius 3). Forms are kept crisp:
// most particles sit exactly on edges/surfaces, only a small share adds soft glow.
const TAU = Math.PI * 2, gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const SHAPES = {
  // Four logarithmic arms + a dense bright core.
  galaxy(i) {
    if (i % 6 === 0) { const r = Math.pow(Math.random(), 2.2) * 0.9, a = Math.random() * TAU; return [Math.cos(a) * r, gauss() * 0.18 * (1 - r), Math.sin(a) * r]; }
    const arm = i % 4, t = Math.pow(Math.random(), 0.8), r = 0.35 + t * 3.1, a = arm * TAU / 4 + Math.log(r + 1) * 2.6;
    const w = 0.12 + t * 0.32;
    return [Math.cos(a) * r + gauss() * w, gauss() * 0.06, Math.sin(a) * r + gauss() * w];
  },
  // Two clean strands with evenly spaced base-pair rungs.
  helix(i) {
    const turns = 3.2, h = 6.4, R = 1.15;
    if (i % 3 === 2) { const k = Math.floor(Math.random() * 44), u = (k + 0.5) / 44, a = u * TAU * turns, y = (u - 0.5) * h, s = rnd(1);
      return [Math.cos(a) * R * s, y + rnd(0.015), Math.sin(a) * R * s]; }
    const u = Math.random(), a = u * TAU * turns + (i % 3 ? Math.PI : 0), y = (u - 0.5) * h;
    return [Math.cos(a) * R + rnd(0.04), y + rnd(0.04), Math.sin(a) * R + rnd(0.04)];
  },
  // Precise gear: trapezoid teeth outline, rim, 6 spokes and a hub, extruded slightly.
  gear(i) {
    const teeth = 16, rOut = 2.75, rRoot = 2.35, z = rnd(0.22), k = i % 10;
    if (k < 5) { // tooth profile along the perimeter
      const a = Math.random() * TAU, ph = (a / TAU * teeth) % 1;
      const r = ph < 0.18 ? rRoot + (rOut - rRoot) * ph / 0.18 : ph < 0.5 ? rOut : ph < 0.68 ? rOut - (rOut - rRoot) * (ph - 0.5) / 0.18 : rRoot;
      return [Math.cos(a) * r, Math.sin(a) * r, z];
    }
    if (k < 7) { const a = Math.random() * TAU, r = 1.85 + rnd(0.04); return [Math.cos(a) * r, Math.sin(a) * r, z]; } // inner rim
    if (k < 9) { const s = Math.floor(Math.random() * 6) * TAU / 6, r = 0.55 + Math.random() * 1.3; return [Math.cos(s) * r + rnd(0.05), Math.sin(s) * r + rnd(0.05), z]; } // spokes
    const a = Math.random() * TAU, r = 0.35 + Math.random() * 0.2; return [Math.cos(a) * r, Math.sin(a) * r, z]; // hub
  },
  // Three stacked app windows: rounded frame, title bar with dots, content rows.
  windows(i) {
    const w = 2.3, h = 1.5, layer = i % 3, off = [[-0.9, 0.75, -0.9], [0, 0, 0], [0.9, -0.75, 0.9]][layer];
    const k = Math.floor(i / 3) % 10, P = (x, y) => [x + off[0], y + off[1], off[2] + rnd(0.02)];
    if (k < 5) { // frame
      const t = Math.random() * 2 * (w + h) * 2, per = 2 * (w + h), u = t % per;
      let x, y; if (u < 2 * w) { x = -w + u; y = h; } else if (u < 2 * w + 2 * h) { x = w; y = h - (u - 2 * w); } else if (u < 4 * w + 2 * h) { x = w - (u - 2 * w - 2 * h); y = -h; } else { x = -w; y = -h + (u - 4 * w - 2 * h); }
      return P(x, y);
    }
    if (k === 5) return P(-w + Math.random() * 2 * w, h - 0.38); // title bar line
    if (k === 6) { const d = Math.floor(Math.random() * 3), a = Math.random() * TAU; return P(-w + 0.25 + d * 0.22 + Math.cos(a) * 0.06, h - 0.19 + Math.sin(a) * 0.06); }
    const row = Math.floor(Math.random() * 4); return P(-w + 0.3 + Math.random() * (row === 0 ? 1.6 : 3.4), h - 0.75 - row * 0.45); // content rows
  },
  // Neural sphere: nodes on a Fibonacci sphere joined by arcs to their nearest neighbours.
  neural(i) {
    const n = 72, node = j => { const y = 1 - 2 * (j + 0.5) / n, r = Math.sqrt(1 - y * y), a = j * 2.39996; return [Math.cos(a) * r * 2.2, y * 2.2, Math.sin(a) * r * 2.2]; };
    const j = i % n;
    if (i % 3 === 0) { const p = node(j); return [p[0] + rnd(0.07), p[1] + rnd(0.07), p[2] + rnd(0.07)]; }
    const q = node((j + [1, 8, 13, 21][i % 4]) % n), p = node(j), t = Math.random();
    const m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], l = Math.hypot(...m) || 1;
    return m.map(v => v / l * 2.2 * (1 + 0.06 * Math.sin(t * Math.PI))); // arc bulges slightly outward
  },
  // Globe lattice + three tilted orbits with satellites.
  globe(i) {
    const R = 2;
    if (i % 4 === 0) { const o = i % 3, a = Math.random() * TAU, r = 2.9 + o * 0.35, tilt = [0.45, -0.6, 1.2][o];
      if (i % 40 === 0) { const sa = o * 2.1; return [Math.cos(sa) * r + rnd(0.08), Math.sin(sa) * r * Math.sin(tilt) + rnd(0.08), Math.sin(sa) * r * Math.cos(tilt) + rnd(0.08)]; }
      return [Math.cos(a) * r, Math.sin(a) * r * Math.sin(tilt), Math.sin(a) * r * Math.cos(tilt)]; }
    const lines = 10, k = Math.floor(Math.random() * lines), t = Math.random() * TAU;
    if (i % 2) { const ph = ((k + 0.5) / lines) * Math.PI; return [Math.sin(ph) * Math.cos(t) * R, Math.cos(ph) * R, Math.sin(ph) * Math.sin(t) * R]; }
    const th = (k / lines) * Math.PI; return [Math.sin(t) * Math.cos(th) * R, Math.cos(t) * R, Math.sin(t) * Math.sin(th) * R];
  },
  // (2,3) torus knot drawn as a thin tube.
  knot(i) {
    const t = Math.random() * TAU, p = 2, q = 3, r = Math.cos(q * t) + 2.2, tube = 0.16 * Math.sqrt(Math.random()), b = Math.random() * TAU;
    const c = [r * Math.cos(p * t), r * Math.sin(p * t), -Math.sin(q * t)];
    return [c[0] + Math.cos(b) * tube, c[1] + Math.sin(b) * tube, c[2] + Math.cos(b + 1) * tube].map(v => v * 0.95);
  },
  // Portal: crisp ring plus a vortex spiralling into the centre (behind the heading).
  portal(i) {
    if (i % 3 === 0) { const a = Math.random() * TAU, u = Math.random(), r = 0.3 + u * 4.8, sw = a + u * 5; return [Math.cos(sw) * r, Math.sin(sw) * r * 0.6, -1.6 - u * 0.6]; }
    const a = Math.random() * TAU, tube = Math.random() * TAU, tr = 0.12 * Math.sqrt(Math.random()), R = 5.2 + Math.cos(tube) * tr;
    return [Math.cos(a) * R, Math.sin(a) * R * 0.6, Math.sin(tube) * tr - 1.5];
  },
};

const scale = (a, k) => { for (let i = 0; i < a.length; i++) a[i] *= k; return a; };
const fromGen = gen => { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) a.set(gen(i), i * 3); return a; };

function scene3d() {
  const canvas = $('#bg3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const targets = {
    top: fromGen(SHAPES.galaxy),
    about: fromGen(SHAPES.helix),
    work: fromGen(SHAPES.gear),
    projects: scale(fromGen(SHAPES.windows), 0.85),
    ai: scale(fromGen(SHAPES.neural), 0.42),
    eco: fromGen(SHAPES.globe),
    skills: fromGen(SHAPES.knot),
    contact: fromGen(SHAPES.portal),
  };

  const geo = new THREE.BufferGeometry();
  const from = targets.top.slice(), to = targets.top.slice();
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(from, 3));
  geo.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 }, uMix: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) }, uAspect: { value: 1 },
      uSize: { value: 34 * renderer.getPixelRatio() }, uAlpha: { value: 1 },
      uA: { value: new THREE.Color(0x7c5cff) }, uB: { value: new THREE.Color(0x22d3ee) },
    },
    vertexShader: `
      attribute vec3 aTo; attribute float aSeed;
      uniform float uT, uMix, uSize, uAspect; uniform vec2 uMouse;
      varying float vSeed; varying float vGlow;
      void main() {
        // Staggered morph with a swirl in the middle of the transition.
        float m = smoothstep(aSeed * .35, .65 + aSeed * .35, uMix);
        vec3 p = mix(position, aTo, m);
        float mid = sin(m * 3.14159);
        float a = mid * (aSeed - .5) * 2.;
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        p += normalize(p + .001) * mid * (.6 + aSeed);
        // Idle breathing.
        p += .04 * vec3(sin(uT * 1.3 + aSeed * 40.), cos(uT * 1.1 + aSeed * 30.), sin(uT * .9 + aSeed * 20.));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        // Cursor repulsion in SCREEN space: exact under the pointer whatever the shape's depth or tilt.
        vec4 clip = projectionMatrix * mv;
        vec2 dd = (clip.xy / clip.w - uMouse) * vec2(uAspect, 1.);
        float r = length(dd);
        // Close in: pushed away (a clear hole). Further out: pulled in (arms bend toward the cursor),
        // so the scene reacts even when the pointer sits between the spiral arms.
        float f = smoothstep(.11, 0., r);
        float g = smoothstep(.42, .11, r) * (1. - f);
        vec2 dir = normalize(dd + .0001);
        // View-space offsets scaled by depth look the same on screen at any distance.
        mv.xy += dir * (f * .05 - g * .03) * -mv.z;
        vGlow = max(f, g * .7);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (.35 + aSeed * .65) / -mv.z;
        vSeed = aSeed;
      }`,
    fragmentShader: `
      uniform vec3 uA, uB; uniform float uAlpha;
      varying float vSeed; varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .0, d);
        vec3 c = mix(uA, uB, vSeed) + vGlow * .6;
        gl_FragColor = vec4(c, a * (.55 + vGlow * .45) * uAlpha);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // Faint background dust.
  const dn = 1500, dp = new Float32Array(dn * 3);
  // Keep dust well behind the camera's near range: points close to the lens render as big squares.
  for (let i = 0; i < dn; i++) dp.set([rnd(25), rnd(16), -24 + Math.random() * 26], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x8b90a5, size: 0.03, transparent: true, opacity: 0.5 }));
  scene.add(dust);

  // Morph to a new target, starting from wherever the particles are now.
  let current = 'top', mixT = 1, morphStart = 0;
  const morph = key => {
    if (!targets[key] || key === current) return;
    const k = mat.uniforms.uMix.value;
    for (let i = 0; i < N * 3; i++) from[i] = from[i] + (to[i] - from[i]) * Math.min(1, k);
    to.set(targets[key]);
    geo.attributes.position.needsUpdate = true; geo.attributes.aTo.needsUpdate = true;
    mixT = 0; morphStart = performance.now(); current = key;
  };
  const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) morph(e.target.id || 'top'); }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section').forEach(s => sio.observe(s));

  const mouse = new THREE.Vector2(9, 9), target = new THREE.Vector2(), ZERO = new THREE.Vector2();
  // Relative to the canvas itself (innerWidth includes the scrollbar, the fixed canvas does not).
  addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) mouse.set(9, 9); });
  addEventListener('blur', () => mouse.set(9, 9));

  const wide = () => innerWidth > 900;
  const resize = () => {
    renderer.setSize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, false);
    camera.aspect = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight); camera.updateProjectionMatrix();
    camera.position.z = wide() ? 10 : 13;
  };
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    // Wall-clock based so the morph completes even at low frame rates.
    mixT = Math.min(1, (performance.now() - morphStart) / 1800);
    mat.uniforms.uMix.value = reduced ? 1 : mixT;
    mat.uniforms.uT.value = reduced ? 0 : t;
    target.lerp(mouse.x > 2 ? ZERO : mouse, 0.08); // pointer outside: ease back to centre

    // Repulsion follows the pointer closely; the slower 'target' only drives the camera/rotation sway.
    mat.uniforms.uMouse.value.lerp(mouse, 0.45);
    mat.uniforms.uAspect.value = camera.aspect;

    // Text shapes face the camera; others spin slowly.
    const flat = ['work', 'projects', 'contact'].includes(current);
    const ry = flat ? target.x * 0.35 : t * 0.12 + target.x * 0.6;
    group.rotation.y += (ry - group.rotation.y) * 0.05;
    // Only the gear spins in-plane; other shapes stay upright.
    points.rotation.z = current === 'work' ? points.rotation.z + 0.004 : points.rotation.z * 0.85;
    group.rotation.x += ((current === 'top' ? 1.05 : 0) - target.y * 0.25 - group.rotation.x) * 0.05;
    // Sit on the right on desktop (content is left), centred on mobile / contact.
    const gx = wide() && current !== 'contact' ? (current === 'ai' ? 4.1 : 3.4) : 0;
    group.position.x += (gx - group.position.x) * 0.05;
    // In the AI section the chat box fills the lower area, so lift the net into the empty top-right.
    const aiTop = current === 'ai' && wide();
    group.position.y += ((aiTop ? 3.2 : 0) - group.position.y) * 0.05;
    mat.uniforms.uAlpha.value += ((wide() || current === 'top' ? 1 : 0.45) - mat.uniforms.uAlpha.value) * 0.05;
    dust.rotation.y = t * 0.01;
    renderer.render(scene, camera);
  })();
}
try { scene3d(); } catch (e) { console.warn('WebGL unavailable', e); }

/* ---------- Typing effect ---------- */
(async function type() {
  const el = $('#typed');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; ; i = (i + 1) % typedRoles.length) {
    const w = typedRoles[i];
    for (let j = 1; j <= w.length; j++) { el.textContent = w.slice(0, j); await sleep(45); }
    await sleep(1800);
    for (let j = w.length; j >= 0; j--) { el.textContent = w.slice(0, j); await sleep(22); }
    await sleep(250);
  }
})();

/* ---------- Render projects / ecosystem / skills (language-aware) ---------- */
let lang = initialLang();
const cats = ['All', ...new Set(projects.map(p => p.cat))];
$('#filters').innerHTML = cats.map((c, i) => `<button class="${i ? '' : 'active'}" data-c="${c}">${c}</button>`).join('');
$('#filters').addEventListener('click', e => {
  const c = e.target.dataset.c; if (!c) return;
  document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('active', b === e.target));
  document.querySelectorAll('.project').forEach(p => p.classList.toggle('hidden', c !== 'All' && p.dataset.c !== c));
});

function renderContent(first) {
  const t = o => (lang === 'en' && o.desc_en) || o.desc;
  const shown = first ? '' : ' in'; // re-renders skip the scroll-reveal animation
  const active = $('#filters .active')?.dataset.c || 'All';
  $('#projectGrid').innerHTML = projects.map(p => `
  <article class="project tilt reveal${shown}${active !== 'All' && p.cat !== active ? ' hidden' : ''}" data-c="${p.cat}">
    ${p.private ? '<span class="badge-private">internal</span>' : ''}
    <div class="icon">${p.icon}</div>
    <h3>${p.title}</h3>
    <p>${t(p)}</p>
    <div class="tags">${p.tags.map(x => `<span>${x}</span>`).join('')}</div>
    ${p.repoUrl || p.live ? `<div class="links">${p.repoUrl ? `<a href="${p.repoUrl}" target="_blank" rel="noopener">code ↗</a>` : ''}${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">live ↗</a>` : ''}</div>` : ''}
  </article>`).join('');
  $('#eco').innerHTML = subdomains.map(s => `
  <a class="sub tilt reveal${shown}" href="${s.url}" ${s.sub ? 'target="_blank" rel="noopener"' : ''}>
    <div class="host">${s.sub ? `<b>${s.sub}</b>.` : ''}efrino.web.id</div>
    <h3 style="font-size:18px;margin-bottom:4px">${s.name}</h3>
    <p>${t(s)}</p>
    <div class="ping"><i></i>live</div>
  </a>`).join('');
  $('#chatMount').innerHTML = chatMarkup(lang);
  mountChat($('#chatMount'), lang);
}
applyStatic(lang);
renderContent(true);

$('#skillGrid').innerHTML = Object.entries(skills).map(([k, v]) => `
  <div class="skill-group tilt reveal"><h4>${k}</h4><div class="tags">${v.map(t => `<span>${t}</span>`).join('')}</div></div>`).join('');
const words = Object.values(skills).flat();
$('#marquee').innerHTML = [...words, ...words].map(w => `<span>${w}</span>`).join('');

$('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'id' : 'en'; applyStatic(lang); renderContent(false); });
$('#yr').textContent = new Date().getFullYear();

/* ---------- Scroll reveal + counters + nav highlight ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });

const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, to = +el.dataset.count, dec = String(to).includes('.') ? 2 : 0, t0 = performance.now();
  (function step(now) {
    const k = Math.min(1, (now - t0) / 1600), v = to * (1 - Math.pow(1 - k, 4));
    el.textContent = v.toFixed(dec) + (k === 1 ? el.dataset.suffix || '' : '');
    if (k < 1) requestAnimationFrame(step);
  })(t0);
  cio.unobserve(el);
}));
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];
const sio = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => sio.observe(s));

/* ---------- PPIC pipeline demo (16 steps) ---------- */
const STEPS = ['load part master', 'load MDFO forecast', 'load delivery orders', 'load stock', 'load calendar', 'load shift achievement', 'normalize units', 'merge sources', 'compute demand', 'stock rolling', 'capacity check', 'shift allocation', 'priority sort', 'delivery-miss alerts', 'persist plan', 'publish via SSE'];
const pipe = $('#pipeline'), pl = $('#pipelineLabel');
pipe.innerHTML = STEPS.map(() => '<span></span>').join('');
const bars = [...pipe.children];
new IntersectionObserver(async ([e], obs) => {
  if (!e.isIntersecting) return; obs.disconnect();
  for (;;) {
    for (let i = 0; i < STEPS.length; i++) {
      bars[i].classList.add('on');
      pl.textContent = `event: progress · step ${i + 1}/16 · ${STEPS[i]}`;
      await new Promise(r => setTimeout(r, 380));
    }
    pl.textContent = 'event: done · daily plan ready ✓';
    await new Promise(r => setTimeout(r, 2500));
    bars.forEach(b => b.classList.remove('on'));
  }
}, { threshold: 0.5 }).observe(pipe);

/* ---------- Tilt cards, magnetic buttons, cursor glow ---------- */
if (!reduced && matchMedia('(pointer: fine)').matches) {
  document.addEventListener('pointermove', e => {
    const card = e.target.closest('.tilt');
    document.querySelectorAll('.tilt[data-tilting]').forEach(c => { if (c !== card) { c.style.transform = ''; delete c.dataset.tilting; } });
    if (!card) return;
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.dataset.tilting = 1;
    card.style.transform = `rotateY(${(x - 0.5) * 12}deg) rotateX(${(0.5 - y) * 12}deg) translateZ(0)`;
    card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
  });
  document.querySelectorAll('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`; });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });
  const glow = $('.glow');
  addEventListener('pointermove', e => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });
} else { $('.glow').style.display = 'none'; }

console.log('%cHi recruiter 👋  Suka apa yang Anda lihat? efrinowep@gmail.com', 'font:600 14px sans-serif;color:#7c5cff');
