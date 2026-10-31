# emreasci.com Portföy Sitesi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Yaşayan telefon" animasyonlu, TR/EN, tek sayfalık portföy sitesini yapıp GitHub Pages üzerinden `emreasci.com`'da yayına almak.

**Architecture:** Build adımı olmayan statik site. `index.html` TR içeriği taşır, `js/i18n.js` EN sözlüğünü uygular. Animasyonlar CSS keyframe + `IntersectionObserver` ile; telefon ekranları HTML/CSS ile çizilmiş stilize ekranlar. Doğrulama: bağımlılıksız Node test betiği + uygulama içi tarayıcıda görsel kontrol.

**Tech Stack:** HTML5, CSS (custom properties, keyframes), vanilla JS (klasik `<script defer>`, modül yok), Node 24 `node:test` (yalnızca test), GitHub Pages, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-10-31-portfolio-site-design.md`

## Global Constraints

- Harici kütüphane, framework, CDN, build adımı yok. Font: sistem font yığını.
- Vurgu rengi `#22d3ee`; koyu tema varsayılan, `prefers-color-scheme: light` → açık tema.
- Telefon numarası (`[gizli]`) ve referans bilgisi (`[gizli] [gizli]`) sitede **asla** geçmez.
- İletişim: `emreaasci@gmail.com`, `https://linkedin.com/in/emreaasci`, `https://github.com/emreaasci`.
- Rakamlar: 20K+ indirme, 10K+ aktif kullanıcı, 2+ yıl, 9 proje.
- Sadece `transform`/`opacity` animasyonu; `prefers-reduced-motion: reduce` tüm hareketi kapatır.
- JS kapalıyken içerik TR olarak tam görünür (reveal sınıfları yalnız `html.js` altında gizler).
- Dil seçimi `localStorage` anahtarı `lang` (`"tr"` | `"en"`); her erişim try/catch içinde.
- Mobil kırılım: `900px` (altında sticky telefon kapanır), en dar hedef `375px`, yatay scroll yok.

## Review Focus

1. **EN'de çevrilmemiş metin kalması** → her `data-i18n` anahtarının EN karşılığı olmalı (Task 3 testi).
2. **375px'te yatay taşma** (marquee, telefon, uzun e-posta) → `document.documentElement.scrollWidth <= innerWidth` (Task 6 kontrolü).
3. **localStorage erişilemezken (gizli sekme) site çökmesi** → `getStoredLang()` hata yutar, `null` döner (Task 3 testi).
4. **Hareketi azalt açıkken içeriğin görünmez kalması** → reduced-motion'da `.reveal` öğeleri `opacity:1` (Task 5 kontrolü).
5. **Kırık iç linkler / eksik dosya** (menü `#id`'leri, css/js yolları) → Task 1 testi her `href="#x"` için `id="x"` ve her yerel `src/href` için dosya varlığını doğrular.

---

### Task 1: İskelet, test betiği, yayın dosyaları

**Files:**
- Create: `index.html`, `css/style.css`, `css/anim.css`, `js/i18n.js`, `js/phone.js`, `js/main.js` (boş/iskelet), `CNAME`, `404.html`, `assets/favicon.svg`, `.nojekyll`
- Test: `tests/site.test.mjs`

**Interfaces:**
- Produces: bölüm id'leri `about`, `experience`, `projects`, `skills`, `education`, `contact`; `<html lang="tr" class="no-js">` (inline script `no-js`→`js` yapar); script sırası `i18n.js`, `phone.js`, `main.js` (hepsi `defer`).
- Produces: `tests/site.test.mjs` içinde yardımcı `readHtml(): string` ve `localRefs(html): string[]`.

- [ ] **Step 1: Testleri yaz** — `node:test` + `node:assert`:
  - `CNAME içeriği emreasci.com` → `readFileSync('CNAME','utf8').trim() === 'emreasci.com'`
  - `tüm bölümler var` → 6 id'nin her biri `id="<x>"` olarak geçer
  - `menü linkleri hedefli` → her `href="#x"` için `id="x"` var
  - `yerel dosyalar mevcut` → her `src=`/`href=` (http/mailto/# olmayan) için `existsSync`
  - `gizli bilgi yok` → html'de `506`, `133 00`, `[gizli]` geçmez
  - `404 ana sayfaya link verir` → `404.html` içinde `href="/"`
- [ ] **Step 2:** `node --test tests/` → FAIL (dosyalar yok)
- [ ] **Step 3:** İskeleti oluştur: meta (title "Emre Aşcı — React Native Developer", description, og:title/og:description, theme-color `#0b1020`, viewport), boş `<section>`'lar, `css/style.css`'te `:root` token'ları (`--bg`, `--surface`, `--text`, `--muted`, `--accent:#22d3ee`, `--accent-2:#f472b6`, `--radius`) ve light override.
- [ ] **Step 4:** `node --test tests/` → PASS
- [ ] **Step 5:** Commit `feat: site iskeleti ve test betiği`

### Task 2: TR içerik ve sayfa düzeni

**Files:**
- Modify: `index.html`, `css/style.css`
- Test: `tests/site.test.mjs`

**Interfaces:**
- Produces: proje öğeleri `<article class="project" data-project="<slug>">`; slug'lar sırasıyla `intime-ik`, `adilpazar`, `yeni-nesil-ik`, `nika-ik`, `intime-takip`, `zaferzone`, `nikachat`, `nikaconnect`, `nikaphone`. Öne çıkanlar `class="project project--featured"` (ilk ikisi).
- Produces: rakamlar `<span class="stat__num" data-count="20" data-suffix="K+">`, `10`/`K+`, `2`/`+`, `9`/`` — metin içeriği son değerdir (JS kapalıyken doğru görünür).
- Produces: hero telefon yuvası `<div class="phone" id="hero-phone">`, projeler telefonu `<div class="phone phone--sticky" id="projects-phone">`; her `.phone` içinde `.phone__screen[data-screen="<slug>"]` öğeleri. Hero: `intime-ik`, `adilpazar`, `nikachat`. Projeler telefonu: 9 slug'ın hepsi.
- Produces: her metin taşıyan öğede `data-i18n="<bölüm>.<anahtar>"` (ör. `hero.title`, `projects.intime-ik.desc`).

- [ ] **Step 1: Testleri ekle**
  - `9 proje kartı` → `data-project="` eşleşme sayısı 9, slug listesi yukarıdakiyle aynı sırada
  - `rakamlar` → `data-count` değerleri `["20","10","2","9"]`
  - `iletişim linkleri` → `mailto:emreaasci@gmail.com`, `linkedin.com/in/emreaasci`, `github.com/emreaasci` geçer
  - `projeler telefonu 9 ekran` → `#projects-phone` bloğunda 9 `data-screen`
- [ ] **Step 2:** `node --test tests/` → yeni testler FAIL
- [ ] **Step 3:** İçeriği spec'in "Bölümler" kısmına göre CV'den yaz (deneyim maddeleri 4–5 kısa madde; her proje 1 cümle + etiketler). Düzen: header (sticky, blur yok, yarı saydam `--bg`), hero 2 sütun (≥900px), projeler 2 sütun (sol sticky telefon `top: 15vh`), <900px tek sütun. Telefon çerçevesi: 260×530px (mobilde 200×408), `border-radius: 40px`, çentik. Ekranların görsel içeriği Task 4'te; burada her `.phone__screen` sadece başlık şeridi + renkli zemin.
- [ ] **Step 4:** `node --test tests/` → PASS
- [ ] **Step 5:** Commit `feat: TR içerik ve sayfa düzeni`

### Task 3: TR/EN dil desteği

**Files:**
- Modify: `js/i18n.js`, `index.html` (header'a `<button class="lang-toggle" id="lang-toggle">EN</button>`)
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Produces (global `window.I18N`): `{ en: Record<string,string>, detectLang(navLangs: string[], stored: string|null): "tr"|"en", getStoredLang(): string|null, setStoredLang(lang): void, applyLang(lang, root = document): void }`. `applyLang("tr")` orijinal TR metinleri geri yükler (ilk çağrıda `data-i18n-tr` olarak saklanır), `document.documentElement.lang`'ı ve düğme metnini (`TR`↔`EN`) günceller, `<title>` ve meta description'ı da çevirir.
- Kurallar: `stored` geçerliyse o; değilse `navLangs` içinde ilk `tr*` → `"tr"`, ilk `en*` → `"en"`; hiçbiri yoksa `"en"`.

- [ ] **Step 1: Testleri yaz** — `i18n.js`'i `node:vm` ile `{ window: {}, localStorage }` bağlamında çalıştır:
  - `her anahtarın EN karşılığı var` → html'deki tüm `data-i18n` değerleri `I18N.en`'de, boş değil
  - `kullanılmayan EN anahtarı yok` → `Object.keys(en)` ⊆ html anahtarları ∪ `{"meta.title","meta.description"}`
  - `detectLang(["tr-TR"], null) === "tr"`, `detectLang(["de","en-US"], null) === "en"`, `detectLang(["de"], null) === "en"`, `detectLang(["en"], "tr") === "tr"`, `detectLang(["tr"], "xx") === "tr"`
  - `getStoredLang localStorage atınca null döner` → getter'ı throw eden bağlamda `null`
- [ ] **Step 2:** `node --test tests/` → FAIL
- [ ] **Step 3:** `i18n.js`'i yaz; dosya sonunda `DOMContentLoaded`'da `applyLang(detectLang(navigator.languages, getStoredLang()))` ve düğme tıklamasıyla geçiş (yalnız `typeof document !== "undefined"` ise). EN metinleri doğal İngilizce yazılır (CV çevirisi, birebir değil).
- [ ] **Step 4:** `node --test tests/` → PASS
- [ ] **Step 5:** Commit `feat: TR/EN dil desteği`

### Task 4: Yaşayan telefon

**Files:**
- Modify: `js/phone.js`, `css/anim.css`, `css/style.css` (ekran içerikleri), `index.html` (ekran içerikleri, hero balonları)
- Verify: uygulama içi tarayıcı

**Interfaces:**
- Consumes: Task 2'deki `#hero-phone`, `#projects-phone`, `.phone__screen[data-screen]`, `.project[data-project]`.
- Produces (global `window.Phone`): `showScreen(phoneEl, slug): void` (aktif ekrana `is-active`, öncekine `is-leaving` verir; geçiş 600ms `transform: translateY` + `opacity`), `startCycle(phoneEl, slugs, intervalMs = 2800): () => void` (durdurma fonksiyonu döner; sekme gizliyken durur), `enableTilt(phoneEl, maxDeg = 8): void` (yalnız `(pointer: fine)` ve hareket serbestse), `syncWithProjects(phoneEl, projectEls): void` (`IntersectionObserver`, `rootMargin: "-45% 0px -45% 0px"`, görünen projenin slug'ı ile `showScreen`; aktif karta `is-current`).

- [ ] **Step 1:** 9 stilize ekranı HTML/CSS ile çiz (her biri ~6–12 öğe, ortak `.ui-bar`, `.ui-card`, `.ui-chip`, `.ui-bubble` sınıflarıyla): Intime İK = giriş/çıkış butonu + izin/masraf kartları; AdilPazar = ürün ızgarası + sepet; Yeni Nesil İK / Nika İK = Intime düzeni farklı marka rengi; Intime Takip = harita + konum pini (CSS); ZaferZone = bildirim listesi; NikaChat = mesaj balonları; NikaConnect = görüntülü arama ızgarası; NikaPhone = tuş takımı.
- [ ] **Step 2:** Hero balonlarını ekle (`.float-badge` × 3: "20K+ indirme", "10K+ aktif kullanıcı", bildirim "Giriş yapıldı · 08:59"), `@keyframes float` 3–4s, farklı gecikmeler; `data-i18n` anahtarlarıyla (Task 3 testi bunları da kapsar — EN çevirilerini ekle).
- [ ] **Step 3:** `phone.js`'i yaz ve `DOMContentLoaded`'da bağla: hero'da `startCycle(hero, ["intime-ik","adilpazar","nikachat"])` + `enableTilt`; ≥900px'te `syncWithProjects`; <900px'te her kart içine ilgili ekranın klonunu `.phone--mini` olarak ekle.
- [ ] **Step 4:** `node --test tests/` → PASS (i18n anahtarları dahil)
- [ ] **Step 5: Tarayıcıda doğrula** — hero ekranları ~2.8s'de bir değişiyor; fare hareketiyle eğiliyor; projeler bölümünde kaydırınca ekran karta göre değişiyor; konsolda hata yok.
- [ ] **Step 6:** Commit `feat: yaşayan telefon animasyonları`

### Task 5: Kaydırma animasyonları, sayaçlar, marquee

**Files:**
- Modify: `js/main.js`, `css/anim.css`, `index.html` (`.reveal` sınıfları, marquee yapısı)

**Interfaces:**
- Produces: `.reveal` (görününce `is-visible`; `html.js .reveal{opacity:0;transform:translateY(24px)}`), `countUp(el, durationMs = 1400)` (`data-count`/`data-suffix`'ten, ease-out), `.marquee > .marquee__track` (içerik JS ile bir kez çoğaltılır, `@keyframes marquee` `translateX(-50%)`, ikinci satır `animation-direction: reverse`, hover'da `animation-play-state: paused`), mobil menü (`#menu-toggle`, `aria-expanded`).

- [ ] **Step 1:** `main.js`: reveal observer (`threshold: 0.15`, bir kez), sayaçlar (görününce), marquee çoğaltma, menü aç/kapa + link tıklayınca kapanma.
- [ ] **Step 2:** `anim.css`'e `@media (prefers-reduced-motion: reduce)` bloğu: tüm `animation: none`, `transition: none`, `.reveal{opacity:1;transform:none}`; `phone.js`/`main.js` `matchMedia('(prefers-reduced-motion: reduce)').matches` ise döngü/tilt/sayaç başlatmaz (sayaç son değeri zaten gösterir).
- [ ] **Step 3:** `node --test tests/` → PASS
- [ ] **Step 4: Tarayıcıda doğrula** — bölümler kayarken beliriyor; sayaçlar 0'dan yükseliyor; iki marquee satırı ters yönde akıyor; reduced-motion emülasyonunda her şey görünür ve sabit.
- [ ] **Step 5:** Commit `feat: kaydırma animasyonları ve sayaçlar`

### Task 6: Görsel QA

**Files:**
- Modify: gereken CSS/HTML düzeltmeleri

- [ ] **Step 1:** `python3 -m http.server 4173` ile yerel sunucu (`.claude/launch.json`), uygulama içi tarayıcıda aç.
- [ ] **Step 2:** Kontrol matrisi — masaüstü (1440) ve mobil (375) × TR/EN × koyu/açık: ekran görüntüsü; `document.documentElement.scrollWidth <= innerWidth` → `true`; konsolda hata yok; EN'de Türkçe metin kalmamış.
- [ ] **Step 3:** Bulunanları düzelt, `node --test tests/` → PASS
- [ ] **Step 4:** Commit `fix: görsel QA düzeltmeleri`

### Task 7: Yayın

**Files:** — (GitHub ve WordPress.com ayarları)

- [ ] **Step 1:** `gh repo create emreaasci/emreasci.com --public --source . --push` → push başarılı.
- [ ] **Step 2:** `gh api -X POST repos/emreaasci/emreasci.com/pages -f "source[branch]=main" -f "source[path]=/"` sonra `gh api -X PUT repos/emreaasci/emreasci.com/pages -f cname=emreasci.com` → `gh api repos/emreaasci/emreasci.com/pages` çıktısında `"cname":"emreasci.com"`.
- [ ] **Step 3: DNS (Emre'nin onayıyla, tarayıcıda)** — WordPress.com → Alan Adları → emreasci.com → DNS kayıtları: A `@` ×4 (185.199.108.153, .109, .110, .111), CNAME `www` → `emreaasci.github.io`; çakışan varsayılan kayıtları kaldır. Her değişiklikten önce Emre'ye mevcut kayıtları göster ve onay al.
- [ ] **Step 4:** `dig +short emreasci.com` → 4 GitHub IP'si; `dig +short www.emreasci.com` → `emreaasci.github.io.` (yayılma beklenirse arka planda kontrol).
- [ ] **Step 5:** Sertifika çıkınca `gh api -X PUT repos/emreaasci/emreasci.com/pages -F https_enforced=true`; `curl -sI https://emreasci.com` → `200`, `curl -sI https://www.emreasci.com` → `301` → apex.
