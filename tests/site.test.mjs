import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

const SECTIONS = ['about', 'experience', 'projects', 'skills', 'education', 'contact'];

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

test('gizli bilgi yok', () => {
  const html = readHtml();
  for (const s of ['506', '133 00', '[gizli]']) assert.ok(!html.includes(s), `"${s}" sitede geçiyor`);
});

test('404 ana sayfaya link verir', () => {
  assert.ok(read('404.html').includes('href="/"'));
});

const SLUGS = ['intime-ik', 'adilpazar', 'yeni-nesil-ik', 'nika-ik', 'intime-takip', 'zaferzone', 'nikachat', 'nikaconnect', 'nikaphone'];

test('9 proje kartı', () => {
  const found = [...readHtml().matchAll(/data-project="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(found, SLUGS);
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

test('projeler telefonu 9 ekran', () => {
  const html = readHtml();
  const start = html.indexOf('id="projects-phone"');
  assert.ok(start > -1, '#projects-phone yok');
  const end = html.indexOf('<!-- /projects-phone -->', start);
  assert.ok(end > -1, 'projects-phone bitiş işareti yok');
  const screens = [...html.slice(start, end).matchAll(/data-screen="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(screens, SLUGS);
});
