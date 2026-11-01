import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const APPS = [
  'about', 'experience', 'contact',
  'intime-ik', 'adilpazar', 'yeni-nesil-ik', 'nika-ik',
  'intime-takip', 'zaferzone', 'nikachat', 'nikaconnect', 'nikaphone',
];
const PROJECTS = APPS.slice(3);

// <tag ... attr="value"> ile açılan bloğun tamamını (iç içe aynı etiketleri sayarak) döndürür
function block(attr, value) {
  const start = html.indexOf(`${attr}="${value}"`);
  if (start < 0) return '';
  const open = html.lastIndexOf('<', start);
  const tag = html.slice(open + 1).match(/^\w+/)[0];
  let depth = 0;
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = open;
  for (let m; (m = re.exec(html)); ) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index + m[0].length);
  }
  return '';
}

test('masa sahnesi: tepeden kare ve telefon arayüzü', () => {
  assert.match(html, /id="desk"/);
  assert.match(html, /class="story"/);
  assert.match(html, /<img[^>]+class="desk__plate"[^>]+src="assets\/desk\/pov\.webp"/);
  assert.match(html, /id="phone-ui"/);
});

test('ana ekranda 12 uygulama ikonu doğru sırada', () => {
  const home = block('class', 'home__grid');
  const icons = [...home.matchAll(/data-app="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(icons, APPS);
  for (const id of APPS) assert.match(home, new RegExp(`<button[^>]+data-app="${id}"`), `${id} buton değil`);
});

test('her ikonun bir uygulama ekranı var', () => {
  for (const id of APPS) assert.ok(block('data-app-screen', id), `${id} ekranı yok`);
});

test('proje uygulamaları: arayüz ve bilgi sayfası', () => {
  for (const slug of PROJECTS) {
    const app = block('data-app-screen', slug);
    assert.match(app, new RegExp(`data-screen="${slug}"`), `${slug}: stilize arayüz yok`);
    assert.match(app, new RegExp(`data-i18n="projects\\.${slug}\\.desc"`), `${slug}: açıklama yok`);
  }
});

test('hakkımda: rakamlar ve avatar', () => {
  const about = block('data-app-screen', 'about');
  assert.deepEqual([...about.matchAll(/data-count="([^"]+)"/g)].map((m) => m[1]), ['20', '10', '2', '9']);
  assert.match(about, /src="assets\/desk\/avatar\.webp"/);
});

test('iletişim uygulaması linkleri', () => {
  const contact = block('data-app-screen', 'contact');
  for (const s of ['mailto:emreaasci@gmail.com', 'linkedin.com/in/emreaasci', 'github.com/emreaasci']) {
    assert.ok(contact.includes(s), `${s} eksik`);
  }
});

test('eski bölümler kaldırıldı', () => {
  for (const id of ['intro', 'experience', 'projects', 'skills', 'education', 'projects-phone']) {
    assert.ok(!html.includes(`id="${id}"`), `#${id} hâlâ var`);
  }
});
