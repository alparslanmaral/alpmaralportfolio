/* =========================================================
   Prosedürel dokular (canvas ile çizilir, ek dosya gerekmez)
   ========================================================= */
import * as THREE from "three";

function canvas(w, h){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/* Koyu ahşap masa yüzeyi */
export function woodTexture(){
  const c = canvas(1024, 1024);
  const x = c.getContext("2d");
  x.fillStyle = "#1b130c";
  x.fillRect(0, 0, 1024, 1024);
  // damar çizgileri
  for(let i = 0; i < 240; i++){
    const yy = Math.random() * 1024;
    x.strokeStyle = `rgba(${30 + Math.random()*40|0},${18 + Math.random()*22|0},8,${Math.random()*0.25})`;
    x.lineWidth = Math.random() * 2.4;
    x.beginPath();
    x.moveTo(0, yy);
    let yyy = yy;
    for(let xx = 0; xx <= 1024; xx += 40){
      yyy += (Math.random() - 0.5) * 10;
      x.lineTo(xx, yyy);
    }
    x.stroke();
  }
  // hafif noktasal kirlilik
  for(let i = 0; i < 4000; i++){
    x.fillStyle = `rgba(0,0,0,${Math.random()*0.18})`;
    x.fillRect(Math.random()*1024, Math.random()*1024, 1.4, 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.anisotropy = 8;
  return t;
}

/* Alan Wake tarzı grunge duvar */
export function wallTexture(){
  const c = canvas(1024, 1024);
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, "#0c0c0e");
  g.addColorStop(0.5, "#141318");
  g.addColorStop(1, "#070708");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  // leke/grunge
  for(let i = 0; i < 60; i++){
    const r = 60 + Math.random()*260;
    const grd = x.createRadialGradient(
      Math.random()*1024, Math.random()*1024, 0,
      Math.random()*1024, Math.random()*1024, r);
    grd.addColorStop(0, `rgba(0,0,0,${Math.random()*0.22})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = grd;
    x.fillRect(0, 0, 1024, 1024);
  }
  // ince çatlak/çizik
  for(let i = 0; i < 50; i++){
    x.strokeStyle = `rgba(0,0,0,${Math.random()*0.3})`;
    x.lineWidth = Math.random()*1.5;
    x.beginPath();
    const sx = Math.random()*1024, sy = Math.random()*1024;
    x.moveTo(sx, sy);
    x.lineTo(sx + (Math.random()-0.5)*200, sy + (Math.random()-0.5)*200);
    x.stroke();
  }
  // grain
  for(let i = 0; i < 9000; i++){
    x.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
    x.fillRect(Math.random()*1024, Math.random()*1024, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Albüm kapağı: deri + albüm adı (kabartma hissi) */
export function coverTexture(name, hex){
  const c = canvas(512, 700);
  const x = c.getContext("2d");
  x.fillStyle = hex || "#222";
  x.fillRect(0, 0, 512, 700);
  // deri dokusu
  for(let i = 0; i < 9000; i++){
    x.fillStyle = `rgba(0,0,0,${Math.random()*0.16})`;
    x.fillRect(Math.random()*512, Math.random()*700, 1.6, 1.6);
  }
  for(let i = 0; i < 2500; i++){
    x.fillStyle = `rgba(255,255,255,${Math.random()*0.04})`;
    x.fillRect(Math.random()*512, Math.random()*700, 1.4, 1.4);
  }
  // çerçeve
  x.strokeStyle = "rgba(217,164,65,.5)";
  x.lineWidth = 3;
  x.strokeRect(34, 34, 444, 632);
  x.lineWidth = 1;
  x.strokeRect(48, 48, 416, 604);
  // başlık
  x.fillStyle = "rgba(232,226,212,.92)";
  x.textAlign = "center";
  x.font = "600 40px Oswald, sans-serif";
  // satırlara böl
  const words = (name || "").toUpperCase().split(" ");
  const lines = [];
  let line = "";
  for(const w of words){
    if((line + " " + w).trim().length > 12){ lines.push(line.trim()); line = w; }
    else line = (line + " " + w).trim();
  }
  if(line) lines.push(line);
  const startY = 350 - (lines.length - 1) * 30;
  lines.forEach((l, i) => {
    x.shadowColor = "rgba(0,0,0,.8)";
    x.shadowBlur = 6;
    x.fillText(spaced(l), 256, startY + i * 60);
  });
  x.shadowBlur = 0;
  // alt etiket
  x.font = "20px 'Special Elite', monospace";
  x.fillStyle = "rgba(217,164,65,.85)";
  x.fillText("• ARŞİV •", 256, 612);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* Sayfa placeholder (fotoğraf yoksa) */
export function placeholderTexture(text){
  const c = canvas(700, 900);
  const x = c.getContext("2d");
  x.fillStyle = "#0e0d0b";
  x.fillRect(0, 0, 700, 900);
  x.strokeStyle = "rgba(217,164,65,.3)";
  x.lineWidth = 2;
  x.strokeRect(40, 40, 620, 820);
  x.fillStyle = "rgba(140,134,120,.8)";
  x.textAlign = "center";
  x.font = "26px 'Special Elite', monospace";
  x.fillText(text || "fotoğraf ekle", 350, 460);
  x.font = "16px 'Special Elite', monospace";
  x.fillStyle = "rgba(140,134,120,.45)";
  x.fillText("assets/<albüm>/ klasörüne", 350, 500);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* harfler arası boşluk efekti (canvas letterSpacing her yerde yok) */
function spaced(str){
  return str.split("").join("\u200a\u200a");
}
