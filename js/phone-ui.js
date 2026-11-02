'use strict';

// Masadaki telefonun arayüzü: tuvali ekranın köşelerine oturtur, kilit ekranını yukarı kaydırarak
// açtırır, uygulamaları açıp kapatır.
(function (global) {
  const LOCALE = { tr: 'tr-TR', en: 'en-US' };

  function formatLockDate(date, lang) {
    return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.tr, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  function formatClock(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  // dy: sürükleme mesafesi (yukarı negatif, tuval px), velocity: px/ms, height: tuval yüksekliği
  function shouldUnlock(dy, velocity, height) {
    return dy < 0 && (-dy > height / 3 || velocity < -0.5);
  }

  global.PhoneLock = { formatLockDate, formatClock, shouldUnlock };
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', () => {
    const screen = document.getElementById('desk-screen');
    const ui = document.getElementById('phone-ui');
    if (!screen || !ui || !window.Hero) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // data-quad: kaynak görseldeki ekran köşeleri (sol üst, sağ üst, sağ alt, sol alt)
    const quadSrc = screen.dataset.quad.split(' ').map((p) => p.split(',').map(Number));
    const srcWidth = Number(screen.dataset.srcWidth);
    const place = () => {
      const scale = screen.offsetWidth / srcWidth;
      const quad = quadSrc.map(([x, y]) => [x * scale, y * scale]);
      const m = window.Hero.quadMatrix(ui.offsetWidth, ui.offsetHeight, quad);
      ui.style.transform = `matrix3d(${m.map((n) => +n.toFixed(8)).join(',')})`;
    };
    place();
    window.addEventListener('resize', place);

    let current = null;
    const iconOf = (id) => ui.querySelector(`.app-icon[data-app="${id}"]`);
    const screenOf = (id) => ui.querySelector(`.app[data-app-screen="${id}"]`);

    // Uygulama, ikonunun bulunduğu yerden büyüyerek açılır (iOS gibi)
    const originFor = (id) => {
      const icon = iconOf(id);
      if (!icon) return '50% 50%';
      const tile = icon.querySelector('.app-icon__tile');
      // Telefonun kendisi dönüşümlü; ekran koordinatı yerine telefona kadar üst kapların konumları toplanır
      let x = tile.offsetWidth / 2, y = tile.offsetHeight / 2;
      let el = tile;
      while (el && el !== ui) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return `${x}px ${y}px`;
    };

    function openApp(id) {
      const app = screenOf(id);
      if (!app) return;
      if (current && current !== app) current.hidden = true;
      app.hidden = false;
      current = app;
      const body = app.querySelector('.app__body');
      if (body) body.scrollTop = 0;
      ui.classList.add('has-app');
      if (!reducedMotion) {
        app.style.transformOrigin = originFor(id);
        app.animate(
          [{ transform: 'scale(.18)', opacity: 0, borderRadius: '30px' }, { transform: 'none', opacity: 1, borderRadius: '0' }],
          { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
      }
      app.querySelector('.app__back').focus({ preventScroll: true });
    }

    function closeApp() {
      if (!current) return;
      const app = current;
      const id = app.dataset.appScreen;
      current = null;
      ui.classList.remove('has-app');
      const done = () => { app.hidden = true; iconOf(id)?.focus({ preventScroll: true }); };
      if (reducedMotion) return done();
      app.style.transformOrigin = originFor(id);
      app.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'scale(.18)', opacity: 0 }],
        { duration: 260, easing: 'cubic-bezier(.4,0,.6,1)' },
      ).onfinish = done;
    }

    ui.addEventListener('click', (e) => {
      const icon = e.target.closest('.app-icon');
      if (icon) return openApp(icon.dataset.app);
      if (e.target.closest('[data-close-app]')) closeApp();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeApp(); });

    // iOS gibi: alttaki ev çubuğuna dokunmak ya da yukarı kaydırmak uygulamayı kapatır
    const homebar = ui.querySelector('.phone-ui__homebar');
    if (homebar) {
      let barY = null;
      homebar.addEventListener('click', closeApp);
      homebar.addEventListener('pointerdown', (e) => { barY = e.clientY; });
      homebar.addEventListener('pointerup', (e) => { if (barY !== null && barY - e.clientY > 10) closeApp(); barY = null; });
    }

    // Menüdeki linkler masaya kaydırır ve ilgili uygulamayı açar
    document.querySelectorAll('[data-open-app]').forEach((link) => {
      link.addEventListener('click', () => {
        const started = performance.now();
        const wait = () => {
          if ((window.Story && window.Story.interactive) || performance.now() - started > 4000) { unlock(); openApp(link.dataset.openApp); }
          else setTimeout(wait, 100);
        };
        wait();
      });
    });

    // Kilit ekranı: canlı saat ve tarih, yukarı sürükleyerek açma, uzaklaşınca tekrar kilitlenme
    const lock = document.getElementById('lock-screen');
    const home = ui.querySelector('.home');
    const clocks = ui.querySelectorAll('.lock__time, .phone-ui__clock');
    const dateEl = lock && lock.querySelector('.lock__date');
    let locked = true;

    const tickClock = () => {
      const now = new Date();
      clocks.forEach((el) => { el.textContent = formatClock(now); });
      if (dateEl) dateEl.textContent = formatLockDate(now, document.documentElement.lang);
    };
    tickClock();
    setInterval(tickClock, 15000);
    new MutationObserver(tickClock).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    const setDrag = (dy) => {
      // tuval biriminde; yukarı sürükledikçe ana ekran arkadan yaklaşır
      const t = Math.min(1, -dy / ui.offsetHeight);
      lock.style.transform = `translateY(${Math.min(0, dy)}px)`;
      lock.style.opacity = String(1 - t * 0.6);
      home.style.transform = `scale(${0.92 + 0.08 * t})`;
      home.style.opacity = String(0.4 + 0.6 * t);
    };

    function unlock() {
      if (!locked) return;
      locked = false;
      const from = lock.style.transform || 'translateY(0)';
      const duration = reducedMotion ? 0 : 380;
      lock.animate([{ transform: from }, { transform: 'translateY(-100%)' }], { duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
        .onfinish = () => { lock.hidden = true; };
      home.animate([{ transform: home.style.transform || 'scale(.92)', opacity: home.style.opacity || 0.4 }, { transform: 'scale(1)', opacity: 1 }],
        { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
      home.style.transform = '';
      home.style.opacity = '';
      ui.classList.add('is-unlocked');
    }

    function relock() {
      if (locked) return;
      locked = true;
      closeApp();
      lock.getAnimations().forEach((a) => a.cancel());
      lock.hidden = false;
      lock.style.transform = '';
      lock.style.opacity = '';
      home.style.transform = 'scale(.92)';
      home.style.opacity = '0.4';
      ui.classList.remove('is-unlocked');
    }

    if (lock) {
      home.style.transform = 'scale(.92)';
      home.style.opacity = '0.4';
      let start = null;
      lock.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.lock__unlock')) return;
        const scale = ui.getBoundingClientRect().height / ui.offsetHeight; // ekran px → tuval px
        start = { y: e.clientY, t: performance.now(), scale, lastY: e.clientY, lastT: performance.now(), v: 0 };
        lock.setPointerCapture(e.pointerId);
        lock.getAnimations().forEach((a) => a.cancel());
      });
      lock.addEventListener('pointermove', (e) => {
        if (!start) return;
        const now = performance.now();
        start.v = ((e.clientY - start.lastY) / start.scale) / Math.max(1, now - start.lastT);
        start.lastY = e.clientY; start.lastT = now;
        setDrag((e.clientY - start.y) / start.scale);
      });
      const end = (e) => {
        if (!start) return;
        const dy = (e.clientY - start.y) / start.scale;
        const v = start.v;
        start = null;
        if (shouldUnlock(dy, v, ui.offsetHeight)) return unlock();
        // geri yaylan
        const from = lock.style.transform || 'translateY(0)';
        lock.animate([{ transform: from }, { transform: 'translateY(0)' }], { duration: reducedMotion ? 0 : 260, easing: 'cubic-bezier(.3,1.4,.5,1)' });
        setDrag(0);
      };
      lock.addEventListener('pointerup', end);
      lock.addEventListener('pointercancel', end);
      lock.querySelector('.lock__unlock').addEventListener('click', unlock);
    }

    window.PhoneUI = { openApp, closeApp, unlock, relock, isLocked: () => locked };
  });
})(window);
