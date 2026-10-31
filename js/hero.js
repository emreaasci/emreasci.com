'use strict';

(function (global) {
  const EDGE = 0.14; // imlecin bu kenar paylarında kafa en uca döner

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

  // Bakış atlası: her seviye (0 = en yukarı) düz satırın tüm sütunlarını içerir; seviyeler arası
  // ara pozlar build-gaze.py ile üretilir. Yatay ilerleme p ve dikey bakış v (-1 yukarı, 1 aşağı) → kare
  function gazeIndex(gaze, lut, p, v) {
    const col = Math.min(gaze.cols - 1, Math.max(0, Math.round(frameForProgress(lut, p))));
    const c = Math.min(1, Math.max(-1, v));
    const below = gaze.levels - 1 - gaze.mid;
    const level = c < 0 ? gaze.mid - Math.round(-c * gaze.mid) : gaze.mid + Math.round(c * below);
    return level * gaze.cols + col;
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

  global.Hero = { progressForX, frameForProgress, gazeIndex, quadMatrix };

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

  // Önce yalnız yatay düz satır yüklenir (hızlı açılış); bakış atlası arka planda gelince
  // onun yerine geçer ve dikey bakış da devreye girer.
  function initHead(hero) {
    const box = document.getElementById('hero-head');
    if (!box) return;

    fetch(box.dataset.rows)
      .then((r) => r.json())
      .then(({ fps, rows, gaze }) => {
        const lut = rows.mid.lut;
        const layer = (src, cls) => {
          const video = loadVideo(src);
          video.className = `hero__row ${cls}`;
          box.appendChild(video);
          const l = { video, ready: false };
          video.addEventListener('seeked', () => {
            if (!l.ready) { l.ready = true; video.classList.add('is-ready'); }
          });
          video.addEventListener('loadedmetadata', () => { video.currentTime = 0.5 * video.duration; });
          return l;
        };
        const mid = layer(rows.mid.src, 'hero__row--mid');
        const atlas = gaze ? layer(gaze.src, 'hero__row--gaze') : null;
        run(hero, box, { fps, lut, gaze, mid, atlas });
      })
      .catch(() => {});
  }

  function run(hero, box, { fps, lut, gaze, mid, atlas }) {
    let pointerX = 0.5, pointerV = 0, shownP = 0.5, shownV = 0;
    let lastMove = performance.now();

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const head = box.getBoundingClientRect();
      pointerX = (e.clientX - r.left) / r.width;
      // Kafanın merkezine göre dikey konum; bir kafa yüksekliği yukarı/aşağı tam bakış
      pointerV = (e.clientY - (head.top + head.height * 0.47)) / (head.height * 0.9);
      lastMove = performance.now();
    });

    const seek = (video, t) => {
      if (video.duration && !video.seeking && Math.abs(video.currentTime - t) > 1 / (fps * 2)) video.currentTime = t;
    };

    const tick = (now) => {
      const idle = now - lastMove > 3500;
      const targetP = idle ? 0.5 + Math.sin((now - lastMove) / 1600) * 0.32 : progressForX(pointerX);
      shownP += (targetP - shownP) * 0.14;
      shownV += ((idle ? 0 : pointerV) - shownV) * 0.12;

      if (atlas && atlas.ready) {
        // Kare ortasına atla; tam sınıra atlamak bazı tarayıcılarda bir önceki kareyi gösterir
        seek(atlas.video, (gazeIndex(gaze, lut, shownP, shownV) + 0.25) / fps);
      } else {
        seek(mid.video, Math.min(mid.video.duration - 1 / fps, frameForProgress(lut, shownP) / fps));
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
