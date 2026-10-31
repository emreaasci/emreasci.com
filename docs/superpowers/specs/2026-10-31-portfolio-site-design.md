# emreasci.com — Portföy Sitesi Tasarımı

Tarih: 2026-10-31

## Amaç

`emreasci.com` adresinde canlı, dikkat çekici bir portföy sitesi. Ziyaretçi ilk
saniyede Emre'nin mobil (React Native) geliştirici olduğunu ve yayındaki
uygulamalarını görmeli. Site ileride uygulama gizlilik politikalarına da
kalıcı adres sağlayacak (bu iş ayrı bir adım, bu spec'in kapsamında değil).

**Başarı ölçütü:** `https://emreasci.com` (ve `www`) HTTPS ile açılıyor, TR/EN
çalışıyor, masaüstü ve telefonda düzgün görünüyor, animasyonlar akıcı.

## Kararlar

| Konu | Karar |
| --- | --- |
| Barındırma | GitHub Pages, repo `emreaasci/emreasci.com`, `main` dalının kökünden yayın |
| Domain | WordPress.com'da kalır; DNS'te GitHub Pages A kayıtları + `www` CNAME |
| Teknoloji | Düz HTML + CSS + vanilla JS. Framework, build adımı, harici kütüphane yok |
| Dil | TR + EN. TR içerik HTML'de; EN sözlüğü JS'te. Tarayıcı diline göre otomatik, seçim `localStorage`'da |
| Tema | Koyu varsayılan (lacivert zemin, camgöbeği `#22d3ee` vurgu); `prefers-color-scheme: light` ise açık tema |
| İletişim | E-posta, LinkedIn, GitHub. Telefon ve referans **yok** |
| Animasyon yönü | "Yaşayan telefon" |

## Dosya yapısı

```
index.html          Tek sayfa, TR içerik, data-i18n anahtarları
css/style.css       Tema token'ları, layout, bileşenler
css/anim.css        Keyframe'ler, reveal, reduced-motion kuralları
js/i18n.js          EN sözlüğü + dil algılama/değiştirme
js/phone.js         Telefon ekranlarının döngüsü, eğilme, projeler bölümündeki ekran senkronu
js/main.js          Reveal (IntersectionObserver), sayaçlar, menü
assets/             favicon, og-image
CNAME               emreasci.com
404.html            Basit yönlendirme sayfası
```

Stilize uygulama ekranları HTML/CSS ile çizilir (`.screen--intime`,
`.screen--adilpazar` …); gerçek ekran görüntüleri gelirse aynı yuvaya `<img>`
olarak konur.

## Bölümler

1. **Header:** Logo/isim, menü (Hakkımda · Deneyim · Projeler · Yetenekler ·
   İletişim), TR/EN düğmesi. Mobilde hamburger.
2. **Hero:** Başlık "Emre Aşcı — React Native Developer", özet, iki CTA
   (İletişime geç, GitHub). Sağda telefon; ekranlar Intime İK → AdilPazar →
   NikaChat döngüsü. Yüzen balonlar: "20K+ indirme", "10K+ aktif kullanıcı",
   bildirim balonu. Telefon fare konumuna göre hafif 3D eğilir.
3. **Rakamlar:** 20K+ indirme, 10K+ aktif kullanıcı, 2+ yıl, 9 proje; görünür
   olunca sayarak artar.
4. **Deneyim:** Intime Info Yazılım — React Native Developer (09/2024 –
   devam). CV'deki maddelerin kısaltılmış hali.
5. **Projeler (scrollytelling):** Masaüstünde solda yapışkan (sticky) telefon,
   sağda proje listesi. Aktif projeye göre telefon ekranı değişir. Projeler:
   Intime İK, AdilPazar (öne çıkan), Yeni Nesil İK, Nika İK, Intime Takip,
   ZaferZone, NikaChat, NikaConnect, NikaPhone (demo). Her birinde 1 cümle +
   teknoloji etiketleri; yayındakilere mağaza linki. Mobilde (<900px) sticky
   kapanır, her kartın içinde mini telefon.
6. **Yetenekler:** CV gruplarından seçilmiş etiketler, iki satır ters yönde
   kayan şerit (marquee); hover'da durur.
7. **Eğitim:** Bandırma Onyedi Eylül Üniversitesi, Bilgisayar Mühendisliği
   (2020–2024).
8. **İletişim + footer:** E-posta, LinkedIn, GitHub. Footer'da ileride
   "Uygulamalar / Gizlilik" linkleri için yer.

## Animasyon ilkeleri

- Sadece `transform` ve `opacity` animasyonu (GPU dostu, layout tetiklemez).
- `prefers-reduced-motion: reduce` → döngü, eğilme, marquee ve sayaçlar
  kapanır; içerik doğrudan görünür.
- JS kapalıysa: tüm içerik TR olarak görünür, telefon ilk ekranda durur.

## İleride (kapsam dışı)

- Gizlilik politikaları: `/apps/<slug>/privacy/index.html` → URL
  `emreasci.com/apps/<slug>/privacy`.
- Gerçek uygulama ekran görüntüleri.

## Yayın adımları

1. Repo `emreaasci/emreasci.com` olarak GitHub'a push (ücretsiz Pages için repo **public** olmalı).
2. GitHub → Settings → Pages: kaynak `main` / root, custom domain
   `emreasci.com`.
3. WordPress.com → Alan Adları → emreasci.com → DNS kayıtları:
   - A `@` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - CNAME `www` → `emreaasci.github.io`
   - Çakışan varsayılan A/CNAME kayıtları kaldırılır.
4. DNS yayıldıktan sonra GitHub'da "Enforce HTTPS" açılır.

## Test

- Yerelde uygulama içi tarayıcıda: masaüstü + 375px mobil, TR/EN, açık/koyu
  tema, reduced-motion, konsolda hata yok.
- Canlıda: `https://emreasci.com` ve `https://www.emreasci.com` açılıyor,
  sertifika geçerli.
