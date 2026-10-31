# emreasci.com: Masa ve telefon sahnesi tasarımı

Tarih: 2026-10-31
Önceki tasarımın (`2026-10-31-portfolio-site-design.md`) görsel yönünün yerini alır. Barındırma, domain, TR/EN, "telefon numarası ve referans adı yok" kuralları aynen geçerlidir.

## Fikir

Site iki sahneden oluşur. Ziyaretçi neon ışıklı bir masada oturan Memoji-tarzı Emre'yi görür; aşağı kaydırınca kamera laptopun üstünden süzülüp masadaki iPhone'a iner. Telefonun içindeki her şey Emre'nin işleridir. Ziyaretçi bir ikona bastığında Emre'nin eli o ikona dokunur ve uygulama açılır.

## Sahneler

| # | Sahne | Davranış |
|---|---|---|
| 1 | Açılış (`hero`) | Mevcut hero: plaka + imleci izleyen kafa klibi, başlık, özel imleç. **PUSH ME düğmesi ve monitör ekranı kaldırılır.** |
| 2 | Kamera inişi | Hero'nun altında yapışkan (sticky) bir sahne. Kaydırma ilerlemesi 0→1, kamera videosunun 0→son karesine eşlenir (oynatılmaz, kaydırmayla kare seçilir). |
| 3 | Telefon | Kamera inişi bitince son karede telefonun ekranına gerçek HTML arayüz perspektifle oturtulur (monitördeki `quadMatrix` yöntemi). Kadrajda masa ve eller de görünür; telefon ekranın tamamını kaplamaz. |
| 4 | Dokunma | İkona basılınca o ikonun dokunma videosu oynar (eli ikona uzanır, dokunur, geri çekilir). Dokunma anında uygulama açılma animasyonu başlar. Video bitince yalnız HTML arayüz kalır. |
| 5 | Alt bilgi | E-posta, LinkedIn, GitHub, gizlilik politikası linkleri, © satırı. |

## Telefon arayüzü

Ana ekran 4 sütun × 3 satır, 12 ikon:

| Satır | İkonlar |
|---|---|
| 1 | Hakkımda · Deneyim · İletişim · Intime İK |
| 2 | AdilPazar · Yeni Nesil İK · Nika İK · Intime Takip |
| 3 | ZaferZone · NikaChat · NikaConnect · NikaPhone |

- **Hakkımda:** Memoji avatar, kısa tanıtım, rakamlar (20K+ indirme, 10K+ aktif kullanıcı, 2+ yıl, 9 proje).
- **Deneyim:** Intime Info Yazılım, React Native Developer (09/2024–devam), CV maddeleri; eğitim.
- **İletişim:** E-posta, LinkedIn, GitHub butonları.
- **Proje uygulamaları (9):** 1. sayfa projenin stilize uygulama ekranı (önceki tasarımda çizilen ekranlar yeniden kullanılır); 2. sayfa (kaydırınca ya da "Hakkında" sekmesi) proje açıklaması, teknoloji etiketleri, mağaza linkleri.
- Her uygulamada üstte geri ("‹") düğmesi; ana ekrana dönüş elsiz, yalnız HTML animasyonla.
- Durum çubuğu (saat, pil) ve iOS benzeri ikon stili. Metinler TR/EN (`data-i18n`).

## Görseller ve videolar (Emre üretir: ChatGPT + Kling)

| Dosya | İçerik | Kaynak |
|---|---|---|
| `ust.png` | Kamera yukarıda, masaya ~60–70° bakıyor: altta laptopun arkası, ortada ekranı kapalı iPhone, iki yanda eller, üstte Emre'nin gövdesi. 16:9. | ChatGPT |
| `kamera.mp4` | Kling Keyframes: ilk `sahne.png`, son `ust.png`; kamera laptopun üstünden telefona iner. | Kling |
| `ust-ui.png` | `ust.png` + telefon ekranına yerleştirilmiş ana ekran görüntüsü | Claude üretir |
| `dokun-N.png` (12) | `ust-ui.png` üzerinde parmağı N. ikona dokunan el | ChatGPT |
| `dokun-N.mp4` (12) | Kling Keyframes: ilk `ust-ui.png`, orta `dokun-N.png`, son `ust-ui.png` | Kling |

Toplam 13 video (720p'de ~650 kredi). Videolar parça parça gelebilir: dokunma videosu olmayan ikonlar elsiz açılır, site hiçbir aşamada bozuk görünmez.

## Teknik kararlar

- **Kaydırmayla kare seçme:** Kamera videosu blob olarak alınır, her 2 karede bir anahtar kare (`-g 2`) ile kodlanır; `preload="auto"` (Safari için zorunlu). Kaydırma hedefi `currentTime`'a yumuşatılarak (×0.2) uygulanır.
- **Sahne yüksekliği:** Kamera bölümü `300svh`, içinde `position: sticky` tam ekran çerçeve; ilerleme = bölümün kaydırılan oranı.
- **Telefon ekranı:** Ekran köşeleri `ust.png` üzerinde ölçülür; arayüz 390×844 CSS px'lik bir iPhone tuvali olarak çizilip `matrix3d` ile köşelere eşlenir. Arayüz ancak ilerleme ≥ 0.98 iken görünür ve tıklanabilir.
- **Dokunma:** Ana ekran arayüzünün görüntüsü videonun içinde de olduğundan, video ana ekranın üstünde oynar; dokunma karesinde (videonun ortası) HTML'de uygulama açılır, video sonunda video katmanı gizlenir.
- **Hareketi azalt:** Kamera inişi yerine doğrudan son kare; dokunma videoları oynatılmaz.
- **Telefonlar (≤820px):** Çerçeve ekranı kaplar ve ortalanır; telefon ekranı kadrajın ortasında kaldığı için akış aynıdır.
- **Kaldırılanlar:** Eski içerik bölümleri (deneyim, projeler, yetenekler, eğitim, iletişim) ve `phone.js`'in eski sahne telefonları; içerik telefona taşınır.

## Kapsam dışı

- Gizlilik politikası sayfalarının içeriği (alt bilgide yalnız link yeri).
- Fare ile yukarı/aşağı bakma.

## Bekleyen işler (yayından önce)

- Telefon numarası ve referans adının git geçmişinden temizlenmesi.
- Final incelemenin açık kalan düzeltmeleri (Pages iş akışı yalnız site dosyalarını yayınlar, açık tema kontrastı).
- GitHub Pages + WordPress.com DNS.
