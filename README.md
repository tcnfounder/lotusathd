# Lotus ADHD Koçluğu — Anasayfa

Mürvet Cebeci'nin ADHD koçluğu için yeniden tasarlanmış anasayfa.
İçerik [lotusadhdcoaching.com](https://www.lotusadhdcoaching.com) sitesinden alınmıştır.

**Canlı:** https://tcnfounder.github.io/lotusathd/

## Konsept: çamurdan açan zihin

Sayfa bir gölet gibi kurgulandı. Kaydırdıkça çamurdan (zorluklar) suya (farkındalık), sudan çiçeğe (kendi gücün) geçilir.

| Detay | ADHD için anlamı |
| --- | --- |
| Hero'daki canlı lotus, imleç hareket ettikçe su dalgalanır; imleç durunca su durulur ve çiçek parlar | Odak ve durgunluk: "durulunca görünür" |
| Kaydırdıkça tomurcuk açılır | Koçluk yolculuğu |
| Sağdaki gövde (stem) navigasyonu ve "~N dk okuma kaldı" | Zaman körlüğüne destek, doğrusal olmayan gezinme |
| **Sakin mod** düğmesi | Hareketi kapatır; tercih hatırlanır. Sistemdeki "hareketi azalt" ayarına da uyar |
| Hizmetler = 5 yaprak | İlgi temelli, serbest keşif |
| SSS'de önce kısa cevap, sonra devamı; Hakkımda'da "Hikâyenin devamı" | Bilgiyi parçalara bölme (chunking) |
| Gövde metni Atkinson Hyperlegible Next | Farklı okuyucular için okunabilirlik odaklı tasarlanmış yazı tipi |
| Logodaki orta yaprak hafif eğik | Her zihin kendi şekilde açar |

## Teknik

Build adımı yok; saf HTML/CSS/JS, GitHub Pages'te doğrudan çalışır.

- **OGL** (hafif WebGL): lotus ve su shader'ı, imleç akış haritası (Flowmap). Zayıf cihazlarda çözünürlüğü otomatik düşürür, gerekirse sabit kareye geçer.
- **GSAP + ScrollTrigger**: kaydırmaya bağlı açılma ve panel geçişleri.
- Fontlar (Bricolage Grotesque, Atkinson Hyperlegible Next) Türkçe karakterlere göre alt kümelenmiş ve yerelde barındırılıyor; Google Fonts çağrısı yok (KVKK/GDPR dostu).
- Erişilebilirlik: klavye ile gezinme, görünür odak, ARIA sekmeleri, `prefers-reduced-motion`.

```
index.html
assets/css/main.css
assets/js/main.js      # etkileşimler
assets/js/pond.js      # WebGL gölet + lotus
assets/vendor/         # gsap, ogl
assets/fonts/          # woff + OFL lisansları
```

Videolar, randevu formu (Google Forms) ve blog bağlantıları orijinal siteden çekiliyor.

Yerelde çalıştırmak için: `python3 -m http.server` ve `http://localhost:8000`.
