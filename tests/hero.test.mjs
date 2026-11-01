import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

function loadHero() {
  const window = {};
  vm.runInNewContext(readFileSync(join(root, 'js/hero.js'), 'utf8'), { window });
  return window.Hero;
}

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('hero sahnesi: plaka ve bakış döngüsü', () => {
  assert.match(html, /<img[^>]+class="hero__plate"[^>]+src="assets\/hero\/plate\.webp"/);
  assert.match(html, /id="hero-head"[^>]+data-look="assets\/hero\/look\.json"/);
});

test('look.json: döngü videosu ve yön çapaları', () => {
  const look = JSON.parse(readFileSync(join(root, 'assets/hero/look.json'), 'utf8'));
  assert.equal(look.src, 'assets/hero/look.mp4');
  assert.ok(look.frames > 100);
  for (let i = 1; i < look.anchors.length; i++) {
    assert.ok(look.anchors[i][0] < look.anchors[i - 1][0], 'açılar azalan sırada');
    assert.ok(look.anchors[i][1] > look.anchors[i - 1][1], 'kareler artan sırada');
  }
});

const ANCHORS = [[180, 27], [135, 45], [90, 60], [45, 76], [0, 90], [-45, 106], [-90, 120], [-135, 135], [-150, 144]];

test('angleToFrame: çapalar arasında doğrusal, boşlukta en yakın çapa', () => {
  const { angleToFrame } = loadHero();
  assert.equal(angleToFrame(ANCHORS, 180), 27);
  assert.equal(angleToFrame(ANCHORS, 90), 60);
  assert.equal(angleToFrame(ANCHORS, -90), 120);
  assert.ok(close(angleToFrame(ANCHORS, 112.5), 52.5));
  assert.equal(angleToFrame(ANCHORS, -160), 144);
  assert.equal(angleToFrame(ANCHORS, -175), 27);
  assert.equal(angleToFrame(ANCHORS, -180), 27);
});

test('loopStep: döngüde en kısa yoldan ilerler', () => {
  const { loopStep } = loadHero();
  assert.equal(loopStep(0, 27, 169, 1), 27);
  assert.equal(loopStep(160, 5, 169, 1), 5, 'sondan başa sarar');
  assert.equal(loopStep(160, 5, 169, 0.5), 167);
  assert.equal(loopStep(5, 160, 169, 0.5), 167, 'baştan sona geri sarar');
  assert.equal(loopStep(60, 90, 169, 0.5), 75);
});

test('loopStep: hız sınırı uzak hedefe zıplamayı engeller', () => {
  const { loopStep } = loadHero();
  assert.equal(loopStep(0, 60, 169, 0.5, 2), 2);
  assert.equal(loopStep(10, 0, 169, 0.5, 2), 8);
  assert.equal(loopStep(168, 2, 169, 1, 2), 1, 'sınır sarmada da geçerli');
  assert.equal(loopStep(0, 1, 169, 0.5, 2), 0.5, 'yakın hedefte oran geçerli');
});

test('quadMatrix: dikdörtgenin köşeleri dörtgenin köşelerine gider', () => {
  const { quadMatrix } = loadHero();
  const w = 400, h = 300;
  const quad = [[10, 20], [380, 40], [390, 310], [15, 300]];
  const m = quadMatrix(w, h, quad); // CSS matrix3d sırası (sütun öncelikli 16 sayı)
  const apply = (x, y) => {
    const W = m[3] * x + m[7] * y + m[15];
    return [(m[0] * x + m[4] * y + m[12]) / W, (m[1] * x + m[5] * y + m[13]) / W];
  };
  [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y], i) => {
    const [X, Y] = apply(x, y);
    assert.ok(close(X, quad[i][0]) && close(Y, quad[i][1]), `köşe ${i}: ${X},${Y}`);
  });
});

test('storyState: kaydırma oranına göre katmanlar', () => {
  const { storyState } = loadHero();
  const s0 = storyState(0, true);
  assert.equal(s0.copy, 1); assert.equal(s0.head, 1); assert.equal(s0.camera, 0); assert.equal(s0.desk, 0);
  assert.equal(s0.interactive, false);
  const mid = storyState(0.4, true);
  assert.equal(mid.copy, 0); assert.equal(mid.head, 0);
  assert.ok(mid.camera > 0.4 && mid.camera < 0.6, `kamera ${mid.camera}`);
  assert.equal(mid.desk, 0);
  const end = storyState(1, true);
  assert.equal(end.camera, 1); assert.equal(end.desk, 1); assert.equal(end.zoom, 1); assert.equal(end.phone, 1);
  assert.equal(end.interactive, true);
  // video yokken masa karesi kamera yerine çapraz geçişle gelir
  const fb = storyState(0.4, false);
  assert.ok(fb.desk > 0 && fb.desk < 1, `yedek geçiş ${fb.desk}`);
  for (const p of [0, 0.2, 0.5, 0.8, 1]) {
    for (const v of Object.values(storyState(p, true))) {
      if (typeof v === 'number') assert.ok(v >= 0 && v <= 1, `p=${p} aralık dışı`);
    }
  }
});
