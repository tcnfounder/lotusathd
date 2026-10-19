# Lotus ADHD Koçluğu — Anasayfa

Mürvet Cebeci'nin ADHD koçluğu için yeniden tasarlanmış anasayfa.
İçerik [lotusadhdcoaching.com](https://www.lotusadhdcoaching.com) sitesinden alınmıştır.

**Canlı:** https://tcnfounder.github.io/lotusathd/

## Konsept

Logodaki fikir sayfanın her yerinde: **mor zihin, yeşil lotusun içinde.** Hero'da Mürvet Hanım'ın videosu, logodaki beyin gibi, çizilerek açılan bir lotusun ortasında duruyor.

| Detay | ADHD için anlamı |
| --- | --- |
| Hero arka planı imleç hareket ettikçe dalgalanır; imleç durunca durulur, ışık toplanır | "Durulunca her şey daha net" |
| **Sakin mod (ADHD odak modu)** | Hareket ve otomatik video durur; renkler yumuşar, koyu bloklar açılır; kayan konu şeridi sabit listeye döner; başlıklar okunaklı yazı tipine geçer; okuma odağı yalnızca okunan paragrafı net bırakır; alttaki odak çubuğu bölümü, kalan okuma süresini ve tek bir "sonraki adım"ı gösterir. Ayarlar: yazı boyutu, satır aralığı, gri tonlu renk, yalnızca metin. Tercihler hatırlanır, sistemin "hareketi azalt" ayarına uyar. Kısayol: Alt + Shift + S. **Kaldığın yer:** başka sekmeye geçip dönünce, sayfada dalıp gidince (3 dk hareketsizlik) ya da günler sonra yeniden gelince, tam bırakılan cümleyi gösterip tek dokunuşla oraya döndürür; bilgi yalnızca cihazda saklanır |
| Hakkımda'da "Hikâyenin devamı" | Bilgiyi parçalara bölme |
| "Neden lotus" kaydırdıkça ilerleyen bir hikâye: tohum çamurda uyanır, su durulur, ışık gelir, lotus açar ve kalbinde zihin parlar | Koçluk yolculuğu; tek seferde tek bölüm, ilerleme çubuğu |
| Açılışta loader: lotus kendini çizer, ortasında zihin belirir, "Nefes al / Nefes ver" ritmi | Sayfaya sakin bir başlangıç; aynı oturumda tekrar açılışta kısalır |
| En sağda dil düğmesi: Türk bayrağı paraya dönüşüp İngiliz bayrağına döner, ardından İngilizce siteye geçer | |
| Gövde metni Atkinson Hyperlegible Next | Okunabilirlik odaklı yazı tipi |

## Sayfa akışı

Hero (video) → konu bandı → Hakkımda (fotoğraf) → Neden lotus → footer.
Randevu butonları WhatsApp'a gider; Videolar ve Blog orijinal sitedeki sayfalara bağlanır.

## Teknik

Build adımı yok; saf HTML/CSS/JS, GitHub Pages'te doğrudan çalışır.

- **OGL** (hafif WebGL): hero arka planı ve imleç akış haritası. Zayıf cihazlarda kaliteyi otomatik düşürür.
- **GSAP + ScrollTrigger + SplitText**: satır satır başlık girişleri, okudukça aydınlanan alıntılar, kaydırmaya bağlı çizimler, kayan konu bandı (hızı kaydırmaya göre değişir), sayaç, manyetik butonlar.
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
