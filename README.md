# Lotus ADHD Koçluğu — Anasayfa

Mürvet Cebeci'nin ADHD koçluğu için yeniden tasarlanmış anasayfa.
İçerik [lotusadhdcoaching.com](https://www.lotusadhdcoaching.com) sitesinden alınmıştır.

**Canlı:** https://tcnfounder.github.io/lotusathd/

## Konsept

Logodaki fikir sayfanın her yerinde: **mor zihin, yeşil lotusun içinde.** Hero'da Mürvet Hanım'ın videosu, logodaki beyin gibi, çizilerek açılan bir lotusun ortasında duruyor.

| Detay | ADHD için anlamı |
| --- | --- |
| Hero arka planı imleç hareket ettikçe dalgalanır; imleç durunca durulur, ışık toplanır | "Durulunca her şey daha net" |
| Sağdaki yolculuk navigasyonu ve "~N dk okuma kaldı" | Zaman körlüğüne destek, doğrusal olmayan gezinme |
| **Sakin mod** | Tüm hareketi ve otomatik videoyu durdurur; tercih hatırlanır, sistemin "hareketi azalt" ayarına uyar |
| SSS'de önce kısa cevap, Hakkımda'da "Hikâyenin devamı" | Bilgiyi parçalara bölme |
| Formda "3/5 zorunlu alan doldu" ilerleme çubuğu ve anlık onay işaretleri | Küçük, görünür ilerleme (dopamin) |
| Çamur → Su → Çiçek yolu okudukça çizilir | Koçluk yolculuğu |
| Gövde metni Atkinson Hyperlegible Next | Okunabilirlik odaklı yazı tipi |

## Randevu formu

Form [FormSubmit](https://formsubmit.co) ile doğrudan `murvet@lotusadhdcoaching.com` adresine gider.
**İlk gönderimde bu adrese bir onay e-postası gelir; bir kez "Activate" tıklanması gerekir.**
Başka bir servis kullanmak için `index.html` içindeki formun `data-endpoint` ve `action` değerlerini değiştirmek yeterli.

## Teknik

Build adımı yok; saf HTML/CSS/JS, GitHub Pages'te doğrudan çalışır.

- **OGL** (hafif WebGL): hero arka planı ve imleç akış haritası. Zayıf cihazlarda kaliteyi otomatik düşürür.
- **GSAP + ScrollTrigger + SplitText**: satır satır başlık girişleri, okudukça aydınlanan alıntılar, kaydırmaya bağlı çizimler, kayan konu bandı (hızı kaydırmaya göre değişir), sayaçlar, eğilen kartlar, manyetik butonlar.
- Fontlar (Bricolage Grotesque, Atkinson Hyperlegible Next) Türkçe karakterlere göre alt kümelenmiş ve yerelde barındırılıyor; Google Fonts çağrısı yok (KVKK/GDPR dostu).
- Erişilebilirlik: klavye ile gezinme, görünür odak, ARIA sekmeleri, `prefers-reduced-motion`.

```
index.html
assets/css/main.css
assets/js/main.js      # etkileşimler
assets/js/aurora.js    # WebGL hero arka planı
assets/vendor/         # gsap, ogl
assets/fonts/          # woff + OFL lisansları
```

Videolar, Mürvet Hanım'ın fotoğrafı ve blog bağlantıları orijinal siteden yükleniyor.

Yerelde çalıştırmak için: `python3 -m http.server` ve `http://localhost:8000`.
