'use strict';

// Masadaki telefonun arayüzü: tuvali ekranın köşelerine oturtur, uygulamaları açıp kapatır.
(function () {
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
      const x = tile.offsetLeft + icon.offsetLeft + tile.offsetWidth / 2;
      const y = tile.offsetTop + icon.offsetTop + tile.offsetHeight / 2 + icon.offsetParent.offsetTop;
      return `${x}px ${y}px`;
    };

    function openApp(id) {
      const app = screenOf(id);
      if (!app) return;
      if (current && current !== app) current.hidden = true;
      app.hidden = false;
      current = app;
      const body = app.querySelector('.app__body, .app__page.is-active');
      if (body) body.scrollTop = 0;
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
      if (e.target.closest('[data-close-app]')) return closeApp();
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const app = tab.closest('.app');
        app.querySelectorAll('[data-tab]').forEach((b) => {
          const on = b === tab;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', String(on));
        });
        app.querySelectorAll('.app__page').forEach((p) => p.classList.toggle('is-active', p.dataset.page === tab.dataset.tab));
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeApp(); });

    // Menüdeki linkler masaya kaydırır ve ilgili uygulamayı açar
    document.querySelectorAll('[data-open-app]').forEach((link) => {
      link.addEventListener('click', () => setTimeout(() => openApp(link.dataset.openApp), reducedMotion ? 0 : 600));
    });

    window.PhoneUI = { openApp, closeApp };
  });
})();
