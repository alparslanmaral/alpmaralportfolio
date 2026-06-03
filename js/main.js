/* =========================================================
   ARŞİV — 3D fotoğraf/video portföyü
   Three.js (modül). Tüm etkileşim ve sahne burada.
   ========================================================= */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass }    from "three/addons/postprocessing/OutlinePass.js";
import { UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass }     from "three/addons/postprocessing/OutputPass.js";

import { ALBUMS } from "./albums.js";
import { woodTexture, wallTexture, coverTexture } from "./textures.js";

/* ----------------- Durumlar ----------------- */
const STATE = { LOADING:"loading", DESK:"desk", INSPECT:"inspect", ALBUM:"album" };
let state = STATE.LOADING;

/* ----------------- Temel kurulum ----------------- */
const canvasEl = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas:canvasEl, antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040404);
scene.fog = new THREE.Fog(0x040404, 10, 26);

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 7, 7.4);

/* Kamera hedefleri (yumuşak geçiş için) */
const camPos  = camera.position.clone();
const camLook = new THREE.Vector3(0, 0, -0.4);
const curLook = camLook.clone();
const POSE = {
  desk:   { pos:new THREE.Vector3(0, 7, 7.4),   look:new THREE.Vector3(0, 0, -0.4) },
  album:  { pos:new THREE.Vector3(0, 0.25, 5.2), look:new THREE.Vector3(0, 0.15, 0) }
};
function setPose(p){ camPos.copy(p.pos); camLook.copy(p.look); }
setPose(POSE.desk);

/* ----------------- Işıklar ----------------- */
scene.add(new THREE.HemisphereLight(0x223044, 0x000000, 0.12));

// Spot 1 — masaya sabit vuran ana ışık
const spot1 = new THREE.SpotLight(0xffe8c0, 90, 24, Math.PI/7, 0.5, 1.4);
spot1.position.set(-1.2, 9.5, 1.5);
spot1.target.position.set(-0.5, 0, 0);
spot1.castShadow = true;
spot1.shadow.mapSize.set(2048, 2048);
spot1.shadow.bias = -0.0006;
scene.add(spot1, spot1.target);

// Spot 2 — imlecin/hover'ın üzerine vuran ışık
const spot2 = new THREE.SpotLight(0xfff1d6, 70, 22, Math.PI/12, 0.35, 1.6);
spot2.position.set(1.4, 9.2, 2.6);
spot2.target.position.set(0, 0, 0);
spot2.castShadow = true;
spot2.shadow.mapSize.set(2048, 2048);
spot2.shadow.bias = -0.0006;
scene.add(spot2, spot2.target);

// Albüm görünümü ışığı (başta kapalı)
const albumSpot = new THREE.SpotLight(0xfff4e2, 0, 18, Math.PI/6, 0.4, 1.3);
albumSpot.position.set(0, 3.5, 5);
albumSpot.target.position.set(0, 0.1, 0);
scene.add(albumSpot, albumSpot.target);
const albumFill = new THREE.PointLight(0xbcd0ff, 0, 14);
albumFill.position.set(0, 1.5, 4);
scene.add(albumFill);

/* ----------------- Masa & oda ----------------- */
const deskGroup = new THREE.Group();
scene.add(deskGroup);

const woodTex = woodTexture();
const desk = new THREE.Mesh(
  new THREE.BoxGeometry(15, 0.5, 9),
  new THREE.MeshStandardMaterial({ map:woodTex, roughness:0.85, metalness:0.05 })
);
desk.position.y = -0.25;
desk.receiveShadow = true;
deskGroup.add(desk);

// Arka karanlık oda duvarı (atmosfer)
const roomWall = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 24),
  new THREE.MeshStandardMaterial({ color:0x070708, roughness:1 })
);
roomWall.position.set(0, 6, -9);
roomWall.receiveShadow = true;
deskGroup.add(roomWall);

// Masa için ışık düşen zemini gösteren görünmez alıcı düzlem (raycast için)
const deskPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);

/* Toz partikülleri (ışık huzmesinde süzülen) */
const dustGeo = new THREE.BufferGeometry();
const dustN = 400, dustPos = new Float32Array(dustN*3);
for(let i=0;i<dustN;i++){
  dustPos[i*3]   = (Math.random()-0.5)*10;
  dustPos[i*3+1] = Math.random()*7 + 0.2;
  dustPos[i*3+2] = (Math.random()-0.5)*7;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color:0xffe8c0, size:0.025, transparent:true, opacity:0.5,
  depthWrite:false, blending:THREE.AdditiveBlending
}));
deskGroup.add(dust);

/* ----------------- Albümleri masaya yerleştir ----------------- */
const books = [];           // { group, mesh, home:{pos,rot}, data }
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-2, -2);

function layoutPositions(n){
  // masaya gevşek bir ızgara
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const gx = 3.0, gz = 2.4;
  const pts = [];
  let i = 0;
  for(let r=0;r<rows;r++){
    const inRow = Math.min(cols, n - r*cols);
    for(let c=0;c<inRow;c++){
      const x = (c - (inRow-1)/2) * gx + (Math.random()-0.5)*0.4;
      const z = (r - (rows-1)/2) * gz + (Math.random()-0.5)*0.3;
      pts.push({ x, z, rot:(Math.random()-0.5)*0.5 });
      i++;
    }
  }
  return pts;
}

const pageEdgeMat = new THREE.MeshStandardMaterial({ color:0xe8dcc0, roughness:0.9 });

const positions = layoutPositions(ALBUMS.length);
ALBUMS.forEach((album, idx) => {
  const p = positions[idx];
  const group = new THREE.Group();
  group.position.set(p.x, 0.18, p.z);
  group.rotation.y = p.rot;

  const W = 1.7, H = 2.3, T = 0.38;       // albüm boyutu
  // kapak görseli ya da prosedürel kapak
  let coverTex;
  if(album.cover){
    coverTex = new THREE.TextureLoader().load(
      `assets/${album.folder}/${album.cover}`,
      t => { t.colorSpace = THREE.SRGBColorSpace; },
      undefined,
      () => { group.userData.mesh.material[2].map = coverTexture(album.name, album.color); group.userData.mesh.material[2].needsUpdate = true; }
    );
    coverTex.colorSpace = THREE.SRGBColorSpace;
  } else {
    coverTex = coverTexture(album.name, album.color);
  }
  const coverMat = new THREE.MeshStandardMaterial({ map:coverTex, roughness:0.6, metalness:0.1 });
  const sideMat  = new THREE.MeshStandardMaterial({ color:album.color || 0x222222, roughness:0.7 });

  // BoxGeometry materyal sırası: +x,-x,+y,-y,+z,-z  -> üst yüz (+y) = kapak
  const mats = [ sideMat, sideMat, coverMat, sideMat, pageEdgeMat, pageEdgeMat ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, T, H), mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);

  group.userData = {
    index: idx, album, mesh,
    home: { pos: group.position.clone(), rot: group.rotation.clone() }
  };
  mesh.userData.group = group;

  deskGroup.add(group);
  books.push(group);
});

/* ----------------- Postprocessing (glow + bloom + vinyet) ----------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
outline.edgeStrength = 4.0;
outline.edgeGlow = 0.8;
outline.edgeThickness = 2.0;
outline.visibleEdgeColor.set(0xd9a441);
outline.hiddenEdgeColor.set(0x3a2a10);
composer.addPass(outline);

const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ----------------- Özel imleç ----------------- */
const cursor = document.createElement("div");
cursor.id = "cursor";
Object.assign(cursor.style, {
  position:"fixed", zIndex:9, pointerEvents:"none",
  width:"22px", height:"22px", marginLeft:"-11px", marginTop:"-11px",
  border:"1px solid rgba(217,164,65,.8)", borderRadius:"50%",
  transition:"width .15s, height .15s, margin .15s, background .15s",
  mixBlendMode:"screen"
});
document.body.appendChild(cursor);

/* ----------------- UI referansları ----------------- */
const ui = {
  loader:   document.getElementById("loader"),
  label:    document.getElementById("album-label"),
  hint:     document.getElementById("hint"),
  cta:      document.getElementById("inspect-cta"),
  ctaName:  document.querySelector("#inspect-cta .cta-name"),
  bookUI:   document.getElementById("book-ui"),
  prev:     document.getElementById("prev"),
  next:     document.getElementById("next"),
  counter:  document.getElementById("page-counter"),
  back:     document.getElementById("back"),
  brand:    document.getElementById("brand")
};

/* ----------------- Etkileşim durumu ----------------- */
let hovered = null;          // hover edilen albüm grubu
let selected = null;         // seçili albüm grubu (inspect/album)
let inspectAnchor = new THREE.Vector3();
let inspectQuat = new THREE.Quaternion();

/* ===========================================================
   POINTER & RAYCAST
   =========================================================== */
addEventListener("pointermove", e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  cursor.style.left = e.clientX + "px";
  cursor.style.top  = e.clientY + "px";
  if(state === STATE.DESK){
    ui.label.style.left = e.clientX + "px";
    ui.label.style.top  = e.clientY + "px";
  }
});

addEventListener("pointerdown", onClick);

function onClick(e){
  if(state === STATE.DESK){
    if(hovered) enterInspect(hovered);
  } else if(state === STATE.INSPECT){
    enterAlbum(selected);
  } else if(state === STATE.ALBUM){
    // ekranın sağ/sol yarısı -> ileri/geri
    if(e.clientX > innerWidth/2) nextPage();
    else prevPage();
  }
}

/* ===========================================================
   DURUM GEÇİŞLERİ
   =========================================================== */
function enterInspect(group){
  state = STATE.INSPECT;
  selected = group;
  hovered = null;
  outline.selectedObjects = [];
  setHidden(ui.label, true);
  setHidden(ui.hint, true);
  setHidden(ui.brand, true);
  setHidden(ui.back, false);
  // kameranın önünde bir nokta hesapla (RE item incelemesi gibi)
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  inspectAnchor.copy(camera.position).addScaledVector(dir, 4.2);
  inspectAnchor.y += 0.1;
  // albümün kapağı kameraya dönük dursun
  const m = new THREE.Matrix4().lookAt(inspectAnchor, camera.position, new THREE.Vector3(0,1,0));
  inspectQuat.setFromRotationMatrix(m);
  inspectQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0)));
  ui.ctaName.textContent = group.userData.album.name;
  setTimeout(()=> setHidden(ui.cta, false), 500);
  // diğer albümleri karart
  spot1.intensity = 30;
}

function backFromInspect(){
  state = STATE.DESK;
  setHidden(ui.cta, true);
  setHidden(ui.back, true);
  setHidden(ui.brand, false);
  setHidden(ui.hint, false);
  spot1.intensity = 90;
  selected = null;
}

let bookGroup = null;        // açık albüm (sayfalı) grubu
let leaves = [];
let flipped = 0;
let wallGroup = null;

function enterAlbum(group){
  state = STATE.ALBUM;
  setHidden(ui.cta, true);
  // inceleme kitabını yerine geri ışınla (gizli kalacak)
  group.position.copy(group.userData.home.pos);
  group.rotation.copy(group.userData.home.rot);
  deskGroup.visible = false;
  spot1.intensity = 0; spot2.intensity = 0;

  buildAlbum(group.userData.album);
  setPose(POSE.album);
  albumSpot.intensity = 60; albumFill.intensity = 8;
  setHidden(ui.bookUI, false);
  updateCounter();
}

function backToDesk(){
  // albüm temizle
  if(bookGroup){ scene.remove(bookGroup); disposeGroup(bookGroup); bookGroup = null; }
  if(wallGroup){ scene.remove(wallGroup); disposeGroup(wallGroup); wallGroup = null; }
  leaves = []; flipped = 0;
  albumSpot.intensity = 0; albumFill.intensity = 0;
  deskGroup.visible = true;
  spot1.intensity = 90; spot2.intensity = 70;
  setHidden(ui.bookUI, true);
  setHidden(ui.back, true);
  setHidden(ui.brand, false);
  setHidden(ui.hint, false);
  setPose(POSE.desk);
  state = STATE.DESK;
  selected = null;
}

/* ESC / geri */
addEventListener("keydown", e => {
  if(e.key === "Escape"){
    if(state === STATE.ALBUM) backToDesk();
    else if(state === STATE.INSPECT) backFromInspect();
  }
});
ui.back.addEventListener("click", () => {
  if(state === STATE.ALBUM) backToDesk();
  else if(state === STATE.INSPECT) backFromInspect();
});
ui.prev.addEventListener("click", e => { e.stopPropagation(); prevPage(); });
ui.next.addEventListener("click", e => { e.stopPropagation(); nextPage(); });

/* ===========================================================
   ALBÜM İÇİ — açık kitap + 3D sayfa çevirme
   =========================================================== */
const PAGE_W = 1.9, PAGE_H = 2.5, PAGE_ASPECT = PAGE_W / PAGE_H;

function buildAlbum(album){
  bookGroup = new THREE.Group();
  bookGroup.position.set(0, 0.15, 0);
  bookGroup.rotation.x = -0.18;          // hafif geriye yatık
  scene.add(bookGroup);

  // Alan Wake tarzı arka duvar
  wallGroup = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 20),
    new THREE.MeshStandardMaterial({ map:wallTexture(), roughness:1 })
  );
  wall.position.set(0, 0, -3.4);
  wallGroup.add(wall);
  scene.add(wallGroup);

  // arka kapak (gövde)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_W*2 + 0.16, PAGE_H + 0.14, 0.18),
    new THREE.MeshStandardMaterial({ color:album.color || 0x222, roughness:0.7 })
  );
  body.position.z = -0.12;
  body.castShadow = true; body.receiveShadow = true;
  bookGroup.add(body);

  // yüzler: [kapak] + fotoğraflar (+ çift sayı için boş)
  const faces = [{ type:"cover", album }];
  (album.photos || []).forEach(file => {
    faces.push({ type:"photo", url:`assets/${album.folder}/${file}` });
  });
  if(faces.length === 1) faces.push({ type:"empty" });  // hiç foto yoksa
  if(faces.length % 2 !== 0) faces.push({ type:"back" });

  const N = faces.length / 2;
  leaves = [];
  for(let k=0;k<N;k++){
    const leaf = new THREE.Group();          // pivot omurgada (x=0)
    const frontTex = makeFaceTexture(faces[2*k]);
    const backTex  = makeFaceTexture(faces[2*k+1], true);  // arka -> aynalı
    const fMat = new THREE.MeshStandardMaterial({ map:frontTex, roughness:0.55 });
    const bMat = new THREE.MeshStandardMaterial({ map:backTex,  roughness:0.55 });
    const edge = new THREE.MeshStandardMaterial({ color:0x0c0b09, roughness:0.9 });
    // +x,-x,+y,-y,+z(ön),-z(arka)
    const page = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.012),
      [edge, edge, edge, edge, fMat, bMat]
    );
    page.position.x = PAGE_W/2;             // omurgadan sağa doğru
    page.castShadow = true; page.receiveShadow = true;
    leaf.add(page);
    leaf.userData = { angle:0, target:0, index:k };
    bookGroup.add(leaf);
    leaves.push(leaf);
  }
  flipped = 0;
  layoutLeaves(true);
}

/* Bir yüz için doku üret (fotoğraf -> mat içinde sığdırılmış) */
function makeFaceTexture(face, mirror=false){
  const W = 760, H = Math.round(W / PAGE_ASPECT);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  function paper(){
    x.fillStyle = "#13110c";
    x.fillRect(0,0,W,H);
    for(let i=0;i<3000;i++){ x.fillStyle = `rgba(0,0,0,${Math.random()*0.12})`; x.fillRect(Math.random()*W, Math.random()*H, 1.5, 1.5); }
  }

  if(!face || face.type === "back" || face.type === "empty"){
    paper();
    x.strokeStyle = "rgba(217,164,65,.18)"; x.lineWidth = 2; x.strokeRect(30,30,W-60,H-60);
  } else if(face.type === "cover"){
    // iç kapak / başlık sayfası
    paper();
    x.fillStyle = "rgba(232,226,212,.92)"; x.textAlign = "center";
    x.font = "600 46px Oswald, sans-serif";
    x.fillText(face.album.name.toUpperCase(), W/2, H/2 - 10);
    x.font = "20px 'Special Elite', monospace"; x.fillStyle = "rgba(217,164,65,.8)";
    x.fillText("— ARŞİV —", W/2, H/2 + 36);
  } else {
    paper();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if(mirror){ tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }

  // fotoğrafı asenkron yükle ve mat içine "contain" çiz
  if(face && face.type === "photo"){
    const img = new Image();
    img.onload = () => {
      paper();
      // çerçeve
      const pad = 46;
      const innerW = W - pad*2, innerH = H - pad*2;
      const ar = img.width / img.height;
      let dw = innerW, dh = innerW / ar;
      if(dh > innerH){ dh = innerH; dw = innerH * ar; }
      const dx = (W - dw)/2, dy = (H - dh)/2;
      // gölge + foto
      x.save();
      x.shadowColor = "rgba(0,0,0,.7)"; x.shadowBlur = 22; x.shadowOffsetY = 8;
      x.fillStyle = "#000"; x.fillRect(dx, dy, dw, dh);
      x.restore();
      x.drawImage(img, dx, dy, dw, dh);
      x.strokeStyle = "rgba(217,164,65,.5)"; x.lineWidth = 2;
      x.strokeRect(dx, dy, dw, dh);
      tex.needsUpdate = true;
    };
    img.onerror = () => {
      paper();
      x.fillStyle = "rgba(180,60,60,.8)"; x.textAlign = "center";
      x.font = "22px 'Special Elite', monospace";
      x.fillText("görsel bulunamadı", W/2, H/2);
      x.font = "15px 'Special Elite', monospace"; x.fillStyle = "rgba(140,134,120,.5)";
      x.fillText(face.url, W/2, H/2 + 30);
      tex.needsUpdate = true;
    };
    img.src = face.url;
  }
  return tex;
}

function layoutLeaves(snap=false){
  const N = leaves.length;
  leaves.forEach((leaf, i) => {
    const isFlipped = i < flipped;
    leaf.userData.target = isFlipped ? -Math.PI : 0;
    if(snap){ leaf.userData.angle = leaf.userData.target; leaf.rotation.y = leaf.userData.angle; }
    // z istifleme
    let z;
    if(isFlipped) z = 0.02 * (i + 1);          // sol istif (en son çevrilen üstte)
    else          z = 0.02 * (N - i);          // sağ istif (sıradaki üstte)
    leaf.position.z = z;
  });
}

function nextPage(){
  if(flipped >= leaves.length) return;
  flipped++;
  layoutLeaves();
  updateCounter();
}
function prevPage(){
  if(flipped <= 0) return;
  flipped--;
  layoutLeaves();
  updateCounter();
}
function updateCounter(){
  const total = leaves.length + 1;
  ui.counter.textContent = `${flipped + 1} / ${total}`;
  ui.prev.disabled = flipped <= 0;
  ui.next.disabled = flipped >= leaves.length;
}

/* ===========================================================
   YARDIMCILAR
   =========================================================== */
function setHidden(el, hide){ el.classList.toggle("hidden", hide); }

function disposeGroup(g){
  g.traverse(o => {
    if(o.geometry) o.geometry.dispose();
    if(o.material){
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { if(m.map) m.map.dispose(); m.dispose(); });
    }
  });
}

/* ===========================================================
   ANİMASYON DÖNGÜSÜ
   =========================================================== */
const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 6);   // yumuşatma katsayısı

  /* --- DESK: hover & spot takibi --- */
  if(state === STATE.DESK){
    raycaster.setFromCamera(pointer, camera);
    const meshes = books.map(b => b.userData.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    const newHover = hits.length ? hits[0].object.userData.group : null;

    if(newHover !== hovered){
      hovered = newHover;
      outline.selectedObjects = hovered ? [hovered] : [];
      if(hovered){
        ui.label.textContent = hovered.userData.album.name;
        setHidden(ui.label, false);
        cursor.style.width = "44px"; cursor.style.height = "44px";
        cursor.style.marginLeft = "-22px"; cursor.style.marginTop = "-22px";
        cursor.style.background = "rgba(217,164,65,.08)";
      } else {
        setHidden(ui.label, true);
        cursor.style.width = "22px"; cursor.style.height = "22px";
        cursor.style.marginLeft = "-11px"; cursor.style.marginTop = "-11px";
        cursor.style.background = "transparent";
      }
    }

    // Spot 2 hedefi: hover varsa albüme, yoksa imlecin masadaki izdüşümüne
    const t2 = spot2.target.position;
    if(hovered){
      t2.lerp(hovered.position, k);
      spot2.intensity += (110 - spot2.intensity) * k;
      spot2.angle += (Math.PI/16 - spot2.angle) * k;
    } else {
      const pt = new THREE.Vector3();
      raycaster.ray.intersectPlane(deskPlane, pt);
      if(pt) t2.lerp(pt, k);
      spot2.intensity += (70 - spot2.intensity) * k;
      spot2.angle += (Math.PI/12 - spot2.angle) * k;
    }
    spot2.target.updateMatrixWorld();

    // hover edilen albümü hafifçe kaldır
    books.forEach(b => {
      const lift = (b === hovered) ? 0.5 : 0;
      b.position.y += (0.18 + lift - b.position.y) * k;
    });

    // hafif parallax
    camPos.copy(POSE.desk.pos);
    camPos.x += pointer.x * 0.6;
    camPos.y += pointer.y * 0.3;
  }

  /* --- INSPECT: albümü ekrana getir --- */
  if(state === STATE.INSPECT && selected){
    selected.position.lerp(inspectAnchor, k);
    selected.quaternion.slerp(inspectQuat, k);
    // hafif salınım
    selected.position.y = inspectAnchor.y + Math.sin(clock.elapsedTime * 1.3) * 0.04;
  }

  /* --- ALBUM: sayfa açılarını yumuşat --- */
  if(state === STATE.ALBUM){
    leaves.forEach(leaf => {
      leaf.userData.angle += (leaf.userData.target - leaf.userData.angle) * (1 - Math.exp(-dt*8));
      leaf.rotation.y = leaf.userData.angle;
      // çevrilirken öne çıkar
      const mid = Math.abs(leaf.userData.angle + Math.PI/2) < Math.PI/2 - 0.05 &&
                  Math.abs(leaf.userData.target - leaf.userData.angle) > 0.01;
      if(mid) leaf.position.z = 0.5;
    });
  }

  /* --- Kamera yumuşak geçiş --- */
  camera.position.lerp(camPos, k);
  curLook.lerp(camLook, k);
  camera.lookAt(curLook);

  // toz hareketi
  if(deskGroup.visible){
    const pos = dust.geometry.attributes.position;
    for(let i=0;i<dustN;i++){
      let y = pos.getY(i) + dt * 0.08;
      if(y > 7.4) y = 0.2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    dust.rotation.y += dt * 0.02;
  }

  composer.render();
}

/* ===========================================================
   BAŞLAT
   =========================================================== */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

function start(){
  state = STATE.DESK;
  ui.loader.classList.add("gone");
  setHidden(ui.hint, false);
  ui.hint.textContent = "bir albümün üzerine gel · incelemek için tıkla";
}

animate();
// fontların yüklenmesini bekle, sonra sahneye gir
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(() => setTimeout(start, 600));
} else {
  setTimeout(start, 900);
}
