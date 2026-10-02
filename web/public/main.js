import * as THREE from './vendor/three.module.min.js';
import { typedRoles, projects, subdomains, skills } from './data.js';
import { mountChat, chatMarkup } from './chat.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

/* ---------- 3D background: particles that morph into a shape per section ---------- */
const N = 12000;

// Each generator fills N points (x, y, z) roughly within a radius of ~3.
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const SHAPES = {
  galaxy(i) {
    const arm = i % 3, r = Math.pow(Math.random(), 0.7) * 3.4, a = arm * (Math.PI * 2 / 3) + r * 1.15;
    const s = 0.35 * (1 - r / 5);
    return [Math.cos(a) * r + rnd(s), rnd(0.12 + s * 0.4), Math.sin(a) * r + rnd(s)];
  },
  gear(i) {
    const teeth = 14, z = rnd(0.35);
    if (i % 5 === 0) { const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 0.25; return [Math.cos(a) * r, Math.sin(a) * r, z]; }
    const a = Math.random() * Math.PI * 2;
    const tooth = (Math.floor(a / (Math.PI * 2) * teeth * 2) % 2) === 0;
    const outer = tooth ? 3.0 : 2.55, r = 1.9 + Math.random() * (outer - 1.9);
    return [Math.cos(a) * r, Math.sin(a) * r, z];
  },
  phone(i) {
    const w = 1.55, h = 3.1, z = rnd(0.12);
    const k = i % 4;
    if (k === 0) { // rounded outline
      const t = Math.random() * 2 * (w + h) * 2, per = 2 * (w + h);
      let x, y; const u = (t % per);
      if (u < 2 * w) { x = -w + u; y = h; } else if (u < 2 * w + 2 * h) { x = w; y = h - (u - 2 * w); }
      else if (u < 4 * w + 2 * h) { x = w - (u - 2 * w - 2 * h); y = -h; } else { x = -w; y = -h + (u - 4 * w - 2 * h); }
      return [x + rnd(0.03), y + rnd(0.03), z];
    }
    if (k === 1) { const r = Math.random() * 0.22, a = Math.random() * 6.283; return [Math.cos(a) * r, -h + 0.45 + Math.sin(a) * r, z]; }
    // screen content: rows of "cards"
    const row = Math.floor(Math.random() * 6), y = h - 0.55 - row * 0.85 - Math.random() * 0.5;
    return [rnd(w - 0.3), y, z];
  },
  brain(i) {
    // Neural net: nodes on a noisy sphere plus links between neighbours.
    const layers = 5, perLayer = 8, L = i % layers, n = Math.floor(i / layers) % perLayer;
    const node = (l, m) => [(l - 2) * 1.6, ((m + 0.5) / perLayer - 0.5) * 2.8 * (1 - Math.abs(l - 2) * 0.15), Math.sin(l * 1.7 + m) * 0.4];
    if (i % 2 === 0) { const p = node(L, n), r = 0.09 * Math.cbrt(Math.random()), a = Math.random() * 6.283, b = Math.acos(rnd(1));
      return [p[0] + r * Math.sin(b) * Math.cos(a), p[1] + r * Math.sin(b) * Math.sin(a), p[2] + r * Math.cos(b)]; }
    if (L === layers - 1) { const p = node(L, n); return [p[0] + rnd(0.09), p[1] + rnd(0.09), p[2] + rnd(0.09)]; }
    const a = node(L, n), b = node(L + 1, Math.floor(Math.random() * perLayer)), t = Math.random();
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  },
  globe(i) {
    if (i % 4 === 0) { const a = Math.random() * 6.283, r = 3.4 + rnd(0.05), tilt = (i % 8 === 0) ? 0.5 : -0.4;
      return [Math.cos(a) * r, Math.sin(a) * r * Math.sin(tilt), Math.sin(a) * r * Math.cos(tilt)]; }
    // latitude / longitude lines
    const lines = 12, onLat = i % 2, k = Math.floor(Math.random() * lines), t = Math.random() * 6.283, R = 2.3;
    if (onLat) { const phi = ((k + 0.5) / lines) * Math.PI; return [Math.sin(phi) * Math.cos(t) * R, Math.cos(phi) * R, Math.sin(phi) * Math.sin(t) * R]; }
    const th = (k / lines) * Math.PI; return [Math.sin(t) * Math.cos(th) * R, Math.cos(t) * R, Math.sin(t) * Math.sin(th) * R];
  },
  helix(i) {
    // DNA double helix: two strands plus base-pair rungs.
    const t = Math.random(), y = (t - 0.5) * 6.5, a = t * Math.PI * 6, R = 1.3;
    if (i % 3 === 2) { const u = Math.round(t * 40) / 40, yy = (u - 0.5) * 6.5, aa = u * Math.PI * 6, k = rnd(1);
      return [Math.cos(aa) * R * k, yy + rnd(0.02), Math.sin(aa) * R * k]; }
    const s = i % 3 ? Math.PI : 0;
    return [Math.cos(a + s) * R + rnd(0.08), y + rnd(0.08), Math.sin(a + s) * R + rnd(0.08)];
  },
  portal(i) {
    // Thick ring with a swirl of particles flowing inward.
    if (i % 4 === 0) { const a = Math.random() * 6.283, r = Math.random() * 4.6; return [Math.cos(a + r) * r, Math.sin(a + r) * r * 0.62, rnd(0.3) - 1.5]; }
    const a = Math.random() * 6.283, tube = Math.random() * 6.283, tr = 0.25 * Math.sqrt(Math.random());
    const R = 5.2 + Math.cos(tube) * tr;
    return [Math.cos(a) * R, Math.sin(a) * R * 0.62, Math.sin(tube) * tr - 1.5];
  },
  cubes(i) {
    const g = 4, c = i % (g * g * g), cx = c % g, cy = Math.floor(c / g) % g, cz = Math.floor(c / g / g);
    const s = 0.28, e = Math.floor(Math.random() * 12), t = rnd(s);
    const edges = [[t, s, s], [t, -s, s], [t, s, -s], [t, -s, -s], [s, t, s], [-s, t, s], [s, t, -s], [-s, t, -s], [s, s, t], [-s, s, t], [s, -s, t], [-s, -s, t]];
    const p = edges[e];
    return [(cx - 1.5) * 1.1 + p[0], (cy - 1.5) * 1.1 + p[1], (cz - 1.5) * 1.1 + p[2]];
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
    projects: scale(fromGen(SHAPES.phone), 0.72),
    ai: scale(fromGen(SHAPES.brain), 0.58),
    eco: fromGen(SHAPES.globe),
    skills: fromGen(SHAPES.cubes),
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
  for (let i = 0; i < dn * 3; i++) dp[i] = rnd(25);
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
    const flat = ['work', 'projects', 'ai', 'contact'].includes(current);
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

/* ---------- Render projects / ecosystem / skills ---------- */
const cats = ['All', ...new Set(projects.map(p => p.cat))];
$('#filters').innerHTML = cats.map((c, i) => `<button class="${i ? '' : 'active'}" data-c="${c}">${c}</button>`).join('');
$('#projectGrid').innerHTML = projects.map(p => `
  <article class="project tilt reveal" data-c="${p.cat}">
    ${p.private ? '<span class="badge-private">internal</span>' : ''}
    <div class="icon">${p.icon}</div>
    <h3>${p.title}</h3>
    <p>${p.desc}</p>
    <div class="tags">${p.tags.map(t => `<span>${t}</span>`).join('')}</div>
    ${p.repoUrl || p.live ? `<div class="links">${p.repoUrl ? `<a href="${p.repoUrl}" target="_blank" rel="noopener">code ↗</a>` : ''}${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">live ↗</a>` : ''}</div>` : ''}
  </article>`).join('');
$('#filters').addEventListener('click', e => {
  const c = e.target.dataset.c; if (!c) return;
  document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('active', b === e.target));
  document.querySelectorAll('.project').forEach(p => p.classList.toggle('hidden', c !== 'All' && p.dataset.c !== c));
});

$('#eco').innerHTML = subdomains.map(s => `
  <a class="sub tilt reveal" href="${s.url}" ${s.sub ? 'target="_blank" rel="noopener"' : ''}>
    <div class="host">${s.sub ? `<b>${s.sub}</b>.` : ''}efrino.web.id</div>
    <h3 style="font-size:18px;margin-bottom:4px">${s.name}</h3>
    <p>${s.desc}</p>
    <div class="ping"><i></i>live</div>
  </a>`).join('');

$('#skillGrid').innerHTML = Object.entries(skills).map(([k, v]) => `
  <div class="skill-group tilt reveal"><h4>${k}</h4><div class="tags">${v.map(t => `<span>${t}</span>`).join('')}</div></div>`).join('');
const words = Object.values(skills).flat();
$('#marquee').innerHTML = [...words, ...words].map(w => `<span>${w}</span>`).join('');

$('#chatMount').innerHTML = chatMarkup;
mountChat($('#chatMount'));
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
