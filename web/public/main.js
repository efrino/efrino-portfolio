import * as THREE from './vendor/three.module.min.js';
import { typedRoles, projects, subdomains, skills } from './data.js';
import { mountChat, chatMarkup } from './chat.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

/* ---------- 3D background: morphing core + orbiting particle rings ---------- */
function scene3d() {
  const canvas = $('#bg3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080d, 0.045);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Core: icosahedron whose vertices are displaced by noise in a shader.
  const coreMat = new THREE.ShaderMaterial({
    wireframe: true, transparent: true,
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(0x7c5cff) }, uB: { value: new THREE.Color(0x22d3ee) } },
    vertexShader: `
      uniform float uTime; varying float vD;
      vec3 hash(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453)*2.-1.; }
      float noise(vec3 p){ vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
        return mix(mix(mix(dot(hash(i),f),dot(hash(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                   mix(mix(dot(hash(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
      void main(){ float d=noise(normal*1.6+uTime*.35); vD=d; vec3 p=position+normal*d*.55;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform vec3 uA,uB; varying float vD; void main(){ gl_FragColor=vec4(mix(uA,uB,vD*.5+.5),.55); }`,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 12), coreMat);
  const group = new THREE.Group();
  group.add(core);

  // Inner glow sphere
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.08 })));

  // Rings of particles
  const rings = [];
  [[3.4, 0.4, 0x22d3ee], [4.3, -0.6, 0x7c5cff], [5.4, 1.1, 0xffffff]].forEach(([r, tilt, color], k) => {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rr = r + (Math.random() - 0.5) * 0.5;
      pos.set([Math.cos(a) * rr, (Math.random() - 0.5) * 0.15, Math.sin(a) * rr], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.03 + k * 0.006, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.rotation.x = Math.PI / 2 + tilt; pts.rotation.z = tilt;
    rings.push(pts); group.add(pts);
  });
  scene.add(group);

  // Deep starfield
  const sn = 2500, sp = new Float32Array(sn * 3);
  for (let i = 0; i < sn * 3; i++) sp[i] = (Math.random() - 0.5) * 60;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8b90a5, size: 0.04, transparent: true, opacity: 0.6 }));
  scene.add(stars);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    group.position.x = innerWidth > 900 ? 3.2 : 0;
  };
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  let visible = true;
  document.addEventListener('visibilitychange', () => visible = !document.hidden);
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime(), scroll = scrollY / innerHeight;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    coreMat.uniforms.uTime.value = reduced ? 0 : t;
    group.rotation.y = t * 0.08 + mouse.x * 0.8;
    group.rotation.x = mouse.y * 0.5 + scroll * 0.3;
    rings.forEach((r, i) => r.rotation.y = t * (0.05 + i * 0.03) * (i % 2 ? -1 : 1));
    // Scroll pushes the core back and fades it so content stays readable.
    group.position.z = -scroll * 3;
    coreMat.opacity = Math.max(0.12, 0.55 - scroll * 0.25);
    stars.rotation.y = t * 0.01; stars.position.y = scroll * 1.5;
    camera.position.x = mouse.x * 0.6; camera.position.y = -mouse.y * 0.6;
    camera.lookAt(0, 0, 0);
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
