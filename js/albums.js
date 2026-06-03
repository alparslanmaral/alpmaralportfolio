/* =========================================================
   ALBUMS  —  Manage your albums here.
   ---------------------------------------------------------
   • For each album, create a folder inside assets/ named
     exactly like "folder".   e.g.  assets/Wedding/
   • List your photo filenames in the "photos" array.
   • "name"   -> label shown on the desk / on hover.
   • "folder" -> folder name inside assets/ (spaces allowed).
   • "color"  -> album cover color (#hex). Change as you like.
   • "cover"  -> optional real cover image (a filename inside
     assets/<folder>/). Leave empty to auto-draw a cover
     from the color + album name.

   The photo path is built as:  assets/<folder>/<filename>
   ========================================================= */

export const ALBUMS = [
  {
    name:  "Portraits",
    folder:"Portraits",
    color: "#1d2733",
    cover: "",                 // e.g. "cover.jpg"
    photos: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]
  },
  {
    name:  "Wedding",
    folder:"Wedding",
    color: "#2a1d22",
    cover: "",
    photos: [
      // "01.jpg", "02.jpg", "03.jpg"
    ]
  },
  {
    name:  "Landscape",
    folder:"Landscape",
    color: "#16241c",
    cover: "",
    photos: [
      // "01.jpg", "02.jpg"
    ]
  }
];
