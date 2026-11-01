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

  // f'den g'ye döngü üzerinde (n kare) en kısa yönden k oranında, en fazla maxStep kare ilerle
  function loopStep(f, g, n, k, maxStep = Infinity) {
    const d = ((((g - f) % n) + n + n / 2) % n) - n / 2;
    const step = Math.max(-maxStep, Math.min(maxStep, d * k));
    return (((f + step) % n) + n) % n;
  }

  // Kaydırma hikâyesi: p = sabit sahnenin kaydırılan oranı (0..1). Her katmanın 0..1 durumu.
  // Kamera videosu yoksa masa karesi açılış karesinin üstüne çapraz geçişle gelir.
  const ramp = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = (t) => t * t * (3 - 2 * t);
  function storyState(p, hasVideo) {
    return {
      copy: 1 - ramp(p, 0, 0.08),
      head: 1 - ramp(p, 0.01, 0.05),
      camera: hasVideo ? ramp(p, 0.04, 0.72) : 0,
      desk: hasVideo ? ramp(p, 0.7, 0.74) : ramp(p, 0.08, 0.6),
      zoom: ease(ramp(p, 0.74, 0.95)),
      phone: ramp(p, 0.86, 0.96),
      interactive: p >= 0.95,
    };
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

  global.Hero = { angleToFrame, loopStep, storyState, quadMatrix };

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
    initStory(hero, reducedMotion);
    if (finePointer) initCursor(hero, reducedMotion);
  });

  // Kafa ve kamera kareleri tek dosyada paketlenmiş WebP olarak gelir, resim olarak çözülüp canvas'a
  // çizilir. Video kullanılmaz: Safari duraklatılmış videoda kare atlamayı askıya alıp (özellikle
  // sekmeye/uygulamaya geri dönünce) animasyonu donduruyordu.
  function loadFrames(url) {
    // Meta dosyası küçük; her açılışta doğrulanır ki önbellekte kalan eski sürüm olmayan dosyayı istemesin
    return fetch(url, { cache: 'no-cache' })
      .then((r) => r.json())
      .then((meta) => fetch(meta.src)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((buf) => {
          let at = 0;
          const images = meta.sizes.map((size) => {
            const img = new Image();
            img.src = URL.createObjectURL(new Blob([buf.slice(at, at + size)], { type: 'image/webp' }));
            at += size;
            return img;
          });
          return { meta, images };
        }));
  }

  // i. kareyi canvas'a çizen fonksiyon döndürür; kare henüz çözülmediyse bir öncekinde kalır
  function frameDrawer(canvas, images, onFirst) {
    const ctx = canvas.getContext('2d');
    let drawn = -1;
    return (i) => {
      const img = images[i];
      if (i === drawn || !img.complete || !img.naturalWidth) return;
      if (drawn < 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        if (onFirst) onFirst();
      }
      ctx.drawImage(img, 0, 0);
      drawn = i;
    };
  }

  function initHead(hero) {
    const box = document.getElementById('hero-head');
    if (!box) return;

    loadFrames(box.dataset.look)
      .then(({ meta, images }) => {
        const canvas = document.createElement('canvas');
        canvas.className = 'hero__row hero__row--mid';
        box.appendChild(canvas);
        run(hero, box, frameDrawer(canvas, images, () => canvas.classList.add('is-ready')), meta);
      })
      .catch(() => {});
  }

  function run(hero, box, draw, { frames, front, anchors }) {
    let target = front, shown = front, response = 1;
    let lastMove = performance.now(), enteredFace = 0;
    let pointerInside = false; // fare sahnedeyken (dursa bile) kafa kendi kendine bakınmaz

    hero.addEventListener('pointermove', (e) => {
      const now = performance.now();
      const head = box.getBoundingClientRect();
      const dx = e.clientX - (head.left + head.width / 2);
      const dy = (head.top + head.height * 0.42) - e.clientY; // yukarı pozitif; yüzün ortası
      const r = Math.hypot(dx, dy) / head.height;
      // Kafaya yakınken açı küçük hareketlerle çok değişir; tepkiyi yavaşlat
      response = Math.min(1, Math.max(0.25, r));
      if (r < 0.3) {
        // Yüzün üstünden geçerken bakış korunur; ancak imleç orada durursa kameraya döner
        if (!enteredFace) enteredFace = now;
      } else {
        enteredFace = 0;
        target = angleToFrame(anchors, (Math.atan2(dy, dx) * 180) / Math.PI);
      }
      lastMove = now;
      pointerInside = true;
    });
    const leave = () => {
      pointerInside = false;
      lastMove = performance.now();
    };
    hero.addEventListener('pointerleave', leave);
    // Sekme ya da uygulama değişince pointerleave gelmez; yoksa kafa son yöne bakıp donar
    document.addEventListener('visibilitychange', leave);
    global.addEventListener('blur', leave);

    const tick = (now) => {
      if (enteredFace && now - enteredFace > 400) target = front;
      // Fare yokken (sahne dışında, ya da dokunmatik ekranda dokunma bitince) üst yarıda yavaşça bakınır
      const idle = !pointerInside && now - lastMove > 3500;
      const goal = idle ? angleToFrame(anchors, 90 + Math.sin((now - lastMove) / 1800) * 80) : target;
      // En fazla ~1.4 kare/kare: yarım tur yaklaşık 1 saniye, asla zıplamaz
      shown = loopStep(shown, goal, frames, 0.1 * (idle ? 1 : response), 1.4);
      draw(Math.round(shown) % frames);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Kaydırma hikâyesi: kamera kareleri kaydırmayla çizilir, sonra masa katmanı gelir ve telefona
  // yakınlaşılır. Kareler yoksa ya da hareket azaltılmışsa masa çapraz geçişle gelir.
  function initStory(hero, reducedMotion) {
    const story = document.getElementById('story');
    const desk = document.getElementById('desk-layer');
    const frame = desk && desk.querySelector('.desk__frame');
    const phone = document.getElementById('phone-ui');
    const head = document.getElementById('hero-head');
    const cam = document.getElementById('hero-camera');
    const end = document.getElementById('desk');
    if (!story || !desk || !frame) return;
    const fading = hero.querySelectorAll('.hero__copy, .hero__caption, .hero__scroll, .hero > .header');
    let drawCam = null, camFrames = 0;

    if (cam && !reducedMotion) {
      loadFrames(cam.dataset.frames)
        .then(({ images }) => {
          const draw = frameDrawer(cam, images);
          // Kaydırmanın istediği kare sonradan çözülürse yeniden çizilir
          images.forEach((img) => img.addEventListener('load', queue, { once: true }));
          images[0].addEventListener('load', () => { drawCam = draw; camFrames = images.length; update(); }, { once: true });
        })
        .catch(() => {});
    }

    let queued = false;
    function update() {
      queued = false;
      const r = story.getBoundingClientRect();
      // sonundaki bekleme payı (--hold) ilerlemeye sayılmaz: orada telefon hazır bekler
      const hold = end ? end.offsetHeight - window.innerHeight : 0;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight - hold)));
      const st = storyState(p, !!drawCam);
      fading.forEach((el) => {
        el.style.opacity = st.copy;
        // Tamamen solmuş üst bar ve yazılar altındaki telefonun tıklamalarını yutmasın
        el.style.visibility = st.copy > 0.01 ? '' : 'hidden';
      });
      if (head) head.style.opacity = st.head;
      if (drawCam) {
        cam.style.opacity = p > 0.005 && st.desk < 1 ? '1' : '0';
        drawCam(Math.round(st.camera * (camFrames - 1)));
      }
      desk.style.opacity = st.desk;
      if (phone) phone.style.opacity = st.phone;
      desk.classList.toggle('is-interactive', st.interactive);
      // Telefondan uzaklaşınca ekran kararır ve telefon tekrar kilitlenir
      if (st.phone < 0.3 && global.PhoneUI && !global.PhoneUI.isLocked()) global.PhoneUI.relock();

      // Yakınlaşma: düzen telefon yakın planında; başta tüm kare ekranı kaplayacak şekilde küçültülür
      const uPhone = frame.offsetWidth / 1440;
      const uFull = Math.max(window.innerWidth / 1440, window.innerHeight / 810);
      const s0 = Math.min(1, uFull / uPhone);
      const k = 1 - st.zoom;
      const s = s0 + (1 - s0) * st.zoom;
      frame.style.transform = `translate(${(-1.5 * uPhone * s0 * k).toFixed(2)}px, ${(111.7 * uPhone * s0 * k).toFixed(2)}px) scale(${s.toFixed(4)})`;
      global.Story = { p, interactive: st.interactive };
    }
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    global.addEventListener('scroll', queue, { passive: true });
    global.addEventListener('resize', queue);
    update();
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
