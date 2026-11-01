import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const APPS = [
  'about', 'experience', 'contact',
  'intime-ik', 'adilpazar', 'yeni-nesil-ik', 'nika-ik',
  'intime-takip', 'zaferzone', 'nikachat', 'nikaconnect', 'nikaphone', 'waddle',
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

test('ana ekranda tüm uygulama ikonları doğru sırada', () => {
  const home = block('class', 'home__grid');
  const icons = [...home.matchAll(/data-app="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(icons, APPS);
  for (const id of APPS) assert.match(home, new RegExp(`<button[^>]+data-app="${id}"`), `${id} buton değil`);
});

test('her ikonun bir uygulama ekranı var', () => {
  for (const id of APPS) assert.ok(block('data-app-screen', id), `${id} ekranı yok`);
});

test('proje uygulamaları doğrudan bilgi sayfası açar', () => {
  for (const slug of PROJECTS) {
    const app = block('data-app-screen', slug);
    assert.match(app, new RegExp(`data-i18n="projects\\.${slug}\\.desc"`), `${slug}: açıklama yok`);
    assert.match(app, /class="app__body"/, `${slug}: bilgi gövdesi yok`);
    assert.ok(!/data-tab=|data-screen=|data-shots/.test(app), `${slug}: eski arayüz/sekme kalmış`);
  }
});

test('mağazadaki uygulamalar gerçek ikonlarını kullanır', () => {
  const home = block('class', 'home__grid');
  for (const slug of ['intime-ik', 'adilpazar', 'yeni-nesil-ik', 'nika-ik', 'intime-takip', 'zaferzone', 'nikachat', 'waddle']) {
    const src = `assets/icons/${slug}.webp`;
    assert.ok(existsSync(join(root, src)), `${src} yok`);
    assert.match(block('data-app', slug), new RegExp(`src="${src}"`), `${slug}: ana ekran ikonu gerçek değil`);
    assert.match(block('data-app-screen', slug), new RegExp(`src="${src}"`), `${slug}: bilgi sayfası ikonu gerçek değil`);
  }
  assert.ok(home);
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

test('masa katmanı 13 uygulamayı içerir, üst bar ve başlık dışında kalır', () => {
  const desk = block('id', 'desk-layer');
  assert.equal([...desk.matchAll(/data-app-screen="/g)].length, APPS.length);
  assert.ok(!desk.includes('class="header"'), 'üst bar masanın içine düşmüş');
  assert.ok(!desk.includes('class="hero__copy"'), 'başlık masanın içine düşmüş');
  const hero = block('class', 'hero');
  assert.ok(hero.includes('id="desk-layer"') && hero.includes('class="header"'));
});

import vm from 'node:vm';
function loadLock() {
  const window = {};
  vm.runInNewContext(readFileSync(join(root, 'js/phone-ui.js'), 'utf8'), { window, Intl });
  return window.PhoneLock;
}

test('kilit ekranı telefonun içinde, ana ekranın üstünde', () => {
  const ui = block('id', 'phone-ui');
  const lock = block('id', 'lock-screen');
  assert.ok(lock, 'kilit ekranı yok');
  assert.ok(ui.includes('id="lock-screen"'));
  assert.match(lock, /class="lock__time"/);
  assert.match(lock, /class="lock__date"/);
  assert.match(lock, /data-i18n="lock\.hint"/);
  assert.match(lock, /<button[^>]+class="lock__unlock"/, 'klavye ile açmak için düğme yok');
});

test('formatLockDate: TR ve EN', () => {
  const { formatLockDate } = loadLock();
  const d = new Date(2026, 10, 1, 21, 5); // 1 Kasım 2026, Pazar
  // iOS kilit ekranındaki kısa biçim
  assert.equal(formatLockDate(d, 'tr'), '1 Kas Paz');
  assert.equal(formatLockDate(d, 'en'), 'Sun, Nov 1');
});

test('formatClock: iki haneli saat', () => {
  const { formatClock } = loadLock();
  assert.equal(formatClock(new Date(2026, 10, 1, 9, 5)), '09:05');
  assert.equal(formatClock(new Date(2026, 10, 1, 21, 40)), '21:40');
});

test('shouldUnlock: mesafe ya da hız eşiği', () => {
  const { shouldUnlock } = loadLock();
  const H = 870;
  assert.equal(shouldUnlock(-300, 0, H), true, 'ekranın üçte birinden fazla');
  assert.equal(shouldUnlock(-100, 0, H), false, 'kısa ve yavaş');
  assert.equal(shouldUnlock(-80, -0.9, H), true, 'kısa ama hızlı fırlatma');
  assert.equal(shouldUnlock(40, -2, H), false, 'aşağı çekmek açmaz');
});

test('duvar kağıdı: kilit ve ana ekran aynı görseli kullanır, kilitte bildirim yok', () => {
  const css = readFileSync(join(root, 'css/phone-ui.css'), 'utf8');
  assert.ok(existsSync(join(root, 'assets/desk/wallpaper.webp')));
  const uses = css.match(/url\("?\.\.\/assets\/desk\/wallpaper\.webp"?\)/g) || [];
  assert.ok(uses.length >= 1, 'duvar kağıdı CSS\'te kullanılmıyor');
  assert.ok(!block('id', 'lock-screen').includes('class="note"'), 'kilitte eski bildirimler kalmış');
});

test('telefon sahnesi bittikten sonra footer hemen gelmez: bekleme payı', () => {
  const css = readFileSync(join(root, 'css/phone-ui.css'), 'utf8');
  assert.match(css, /\.story \{[^}]*--hold:\s*\d+svh/, '.story için --hold yok');
  assert.match(css, /\.story \{[^}]*height:\s*calc\(380svh \+ var\(--hold\)\)/);
  assert.match(css, /\.story__end \{[^}]*height:\s*calc\(100svh \+ var\(--hold\)\)/, '#desk linki beklemenin başına gitmeli');
  assert.match(readFileSync(join(root, 'js/hero.js'), 'utf8'), /hold/, 'ilerleme hesabı beklemeyi düşmüyor');
});

test('Waddle: Hakkında sayfasında yeni sekmede açılan gizlilik politikası', () => {
  const app = block('data-app-screen', 'waddle');
  assert.match(app, /<a[^>]+href="apps\/waddle\/privacy\/"[^>]+target="_blank"/, 'gizlilik linki yeni sekmede açılmıyor');
  assert.match(app, /data-i18n="phone\.privacy"/);
  const page = readFileSync(join(root, 'apps/waddle/privacy/index.html'), 'utf8');
  for (const s of ['lang="en"', 'emreaasci@gmail.com', 'WeatherKit', 'GeoNames', 'Expo', '90']) {
    assert.ok(page.includes(s), `gizlilik metninde ${s} yok`);
  }
  assert.match(page, /id="tr"/, 'Türkçe bölüm yok');
  assert.match(page, /href="\/"/, 'siteye dönüş linki yok');
});
