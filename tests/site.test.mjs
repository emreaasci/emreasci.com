import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

export const readHtml = () => read('index.html');

// http, mailto ve # ile başlamayan src/href değerleri
export const localRefs = (html) =>
  [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => !/^(https?:|mailto:|#|data:)/.test(v) && v !== '/');

const SECTIONS = ['about', 'desk'];

test('CNAME içeriği emreasci.com', () => {
  assert.equal(read('CNAME').trim(), 'emreasci.com');
});

test('tüm bölümler var', () => {
  const html = readHtml();
  for (const id of SECTIONS) assert.ok(html.includes(`id="${id}"`), `#${id} eksik`);
});

test('menü linkleri hedefli', () => {
  const html = readHtml();
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${id}"`), `#${id} hedefi yok`);
  }
});

test('yerel dosyalar mevcut', () => {
  for (const ref of localRefs(readHtml())) {
    assert.ok(existsSync(join(root, ref.replace(/^\//, ''))), `${ref} bulunamadı`);
  }
});

// Kişisel veriler repoya yazılmasın diye referans adı yalnız SHA-256 olarak tutulur
const PRIVATE_WORD_HASHES = new Set([
  '22dadcbb47b620c884dfcd6ad128fb8326a1dd3641cf5395f585d18a2525c80b',
  '0fa1707c32275cbd1cb3a4458b83b7e995203e6b973005573f0f40bb49fba311',
]);
const PHONE = /(?:\+90[\s-]?)?\b0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/;
const trackedFiles = () =>
  execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => /\.(html|css|js|mjs|md|yml|txt|svg|json)$/.test(f));

test('repoda telefon numarası ve referans adı yok', () => {
  for (const file of trackedFiles()) {
    const text = read(file);
    assert.ok(!PHONE.test(text), `${file} telefon numarası içeriyor`);
    for (const word of text.toLocaleLowerCase('tr').match(/\p{L}+/gu) || []) {
      const hash = createHash('sha256').update(word).digest('hex');
      assert.ok(!PRIVATE_WORD_HASHES.has(hash), `${file} referans adını içeriyor`);
    }
  }
});

test('Pages yalnız site dosyalarını yayınlar', () => {
  const wf = read('.github/workflows/pages.yml');
  for (const f of ['index.html', '404.html', 'CNAME', 'css', 'js', 'assets']) assert.ok(wf.includes(f), `${f} kopyalanmıyor`);
  assert.ok(wf.includes('path: _site'), 'yalnız _site yüklenmeli');
  assert.ok(!/cp[^\n]*\bdocs\b/.test(wf) && !/cp[^\n]*\btests\b/.test(wf), 'docs/tests yayınlanmamalı');
});

test('hero GitHub linki', () => {
  const html = readHtml();
  const hero = html.slice(html.indexOf('class="hero"'), html.indexOf('id="desk"'));
  assert.ok(hero.includes('href="https://github.com/emreaasci"'), 'hero GitHub linki yok');
});

test('hareketi azalt: mini telefon ölçeği korunur', () => {
  const css = read('css/anim.css');
  const block = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.ok(!/(^|[\s,}])\.phone\s*\{/.test(block), 'genel .phone transform override mini telefonları büyütür');
});

const luminance = (hex) => {
  const c = hex.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('açık temada vurgu rengi AA kontrastı', () => {
  const css = read('css/style.css');
  const light = css.slice(css.indexOf('prefers-color-scheme: light'));
  const v = (name) => light.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
  assert.ok(contrast(v('accent'), '#ffffff') >= 4.5, 'buton metni');
  assert.ok(contrast(v('accent'), v('bg')) >= 4.5, 'zemin üzerinde vurgu metni');
});

test('404 ana sayfaya link verir', () => {
  assert.ok(read('404.html').includes('href="/"'));
});

test('rakamlar', () => {
  const found = [...readHtml().matchAll(/data-count="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(found, ['20', '10', '2', '9']);
});

test('iletişim linkleri', () => {
  const html = readHtml();
  for (const s of ['mailto:emreaasci@gmail.com', 'linkedin.com/in/emreaasci', 'github.com/emreaasci']) {
    assert.ok(html.includes(s), `${s} eksik`);
  }
});

