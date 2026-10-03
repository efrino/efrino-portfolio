// Scroll-driven frame sequence: the stage is sticky; scroll progress through .story picks the frame.
(() => {
  const N = 110, mobile = matchMedia('(max-width: 860px)').matches, dir = mobile ? 'm' : 'f';
  const src = i => `${dir}/${String(i + 1).padStart(3, '0')}.webp`;
  const story = document.getElementById('story'), cv = document.getElementById('cv'), bg = document.getElementById('bg');
  const ctx = cv.getContext('2d'), bctx = bg.getContext('2d');
  const beats = [...document.querySelectorAll('.beat')], bar = document.getElementById('bar');
  const imgs = new Array(N); let loaded = 0, target = 0, current = 0;

  // Load the first frame immediately, then the rest in order (evenly spaced first so scrubbing works early).
  const order = [0, ...Array.from({ length: N - 1 }, (_, i) => i + 1).sort((a, b) => (a % 8) - (b % 8) || a - b)];
  const load = i => new Promise(r => { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => { imgs[i] = im.naturalWidth ? im : null; loaded++; progress(); r(); }; im.src = src(i); });
  const progress = () => { const l = document.getElementById('loader'); document.getElementById('ld').textContent = `${Math.round(loaded / N * 100)}%`; if (loaded >= N) l.classList.add('done'); };
  (async () => { await load(0); draw(0); for (let k = 1; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).map(load)); })();

  // Nearest frame that has arrived (so early scrolling still shows something sensible).
  const nearest = i => { for (let d = 0; d < N; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; } return null; };
  function cover(c, im) { // draw like object-fit: cover
    const w = c.width, h = c.height, s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    return [(w - dw) / 2, (h - dh) / 2, dw, dh];
  }
  function draw(i) {
    const im = nearest(i); if (!im) return;
    ctx.drawImage(im, ...cover(cv, im));
    if (!mobile) bctx.drawImage(im, ...cover(bg, im));
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    bg.width = 160; bg.height = Math.round(160 * innerHeight / innerWidth); // tiny: it is blurred anyway
    draw(Math.round(current));
  }
  addEventListener('resize', size); size();

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function onScroll() {
    const r = story.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    target = p * (N - 1);
    bar.style.width = `${p * 100}%`;
    // Each text beat fades/slides in and out over its own scroll window.
    for (const b of beats) {
      const a = +b.dataset.in, z = +b.dataset.out, fade = 0.05;
      const o = p < a || p > z ? 0 : Math.min(1, a === 0 ? 1 : (p - a) / fade, (z - p) / fade);
      const y = (1 - o) * (p < (a + z) / 2 ? 24 : -24);
      b.style.opacity = o.toFixed(3);
      b.style.transform = mobile ? `translateY(${y}px)` : `translateY(calc(-50% + ${y}px))`;
    }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Ease towards the target frame for buttery motion even with coarse scroll steps.
  (function tick() {
    const next = current + (target - current) * 0.18;
    if (Math.abs(next - current) > 0.01) { current = next; draw(Math.round(current)); }
    requestAnimationFrame(tick);
  })();
})();
