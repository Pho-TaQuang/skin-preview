import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPhoneModel } from './phone.js';
import { TextureManager } from './texture.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); // Default dark background

// Add realistic studio lighting environment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;

// Lights
// Minimal ambient and directional lights just to fill some dark spots.
// RoomEnvironment handles 95% of realistic lighting and reflections.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(100, 100, 150);
scene.add(dirLight);

// --- Phone Model ---
const { phoneGroup, skinMaterial } = createPhoneModel();
scene.add(phoneGroup);

// --- Texture Manager ---
const textureManager = new TextureManager((texture) => {
  skinMaterial.map = texture;
  skinMaterial.needsUpdate = true;
  skinMaterial.opacity = 1.0; 
  skinMaterial.transparent = false;
});

// --- UI Interaction ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) textureManager.handleImageDrop(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    textureManager.handleImageDrop(e.dataTransfer.files[0]);
  }
});

// --- UI Toggle ---
const uiPanel = document.getElementById('ui-panel');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');

// Hide open settings button initially because panel is open
openSettingsBtn.classList.add('hidden');

openSettingsBtn.addEventListener('click', () => {
  uiPanel.classList.remove('hidden');
  openSettingsBtn.classList.add('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  uiPanel.classList.add('hidden');
  openSettingsBtn.classList.remove('hidden');
});

// Controls
const scaleEl = document.getElementById('scale');
const offsetXEl = document.getElementById('offset-x');
const offsetYEl = document.getElementById('offset-y');
const scaleNum = document.getElementById('scale-num');
const offsetXNum = document.getElementById('offset-x-num');
const offsetYNum = document.getElementById('offset-y-num');
const fitRadios = document.querySelectorAll('input[name="fit"]');

const updateParams = (source) => {
  // Sync sliders and number inputs based on who triggered the update
  if (source === 'range') {
    scaleNum.value = parseFloat(scaleEl.value).toFixed(2);
    offsetXNum.value = parseFloat(offsetXEl.value).toFixed(2);
    offsetYNum.value = parseFloat(offsetYEl.value).toFixed(2);
  } else if (source === 'number') {
    scaleEl.value = parseFloat(scaleNum.value);
    offsetXEl.value = parseFloat(offsetXNum.value);
    offsetYEl.value = parseFloat(offsetYNum.value);
  }

  textureManager.updateParams({
    fit: document.querySelector('input[name="fit"]:checked').value,
    scale: parseFloat(scaleEl.value),
    offsetX: parseFloat(offsetXEl.value),
    offsetY: parseFloat(offsetYEl.value)
  });
};

scaleEl.addEventListener('input', () => updateParams('range'));
offsetXEl.addEventListener('input', () => updateParams('range'));
offsetYEl.addEventListener('input', () => updateParams('range'));

scaleNum.addEventListener('input', () => updateParams('number'));
offsetXNum.addEventListener('input', () => updateParams('number'));
offsetYNum.addEventListener('input', () => updateParams('number'));

fitRadios.forEach(r => r.addEventListener('change', () => updateParams('range')));

// Procedural Bump Maps
function generateNoiseBumpMap() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
      const val = Math.random() * 255; 
      data[i] = val;
      data[i+1] = val;
      data[i+2] = val;
      data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); 
  return texture;
}

function generateLeatherBumpMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, size, size);
  
  // Draw organic blobs for leather grain - high contrast
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 5 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw dark crevices - high contrast
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); // More repetition so grains are smaller but high contrast
  return texture;
}

const noiseBumpMap = generateNoiseBumpMap();
const leatherBumpMap = generateLeatherBumpMap();

// Skin Finish Toggle
const skinFinishSelect = document.getElementById('skin-finish');
skinFinishSelect.addEventListener('change', (e) => {
  const type = e.target.value;
  if (type === 'glossy') {
    skinMaterial.roughness = 0.1;
    skinMaterial.metalness = 0.1;
    skinMaterial.clearcoat = 1.0;
    skinMaterial.clearcoatRoughness = 0.1;
    skinMaterial.bumpMap = null;
  } else if (type === 'matte') {
    skinMaterial.roughness = 0.8;
    skinMaterial.metalness = 0.05;
    skinMaterial.clearcoat = 0.0;
    skinMaterial.bumpMap = noiseBumpMap;
    skinMaterial.bumpScale = 0.08; // Stronger grainy texture
  } else if (type === 'leather') {
    skinMaterial.roughness = 0.7;
    skinMaterial.metalness = 0.1;
    skinMaterial.clearcoat = 0.1;
    skinMaterial.clearcoatRoughness = 0.5;
    skinMaterial.bumpMap = leatherBumpMap;
    skinMaterial.bumpScale = 0.5; // Very strong leather grain
  }
  skinMaterial.needsUpdate = true;
});

// Trigger change immediately to apply default (Matte)
skinFinishSelect.dispatchEvent(new Event('change'));

document.getElementById('reset-image').addEventListener('click', () => {
  scaleEl.value = 1;
  offsetXEl.value = 0;
  offsetYEl.value = 0;
  document.querySelector('input[name="fit"][value="cover"]').checked = true;
  updateParams('range');
});

// Theme Toggle
const themeBtn = document.getElementById('toggle-theme');
let isLightMode = false;
themeBtn.addEventListener('click', () => {
  isLightMode = !isLightMode;
  if (isLightMode) {
    document.body.classList.add('light-mode');
    scene.background.setHex(0xf0f0f5);
    themeBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('light-mode');
    scene.background.setHex(0x0a0a0a);
    themeBtn.textContent = '🌙';
  }
});

// Camera Views (Phone back is at +Z)
const dist = 300;
const views = {
  front: { x: 0, y: 0, z: -dist }, 
  back: { x: 0, y: 0, z: dist }, // Default view should be back to see the skin
  left: { x: -dist, y: 0, z: 0 },
  right: { x: dist, y: 0, z: 0 },
  top: { x: 0, y: dist, z: 0 },
  bottom: { x: 0, y: -dist, z: 0 },
  '3d': { x: dist * 0.7, y: dist * 0.5, z: dist * 0.7 }
};

const setCameraView = (viewName) => {
  const pos = views[viewName];
  if (pos) {
    camera.position.set(pos.x, pos.y, pos.z);
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

document.querySelectorAll('.camera-views button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setCameraView(e.target.dataset.view);
  });
});

document.getElementById('reset-camera').addEventListener('click', () => {
  setCameraView('3d');
});

// Initial camera position (looking at the back where the skin is)
setCameraView('3d');

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
