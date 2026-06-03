# ARCHIVE — 3D Photography/Video Portfolio

An interactive portfolio set in an interrogation-room atmosphere: you look down at a
desk where 3D albums sit. On hover an album shows its name + a glow + a second spotlight;
click to inspect it (Resident Evil item style); click again to step inside and flip
through 3D pages in front of an Alan Wake style wall.

## Folder structure
```
portfolio/
├── index.html
├── css/style.css
├── js/
│   ├── main.js        ← scene + all interaction
│   ├── albums.js      ← MANAGE YOUR ALBUMS HERE
│   └── textures.js    ← procedural textures (desk/wall/cover)
└── assets/
    ├── Street Portraits/
    ├── Wedding/
    └── Landscape/
```

## ⚠️ Running it (important)
When opened with `file://`, the browser blocks loading local images (textures/photos)
for security reasons. So you need a tiny local server:

**Python (easiest):**
```bash
cd portfolio
python -m http.server 8000
```
Then open: `http://localhost:8000`

**VS Code:** install the "Live Server" extension → right-click index.html → "Open with Live Server".

An internet connection is required (Three.js and the fonts load from a CDN).

## Adding an album / photos
1. Create a folder inside `assets/` named after the album (e.g. `assets/Landscape/`).
2. Drop your photos in it (`.jpg`, `.png`, `.webp`).
3. Open `js/albums.js` and define the album:

```js
{
  name:  "Landscape",        // label shown on the desk / on hover
  folder:"Landscape",        // folder name inside assets/
  color: "#16241c",          // cover color
  cover: "",                 // cover image (e.g. "cover.jpg"); empty = auto
  photos: [ "01.jpg", "02.jpg", "03.jpg" ]   // filenames in the folder
}
```

> A static site can't read a folder by itself, so you list the photo filenames
> in the `photos` array manually. Order = page order in the album.

## Controls
- **Desk:** hover an album → name + glow + spotlight. Click → inspect.
- **Inspect:** click again → step inside the album. `Esc` → back to desk.
- **Inside an album:** click the left/right half of the screen, or use the ‹ › buttons,
  to turn pages. `Esc` or "BACK TO DESK" (top-left) to exit.

## Tweaks (main.js)
- Spotlight intensity/angle: the `spot1`, `spot2` definitions.
- Camera angle: `POSE.desk` / `POSE.album`.
- Album size: `const W = 1.7, H = 2.3, T = 0.38`.
- Page ratio: `PAGE_W`, `PAGE_H`.
- Hover glow color: `outline.visibleEdgeColor` (default warm gold).
