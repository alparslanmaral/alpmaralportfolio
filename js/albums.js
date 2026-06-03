/* =========================================================
   ALBÜMLER  —  Buradan albüm ekler/çıkarırsın.
   ---------------------------------------------------------
   • Her albüm için assets/ içinde "folder" adıyla bir klasör aç.
       Örn:  assets/Dugun/ , assets/Manzara/
   • Fotoğrafların dosya adlarını "photos" dizisine yaz.
   • "name"  -> masada/etikette görünen ad.
   • "folder"-> assets içindeki klasör adı (boşluk olabilir).
   • "color" -> albüm kapağının rengi (#hex).  İstersen değiştir.
   • İstersen "cover" ile kapağa gerçek bir görsel koyabilirsin
     (assets/<folder>/ içindeki bir dosya adı). Boş bırakırsan
     kapak otomatik olarak renk + albüm adıyla çizilir.

   Klasör + fotoğraf yolu şöyle birleşir:  assets/<folder>/<dosya>
   ========================================================= */

export const ALBUMS = [
  {
    name:  "Sokak Portreleri",
    folder:"Sokak Portreleri",
    color: "#1d2733",
    cover: "",                 // örn: "kapak.jpg"
    photos: [
      // "01.jpg", "02.jpg", "03.jpg", "04.jpg"
    ]
  },
  {
    name:  "Düğün",
    folder:"Dugun",
    color: "#2a1d22",
    cover: "",
    photos: [
      // "01.jpg", "02.jpg", "03.jpg"
    ]
  },
  {
    name:  "Portrait",
    folder:"Portrait",
    color: "#16241c",
    cover: "",
    photos: [
      "1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"
    ]
  }
];
