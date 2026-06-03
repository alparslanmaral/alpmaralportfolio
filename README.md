# ARŞİV — 3D Fotoğraf/Video Portföyü

Sorgu odası atmosferinde, masaya bakan, 3D albümlerin durduğu interaktif bir portföy.
Hover'da albüm adı + glow + ikinci spot ışığı; tıklayınca Resident Evil tarzı inceleme;
tekrar tıklayınca Alan Wake tarzı duvarın önünde 3D sayfa çevirme.

## Klasör yapısı
```
portfolio/
├── index.html
├── css/style.css
├── js/
│   ├── main.js        ← sahne + tüm etkileşim
│   ├── albums.js      ← ALBÜMLERİ BURADAN YÖNETİRSİN
│   └── textures.js    ← prosedürel dokular (masa/duvar/kapak)
└── assets/
    ├── Sokak Portreleri/
    ├── Dugun/
    └── Manzara/
```

## ⚠️ Çalıştırma (önemli)
Tarayıcı, `file://` ile açıldığında yerel görselleri (doku/foto) **güvenlik nedeniyle
yükleyemez**. Bu yüzden küçük bir yerel sunucu gerekir:

**Python (en kolay):**
```bash
cd portfolio
python -m http.server 8000
```
Sonra tarayıcıda: `http://localhost:8000`

**VS Code:** "Live Server" eklentisini kur → index.html'e sağ tık → "Open with Live Server".

İnternet bağlantısı gerekir (Three.js ve fontlar CDN'den gelir).

## Albüm / fotoğraf ekleme
1. `assets/` içinde albüm adıyla bir klasör aç (örn: `assets/Manzara/`).
2. Fotoğrafları o klasöre at (`.jpg`, `.png`, `.webp`).
3. `js/albums.js` dosyasını aç ve albümü tanımla:

```js
{
  name:  "Manzara",        // masada/etikette görünen ad
  folder:"Manzara",        // assets içindeki klasör adı
  color: "#16241c",        // kapak rengi
  cover: "",               // kapak görseli (örn "kapak.jpg"); boşsa otomatik
  photos: [ "01.jpg", "02.jpg", "03.jpg" ]   // klasördeki dosya adları
}
```

> Statik site klasörü kendi başına okuyamadığı için fotoğraf adlarını
> `photos` dizisine elle yazman gerekiyor. Sıra = albümdeki sayfa sırası.

## Kontroller
- **Masa:** albüme gel → ad + glow + spot. Tıkla → inceleme.
- **İnceleme:** tekrar tıkla → albümün içine gir. `Esc` → masaya dön.
- **Albüm içi:** ekranın sağ/sol yarısına tıkla veya alttaki ‹ › ile sayfa çevir.
  `Esc` ya da sol üstteki "MASAYA DÖN" ile çık.

## İnce ayar (main.js)
- Spot ışık şiddeti/açısı: `spot1`, `spot2` tanımları.
- Kamera açısı: `POSE.desk` / `POSE.album`.
- Albüm boyutu: `const W = 1.7, H = 2.3, T = 0.38`.
- Sayfa oranı: `PAGE_W`, `PAGE_H`.
- Glow rengi: `outline.visibleEdgeColor` (varsayılan altın sarısı).
