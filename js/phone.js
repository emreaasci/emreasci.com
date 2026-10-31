'use strict';

(function (global) {
  const SWITCH_MS = 600;
  const reducedMotion = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showScreen(phoneEl, slug) {
    const target = phoneEl.querySelector(`.phone__screen[data-screen="${slug}"]`);
    if (!target || target.classList.contains('is-active')) return;
    phoneEl.querySelectorAll('.phone__screen.is-leaving').forEach((el) => el.classList.remove('is-leaving'));
    const current = phoneEl.querySelector('.phone__screen.is-active');
    if (current) {
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      setTimeout(() => current.classList.remove('is-leaving'), SWITCH_MS);
    }
    target.classList.add('is-active');
  }

  function startCycle(phoneEl, slugs, intervalMs = 2800) {
    let i = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % slugs.length;
      showScreen(phoneEl, slugs[i]);
    }, intervalMs);
    return () => clearInterval(id);
  }

  function enableTilt(phoneEl, maxDeg = 8) {
    if (reducedMotion() || !global.matchMedia('(pointer: fine)').matches) return;
    const area = phoneEl.closest('section') || document.body;
    let frame = 0;
    area.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = phoneEl.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height)));
        phoneEl.style.transform = `rotateY(${(x * maxDeg).toFixed(2)}deg) rotateX(${(-y * maxDeg).toFixed(2)}deg)`;
      });
    });
    area.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      phoneEl.style.transform = '';
    });
  }

  function syncWithProjects(phoneEl, projectEls) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        projectEls.forEach((el) => el.classList.toggle('is-current', el === entry.target));
        showScreen(phoneEl, entry.target.dataset.project);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    projectEls.forEach((el) => io.observe(el));
  }

  // Ekranların tek kaynağı #projects-phone; hero ve mobil kartlar buradan kopyalanır
  function cloneScreen(sourcePhone, slug, active) {
    const screen = sourcePhone.querySelector(`.phone__screen[data-screen="${slug}"]`).cloneNode(true);
    screen.classList.toggle('is-active', active);
    return screen;
  }

  function buildMiniPhone(sourcePhone, slug) {
    const wrap = document.createElement('div');
    wrap.className = 'project__mini';
    wrap.setAttribute('aria-hidden', 'true');
    const phone = document.createElement('div');
    phone.className = 'phone';
    phone.innerHTML = '<div class="phone__notch"></div><div class="phone__screens"></div>';
    phone.lastChild.appendChild(cloneScreen(sourcePhone, slug, true));
    wrap.appendChild(phone);
    return wrap;
  }

  global.Phone = { showScreen, startCycle, enableTilt, syncWithProjects };

  document.addEventListener('DOMContentLoaded', () => {
    const source = document.getElementById('projects-phone');
    const hero = document.getElementById('hero-phone');
    if (!source) return;

    if (hero) {
      const heroSlugs = ['intime-ik', 'adilpazar', 'nikachat'];
      const screens = hero.querySelector('.phone__screens');
      screens.replaceChildren(...heroSlugs.map((slug, i) => cloneScreen(source, slug, i === 0)));
      if (!reducedMotion()) startCycle(hero, heroSlugs);
      enableTilt(hero);
    }

    const projects = [...document.querySelectorAll('.project[data-project]')];
    projects.forEach((el) => {
      el.querySelector('.project__meta').after(buildMiniPhone(source, el.dataset.project));
    });
    syncWithProjects(source, projects);
  });
})(window);
