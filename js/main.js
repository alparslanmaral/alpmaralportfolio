/* =========================================================
   ARCHIVE — 3D photography/video portfolio
   Three.js (module). All scene + interaction here.
   ========================================================= */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass }    from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass }     from "three/addons/postprocessing/OutputPass.js";

import { ALBUMS } from "./albums.js";
import { woodTexture, wallTexture, coverTexture } from "./textures.js";

/* ----------------- States ----------------- */
const STATE = { LOADING:"loading", DESK:"desk", INSPECT:"inspect", ALBUM:"album" };
let state = STATE.LOADING;

/* ----------------- Base setup ----------------- */
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

/* Camera goals (for smooth transitions) */
const camPos  = camera.position.clone();
const camLook = new THREE.Vector3(0, 0, -0.4);
const curLook = camLook.clone();
const POSE = {
  desk:   { pos:new THREE.Vector3(0, 7, 7.4),   look:new THREE.Vector3(0, 0, -0.4) },
  album:  { pos:new THREE.Vector3(0, 0.25, 5.2), look:new THREE.Vector3(0, 0.15, 0) }
};
function setPose(p){ camPos.copy(p.pos); camLook.copy(p.look); }
setPose(POSE.desk);

/* ----------------- Lights ----------------- */
scene.add(new THREE.HemisphereLight(0x223044, 0x000000, 0.12));

// Spot 1 — fixed main light on the desk
const spot1 = new THREE.SpotLight(0xffe8c0, 90, 24, Math.PI/7, 0.5, 1.4);
spot1.position.set(-1.2, 9.5, 1.5);
spot1.target.position.set(-0.5, 0, 0);
spot1.castShadow = true;
spot1.shadow.mapSize.set(2048, 2048);
spot1.shadow.bias = -0.0006;
scene.add(spot1, spot1.target);

// Spot 2 — follows the cursor / hovered album
const spot2 = new THREE.SpotLight(0xfff1d6, 70, 22, Math.PI/12, 0.35, 1.6);
spot2.position.set(1.4, 9.2, 2.6);
spot2.target.position.set(0, 0, 0);
spot2.castShadow = true;
spot2.shadow.mapSize.set(2048, 2048);
spot2.shadow.bias = -0.0006;
scene.add(spot2, spot2.target);

// Album view light (off at start)
const albumSpot = new THREE.SpotLight(0xfff4e2, 0, 18, Math.PI/5, 0.85, 1.3);
albumSpot.position.set(0, 3.5, 5);
albumSpot.target.position.set(0, 0.1, 0);
scene.add(albumSpot, albumSpot.target);
const albumFill = new THREE.PointLight(0xbcd0ff, 0, 14);
albumFill.position.set(0, 1.5, 4);
scene.add(albumFill);

/* ----------------- Desk & room ----------------- */
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

// Dark back wall (atmosphere)
const roomWall = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 24),
  new THREE.MeshStandardMaterial({ color:0x070708, roughness:1 })
);
roomWall.position.set(0, 6, -9);
roomWall.receiveShadow = true;
deskGroup.add(roomWall);

// invisible plane for cursor->desk raycasting
const deskPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);

/* Dust particles drifting in the light beam */
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

/* ----------------- Place albums on the desk ----------------- */
const books = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-2, -2);

function layoutPositions(n){
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

  const W = 1.7, H = 2.3, T = 0.38;       // album size
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

  // BoxGeometry material order: +x,-x,+y,-y,+z,-z  -> top (+y) = cover
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

/* ----------------- Postprocessing (hover glow only) ----------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
outline.edgeStrength = 3.0;
outline.edgeGlow = 0.3;
outline.edgeThickness = 1.5;
outline.visibleEdgeColor.set(0xd9a441);
outline.hiddenEdgeColor.set(0x2a1f0c);
composer.addPass(outline);

composer.addPass(new OutputPass());

/* ----------------- Custom cursor ----------------- */
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

/* ----------------- UI references ----------------- */
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
  brand:    document.getElementById("brand"),
  pv:       document.getElementById("photo-viewer"),
  pvImg:    document.getElementById("pv-img"),
  pvFrame:  document.querySelector("#photo-viewer .pv-frame")
};

/* ----------------- Interaction state ----------------- */
let hovered = null;
let selected = null;
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
  // if a large photo is open: click closes it
  if(photoOpen){ closePhoto(); return; }

  if(state === STATE.DESK){
    if(hovered) enterInspect(hovered);
  } else if(state === STATE.INSPECT){
    enterAlbum(selected);
  } else if(state === STATE.ALBUM){
    // is there a visible photo where we clicked?
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const pages = leaves.map(l => l.children[0]);
    const hits = raycaster.intersectObjects(pages, false);
    if(hits.length){
      const leaf = hits[0].object.parent;
      // which face faces the camera? angle ~0 -> front, ~-PI -> back
      const face = Math.cos(leaf.userData.angle) >= 0 ? leaf.userData.front : leaf.userData.back;
      if(face && face.type === "photo"){ openPhoto(face.url); return; }
    }
    // no photo: left/right half -> turn page
    if(e.clientX > innerWidth/2) nextPage();
    else prevPage();
  }
}

/* ----------- Enlarged (framed) photo view ----------- */
let photoOpen = false;
function openPhoto(url){
  ui.pvImg.src = url;
  setHidden(ui.pv, false);
  // re-trigger entrance animation
  ui.pvFrame.style.animation = "none";
  void ui.pvFrame.offsetWidth;
  ui.pvFrame.style.animation = "";
  photoOpen = true;
  cursor.style.opacity = "0";
}
function closePhoto(){
  setHidden(ui.pv, true);
  photoOpen = false;
  cursor.style.opacity = "1";
}

/* ===========================================================
   STATE TRANSITIONS
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
  // compute a point in front of the camera (RE item inspect)
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  inspectAnchor.copy(camera.position).addScaledVector(dir, 4.2);
  inspectAnchor.y += 0.1;
  // cover faces the camera
  const m = new THREE.Matrix4().lookAt(inspectAnchor, camera.position, new THREE.Vector3(0,1,0));
  inspectQuat.setFromRotationMatrix(m);
  inspectQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0)));
  ui.ctaName.textContent = group.userData.album.name;
  setTimeout(()=> setHidden(ui.cta, false), 500);
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

let bookGroup = null;
let leaves = [];
let flipped = 0;
let wallGroup = null;

function enterAlbum(group){
  state = STATE.ALBUM;
  setHidden(ui.cta, true);
  // snap the inspected book back home (stays hidden)
  group.position.copy(group.userData.home.pos);
  group.rotation.copy(group.userData.home.rot);
  deskGroup.visible = false;
  spot1.intensity = 0; spot2.intensity = 0;

  buildAlbum(group.userData.album);
  setPose(POSE.album);
  albumSpot.intensity = 45; albumFill.intensity = 10;
  setHidden(ui.bookUI, false);
  updateCounter();
}

function backToDesk(){
  if(photoOpen) closePhoto();
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

/* ESC / back */
addEventListener("keydown", e => {
  if(e.key === "Escape"){
    if(photoOpen) closePhoto();
    else if(state === STATE.ALBUM) backToDesk();
    else if(state === STATE.INSPECT) backFromInspect();
  }
  if(state === STATE.ALBUM && !photoOpen){
    if(e.key === "ArrowRight") nextPage();
    if(e.key === "ArrowLeft")  prevPage();
  }
});
ui.back.addEventListener("click", () => {
  if(state === STATE.ALBUM) backToDesk();
  else if(state === STATE.INSPECT) backFromInspect();
});
ui.prev.addEventListener("click", e => { e.stopPropagation(); prevPage(); });
ui.next.addEventListener("click", e => { e.stopPropagation(); nextPage(); });

/* ===========================================================
   INSIDE ALBUM — open book + 3D page flipping
   =========================================================== */
const PAGE_W = 1.9, PAGE_H = 2.5, PAGE_ASPECT = PAGE_W / PAGE_H;

function buildAlbum(album){
  bookGroup = new THREE.Group();
  bookGroup.position.set(0, 0.15, 0);
  bookGroup.rotation.x = -0.18;          // slightly tilted back
  scene.add(bookGroup);

  // Alan Wake style back wall
  wallGroup = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 20),
    new THREE.MeshStandardMaterial({ map:wallTexture(), roughness:1 })
  );
  wall.position.set(0, 0, -3.4);
  wallGroup.add(wall);
  scene.add(wallGroup);

  // back cover (body)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_W*2 + 0.16, PAGE_H + 0.14, 0.18),
    new THREE.MeshStandardMaterial({ color:album.color || 0x222, roughness:1, metalness:0 })
  );
  body.position.z = -0.12;
  body.castShadow = true; body.receiveShadow = true;
  bookGroup.add(body);

  // faces: [cover] + photos (+ blank to make it even)
  const faces = [{ type:"cover", album }];
  (album.photos || []).forEach(file => {
    faces.push({ type:"photo", url:`assets/${album.folder}/${file}` });
  });
  if(faces.length === 1) faces.push({ type:"empty" });  // no photos
  if(faces.length % 2 !== 0) faces.push({ type:"back" });

  const N = faces.length / 2;
  leaves = [];
  for(let k=0;k<N;k++){
    const leaf = new THREE.Group();          // pivot at spine (x=0)
    const front = faces[2*k], back = faces[2*k+1];
    const frontTex = makeFaceTexture(front);
    const backTex  = makeFaceTexture(back, true);  // back -> mirrored
    // MATTE paper: roughness 1, metalness 0 -> no light reflection
    const fMat = new THREE.MeshStandardMaterial({ map:frontTex, roughness:1, metalness:0 });
    const bMat = new THREE.MeshStandardMaterial({ map:backTex,  roughness:1, metalness:0 });
    const edge = new THREE.MeshStandardMaterial({ color:0x0c0b09, roughness:1, metalness:0 });
    // +x,-x,+y,-y,+z(front),-z(back)
    const page = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.012),
      [edge, edge, edge, edge, fMat, bMat]
    );
    page.position.x = PAGE_W/2;             // extend right from spine
    page.castShadow = true; page.receiveShadow = true;
    leaf.add(page);
    leaf.userData = { angle:0, target:0, index:k, front, back };
    bookGroup.add(leaf);
    leaves.push(leaf);
  }
  flipped = 0;
  layoutLeaves(true);
}

/* Build a texture for a face (photo -> contained in a mat) */
function makeFaceTexture(face, mirror=false){
  const W = 1100, H = Math.round(W / PAGE_ASPECT);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  function paper(){
    x.fillStyle = "#13110c";
    x.fillRect(0,0,W,H);
    for(let i=0;i<6000;i++){ x.fillStyle = `rgba(0,0,0,${Math.random()*0.12})`; x.fillRect(Math.random()*W, Math.random()*H, 1.5, 1.5); }
  }

  if(!face || face.type === "back" || face.type === "empty"){
    paper();
    x.strokeStyle = "rgba(217,164,65,.18)"; x.lineWidth = 3; x.strokeRect(44,44,W-88,H-88);
  } else if(face.type === "cover"){
    paper();
    x.fillStyle = "rgba(232,226,212,.92)"; x.textAlign = "center";
    x.font = "600 66px Oswald, sans-serif";
    x.fillText(face.album.name.toUpperCase(), W/2, H/2 - 14);
    x.font = "30px 'Special Elite', monospace"; x.fillStyle = "rgba(217,164,65,.8)";
    x.fillText("— ARCHIVE —", W/2, H/2 + 52);
  } else {
    paper();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if(mirror){ tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }

  // load photo async and draw "contain" inside the mat
  if(face && face.type === "photo"){
    const img = new Image();
    img.onload = () => {
      paper();
      const pad = Math.round(W * 0.06);
      const innerW = W - pad*2, innerH = H - pad*2;
      const ar = img.width / img.height;
      let dw = innerW, dh = innerW / ar;
      if(dh > innerH){ dh = innerH; dw = innerH * ar; }
      const dx = (W - dw)/2, dy = (H - dh)/2;
      x.save();
      x.shadowColor = "rgba(0,0,0,.7)"; x.shadowBlur = 30; x.shadowOffsetY = 10;
      x.fillStyle = "#000"; x.fillRect(dx, dy, dw, dh);
      x.restore();
      x.drawImage(img, dx, dy, dw, dh);
      x.strokeStyle = "rgba(217,164,65,.5)"; x.lineWidth = 3;
      x.strokeRect(dx, dy, dw, dh);
      tex.needsUpdate = true;
    };
    img.onerror = () => {
      paper();
      x.fillStyle = "rgba(180,60,60,.85)"; x.textAlign = "center";
      x.font = "32px 'Special Elite', monospace";
      x.fillText("image not found", W/2, H/2);
      x.font = "20px 'Special Elite', monospace"; x.fillStyle = "rgba(140,134,120,.5)";
      x.fillText(face.url, W/2, H/2 + 40);
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
    let z;
    if(isFlipped) z = 0.02 * (i + 1);          // left stack
    else          z = 0.02 * (N - i);          // right stack
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
   HELPERS
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
   ANIMATION LOOP
   =========================================================== */
const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 6);

  /* --- DESK: hover & spotlight follow --- */
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

    books.forEach(b => {
      const lift = (b === hovered) ? 0.5 : 0;
      b.position.y += (0.18 + lift - b.position.y) * k;
    });

    camPos.copy(POSE.desk.pos);
    camPos.x += pointer.x * 0.6;
    camPos.y += pointer.y * 0.3;
  }

  /* --- INSPECT: bring album to screen --- */
  if(state === STATE.INSPECT && selected){
    selected.position.lerp(inspectAnchor, k);
    selected.quaternion.slerp(inspectQuat, k);
    selected.position.y = inspectAnchor.y + Math.sin(clock.elapsedTime * 1.3) * 0.04;
  }

  /* --- ALBUM: smooth page angles --- */
  if(state === STATE.ALBUM){
    leaves.forEach(leaf => {
      leaf.userData.angle += (leaf.userData.target - leaf.userData.angle) * (1 - Math.exp(-dt*8));
      leaf.rotation.y = leaf.userData.angle;
      const mid = Math.abs(leaf.userData.angle + Math.PI/2) < Math.PI/2 - 0.05 &&
                  Math.abs(leaf.userData.target - leaf.userData.angle) > 0.01;
      if(mid) leaf.position.z = 0.5;
    });
  }

  /* --- Camera smooth transition --- */
  camera.position.lerp(camPos, k);
  curLook.lerp(camLook, k);
  camera.lookAt(curLook);

  // dust movement
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
   START
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
  ui.hint.textContent = "hover an album · click to inspect";
}

animate();
// wait for fonts, then enter the scene
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(() => setTimeout(start, 600));
} else {
  setTimeout(start, 900);
}