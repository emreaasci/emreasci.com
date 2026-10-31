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

test('hero sahnesi: plaka ve kafa katmanı', () => {
  assert.match(html, /<img[^>]+class="hero__plate"[^>]+src="assets\/hero\/plate\.webp"/);
  assert.match(html, /id="hero-head"[^>]+data-rows="assets\/hero\/rows\.json"/);
  assert.doesNotMatch(html, /id="push"|id="monitor-screen"/, 'eski buton/monitör kalmamalı');
});

test('rows.json: orta satır var ve tablo monoton', () => {
  const rows = JSON.parse(readFileSync(join(root, 'assets/hero/rows.json'), 'utf8'));
  const { lut, src } = rows.rows.mid;
  assert.equal(src, 'assets/hero/head.mp4');
  assert.equal(lut[0], 0);
  assert.equal(lut[lut.length - 1], 1);
  for (let i = 1; i < lut.length; i++) assert.ok(lut[i] >= lut[i - 1], `kare ${i} geriye gidiyor`);
});

test('progressForX: kenar payları ve orta', () => {
  const { progressForX } = loadHero();
  assert.equal(progressForX(0), 0);
  assert.equal(progressForX(0.14), 0);
  assert.ok(close(progressForX(0.5), 0.5));
  assert.equal(progressForX(0.86), 1);
  assert.equal(progressForX(1), 1);
});

test('frameForProgress: tabloyu tersine çevirir', () => {
  const { frameForProgress } = loadHero();
  const lut = [0, 0, 0, 0.5, 0.5, 1, 1];
  assert.equal(frameForProgress(lut, 0), 0);
  assert.equal(frameForProgress(lut, 1), 5);
  assert.ok(close(frameForProgress(lut, 0.25), 2.5));
  assert.ok(close(frameForProgress(lut, 0.75), 4.5));
});

test('rowWeights: yukarı, orta, aşağı karışımı', () => {
  const { rowWeights: rw } = loadHero();
  const rowWeights = (v) => ({ ...rw(v) }); // vm nesnesinin prototipi farklı; düz nesneye çevir
  assert.deepEqual(rowWeights(0), { up: 0, mid: 1, down: 0 });
  assert.deepEqual(rowWeights(-1), { up: 1, mid: 0, down: 0 });
  assert.deepEqual(rowWeights(1), { up: 0, mid: 0, down: 1 });
  const h = rowWeights(-0.5);
  assert.ok(close(h.up, 0.5) && close(h.mid, 0.5) && h.down === 0);
  assert.deepEqual(rowWeights(-3), { up: 1, mid: 0, down: 0 }, 'sınırların dışı kırpılır');
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
