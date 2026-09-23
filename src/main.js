import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPhoneModel } from './phone.js';
import { TextureManager } from './texture.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 100, 150);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight2.position.set(-100, -100, -150);
scene.add(dirLight2);

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

document.getElementById('reset-image').addEventListener('click', () => {
  scaleEl.value = 1;
  offsetXEl.value = 0;
  offsetYEl.value = 0;
  document.querySelector('input[name="fit"][value="cover"]').checked = true;
  updateParams('range');
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
