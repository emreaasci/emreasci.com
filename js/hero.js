'use strict';

(function (global) {
  // Bakış döngüsü: kafa önden başlayıp sol → yukarı → sağ → aşağı yuvarlanır ve öne döner.
  // anchors: [açı (derece; 0 sağ, 90 yukarı, 180 sol, -90 aşağı), kare], açı azalan sırada.
  function angleToFrame(anchors, deg) {
    const a = deg <= -180 ? 180 : deg;
    if (a >= anchors[0][0]) return anchors[0][1];
    for (let i = 1; i < anchors.length; i++) {
      const [a0, f0] = anchors[i - 1], [a1, f1] = anchors[i];
      if (a >= a1) return f0 + ((a0 - a) / (a0 - a1)) * (f1 - f0);
    }
    // Son çapa ile -180 arası boşluk: hangisine yakınsa o
    const last = anchors[anchors.length - 1];
    return a - -180 < last[0] - a ? anchors[0][1] : last[1];
  }

  // f'den g'ye döngü üzerinde (n kare) en kısa yönden k oranında ilerle
  function loopStep(f, g, n, k) {
    const d = ((((g - f) % n) + n + n / 2) % n) - n / 2;
    return (((f + d * k) % n) + n) % n;
  }

  // w×h dikdörtgeni verilen dörtgene eşleyen CSS matrix3d (Heckbert kareden dörtgene dönüşümü)
  function quadMatrix(w, h, quad) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den;
    const k = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3;
    const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
    return [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  }

  global.Hero = { angleToFrame, loopStep, quadMatrix };

  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = global.matchMedia('(pointer: fine)').matches;

    if (!reducedMotion) {
      initHead(hero);
      entrance(hero);
    }
    if (finePointer) initCursor(hero, reducedMotion);
  });

  // Klip blob olarak alınır; böylece her atlama ağ beklemeden anında olur.
  // Safari preload="none" ile blob kaynağı askıya alır, bu yüzden "auto" şart.
  function loadVideo(src) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    fetch(src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((blob) => { video.src = URL.createObjectURL(blob); })
      .catch(() => { video.src = src; });
    return video;
  }

  function initHead(hero) {
    const box = document.getElementById('hero-head');
    if (!box) return;

    fetch(box.dataset.look)
      .then((r) => r.json())
      .then((look) => {
        const video = loadVideo(look.src);
        video.className = 'hero__row hero__row--mid';
        box.appendChild(video);
        video.addEventListener('seeked', () => video.classList.add('is-ready'), { once: true });
        video.addEventListener('loadedmetadata', () => { video.currentTime = 0.25 / look.fps; });
        run(hero, box, video, look);
      })
      .catch(() => {});
  }

  function run(hero, box, video, { fps, frames, front, anchors }) {
    let target = front, shown = front;
    let lastMove = performance.now();

    hero.addEventListener('pointermove', (e) => {
      const head = box.getBoundingClientRect();
      const dx = e.clientX - (head.left + head.width / 2);
      const dy = (head.top + head.height * 0.42) - e.clientY; // yukarı pozitif; yüzün ortası
      // Fare yüzün üstündeyse kameraya bakar; dışındaysa fareye doğru döner
      target = Math.hypot(dx, dy) < head.height * 0.3
        ? front
        : angleToFrame(anchors, (Math.atan2(dy, dx) * 180) / Math.PI);
      lastMove = performance.now();
    });

    const tick = (now) => {
      // Boşta: üst yarıda yavaşça sağa sola bakınır
      const goal = now - lastMove > 3500
        ? angleToFrame(anchors, 90 + Math.sin((now - lastMove) / 1800) * 80)
        : target;
      shown = loopStep(shown, goal, frames, 0.12);
      const t = (Math.round(shown) % frames + 0.25) / fps;
      if (video.duration && !video.seeking && Math.abs(video.currentTime - t) > 1 / (fps * 2)) video.currentTime = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initCursor(hero, reducedMotion) {
    const dot = hero.querySelector('.cursor__dot');
    const ring = hero.querySelector('.cursor__ring');
    if (!dot || !ring) return;
    hero.classList.add('has-cursor');
    let x = -100, y = -100, rx = -100, ry = -100;
    hero.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
    });
    hero.addEventListener('pointerleave', () => { x = y = -100; });
    const follow = () => {
      const k = reducedMotion ? 1 : 0.55;
      rx += (x - rx) * k; ry += (y - ry) * k;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  function entrance(hero) {
    const q = (s) => hero.querySelector(s);
    const items = [
      [q('.hero__brand'), [{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'none' }], 0],
      [q('.hero__actions'), [{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'none' }], 80],
      [q('.hero__eyebrow'), [{ opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.46em' }], 300],
      [q('.hero__title'), [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(24px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], 520],
      [q('.hero__caption--left'), [{ opacity: 0 }, { opacity: 1 }], 1100],
      [q('.hero__caption--right'), [{ opacity: 0 }, { opacity: 1 }], 1150],
      [q('.hero__scroll'), [{ opacity: 0 }, { opacity: 0.8 }], 1300],
    ];
    for (const [el, frames, delay] of items) {
      if (el) el.animate(frames, { duration: 700, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    }
  }
})(window);
