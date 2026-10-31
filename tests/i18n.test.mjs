import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'js/i18n.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// i18n.js'i tarayıcısız çalıştırır; document tanımsız olduğu için DOM bağlama atlanır
function load(localStorage = { getItem: () => null, setItem() {} }) {
  const window = {};
  vm.runInNewContext(src, { window, localStorage });
  return window.I18N;
}

const htmlKeys = () => new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));

test('her anahtarın EN karşılığı var', () => {
  const { en } = load();
  for (const key of htmlKeys()) {
    assert.ok(typeof en[key] === 'string' && en[key].trim(), `EN eksik: ${key}`);
  }
});

test('kullanılmayan EN anahtarı yok', () => {
  const { en } = load();
  const allowed = new Set([...htmlKeys(), 'meta.title', 'meta.description']);
  for (const key of Object.keys(en)) assert.ok(allowed.has(key), `kullanılmayan: ${key}`);
});

test('detectLang kuralları', () => {
  const { detectLang } = load();
  assert.equal(detectLang(['tr-TR'], null), 'tr');
  assert.equal(detectLang(['de', 'en-US'], null), 'en');
  assert.equal(detectLang(['de'], null), 'en');
  assert.equal(detectLang(['en'], 'tr'), 'tr');
  assert.equal(detectLang(['tr'], 'xx'), 'tr');
});

test('getStoredLang localStorage atınca null döner', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const { getStoredLang, setStoredLang } = load(throwing);
  assert.equal(getStoredLang(), null);
  assert.doesNotThrow(() => setStoredLang('en'));
});
