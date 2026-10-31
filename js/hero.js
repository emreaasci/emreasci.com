'use strict';

(function (global) {
  const EDGE = 0.14; // imlecin bu kenar paylarında kafa en uca döner
  const ROW_ORDER = ['mid', 'up', 'down']; // mid alt katman, diğerleri üstüne karışır

  // İmlecin yatay konumu (0..1) → dönüş ilerlemesi (0 = sola, 1 = sağa)
  function progressForX(x) {
    return Math.min(1, Math.max(0, (x - EDGE) / (1 - 2 * EDGE)));
  }

  // lut[i] = i. karenin dönüş ilerlemesi (monoton). İlerleme → kesirli kare
  function frameForProgress(lut, p) {
    let i = 0;
    while (i < lut.length && lut[i] < p) i++;
    if (i === 0) return 0;
    if (i >= lut.length) return lut.length - 1;
    const span = lut[i] - lut[i - 1];
    return i - 1 + (span > 0 ? (p - lut[i - 1]) / span : 0);
  }

  // Dikey bakış v (-1 yukarı, 0 düz, 1 aşağı) → satır opaklıkları
  function rowWeights(v) {
    const c = Math.min(1, Math.max(-1, v));
    return { up: Math.max(0, -c), mid: 1 - Math.abs(c), down: Math.max(0, c) };
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

  global.Hero = { progressForX, frameForProgress, rowWeights, quadMatrix };

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

    fetch(box.dataset.rows)
      .then((r) => r.json())
      .then(({ fps, rows }) => {
        const layers = ROW_ORDER.filter((name) => rows[name]).map((name) => {
          const video = loadVideo(rows[name].src);
          video.className = `hero__row hero__row--${name}`;
          box.appendChild(video);
          const layer = { name, video, lut: rows[name].lut, ready: false, opacity: name === 'mid' ? 1 : 0 };
          video.addEventListener('seeked', () => {
            if (!layer.ready) { layer.ready = true; video.classList.add('is-ready'); }
          });
          video.addEventListener('loadedmetadata', () => { video.currentTime = 0.5 * video.duration; });
          return layer;
        });
        run(hero, box, layers, fps);
      })
      .catch(() => {});
  }

  function run(hero, box, layers, fps) {
    let pointerX = 0.5, pointerV = 0;
    let shownP = 0.5, shownV = 0;
    let lastMove = performance.now();

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const head = box.getBoundingClientRect();
      pointerX = (e.clientX - r.left) / r.width;
      // Kafanın merkezine göre dikey konum; bir kafa yüksekliği yukarı/aşağı tam bakış
      pointerV = (e.clientY - (head.top + head.height * 0.47)) / (head.height * 0.9);
      lastMove = performance.now();
    });

    const tick = (now) => {
      const idle = now - lastMove > 3500;
      const targetP = idle ? 0.5 + Math.sin((now - lastMove) / 1600) * 0.32 : progressForX(pointerX);
      const targetV = idle ? 0 : pointerV;
      shownP += (targetP - shownP) * 0.14;
      shownV += (targetV - shownV) * 0.1;
      const weights = rowWeights(shownV);

      for (const layer of layers) {
        const { video, lut } = layer;
        if (layer.name !== 'mid') {
          layer.opacity = weights[layer.name];
          video.style.opacity = layer.ready ? layer.opacity.toFixed(3) : '0';
          if (layer.opacity < 0.01) continue; // görünmeyen satırı boşuna çözme
        }
        if (!video.duration) continue;
        const t = Math.min(video.duration - 1 / fps, frameForProgress(lut, shownP) / fps);
        if (!video.seeking && Math.abs(video.currentTime - t) > 1 / (fps * 2)) video.currentTime = t;
      }
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
