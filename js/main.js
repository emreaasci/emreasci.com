'use strict';

(function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(el, durationMs = 1400) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    let done = false;
    const tick = () => {
      if (done) return;
      const p = Math.min(1, (performance.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else done = true;
    };
    requestAnimationFrame(tick);
    // Kare çizilmeyen durumlarda (arka plan sekmesi) son değer yine de yazılır
    setTimeout(() => {
      done = true;
      el.textContent = target + suffix;
    }, durationMs + 100);
  }

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
  }

  function initCounters() {
    if (reducedMotion) return; // HTML'deki son değer olduğu gibi kalır
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.stat__num[data-count]').forEach((el) => {
      el.textContent = '0' + (el.dataset.suffix || '');
      io.observe(el);
    });
  }

  // Kesintisiz döngü için içerik bir kez çoğaltılır; animasyon -50%'ye kayar
  function initMarquee() {
    document.querySelectorAll('.marquee__track').forEach((track) => {
      [...track.children].forEach((li) => track.appendChild(li.cloneNode(true)));
    });
  }

  function initMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav');
    if (!toggle || !nav) return;
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initCounters();
    initMarquee();
    initMenu();
  });
})();
