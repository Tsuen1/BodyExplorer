import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBody, highlightMaterial, selectedMaterial, boneMaterial } from './bodyBuilder.js';
import { MUSCLE_GROUPS } from './muscleData.js';
import { COLOR_LABELS, TYPE_LABELS, getChineseMuscleInfo } from './zhTerms.js';

// ───────────── Highlight Colors ─────────────
// 8 preset colors for user-assigned part highlighting

const HIGHLIGHT_COLORS = [
  { name: 'Red',    hex: '#e74c3c' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Yellow', hex: '#f1c40f' },
  { name: 'Green',  hex: '#2ecc71' },
  { name: 'Cyan',   hex: '#1abc9c' },
  { name: 'Blue',   hex: '#3498db' },
  { name: 'Purple', hex: '#9b59b6' },
  { name: 'Pink',   hex: '#e91e90' },
];

// Pre-create a MeshStandardMaterial for each highlight color (reusable)
const highlightColorMaterials = HIGHLIGHT_COLORS.map((c) => {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.hex),
    roughness: 0.4,
    metalness: 0.0,
    emissive: new THREE.Color(c.hex).multiplyScalar(0.15),
    side: THREE.DoubleSide,
    flatShading: false,
  });
});

// ───────────── Scene Setup ─────────────

const canvas = document.getElementById('canvas3d');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 5, 35);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 100;
controls.target.set(0, 5, 0);
controls.enableZoom = false; // we handle zoom ourselves
controls.update();

// ───────────── Cursor-directed Zoom ─────────────
// Zooms toward the 3D point under the cursor instead of the orbit center.

const zoomRaycaster = new THREE.Raycaster();
const zoomMouse = new THREE.Vector2();

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();

  // Normalize scroll delta across browsers
  const delta = -Math.sign(event.deltaY);
  const zoomSpeed = 0.04;

  // Current distance from camera to orbit target
  const offset = camera.position.clone().sub(controls.target);
  const dist = offset.length();

  // Don't zoom past limits
  if (delta > 0 && dist <= controls.minDistance) return;
  if (delta < 0 && dist >= controls.maxDistance) return;

  // Raycast from cursor into the scene
  zoomMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  zoomMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  zoomRaycaster.setFromCamera(zoomMouse, camera);

  // Try to find a 3D hit point under the cursor
  let hitPoint = null;
  const allTargets = [...muscleMeshes];
  if (skeletonGroup) {
    skeletonGroup.traverse((child) => {
      if (child.isMesh && child.visible) allTargets.push(child);
    });
  }
  const intersects = zoomRaycaster.intersectObjects(allTargets, false);
  if (intersects.length > 0) {
    hitPoint = intersects[0].point.clone();
  }

  // Zoom factor
  const factor = 1 - delta * zoomSpeed;
  const newDist = THREE.MathUtils.clamp(dist * factor, controls.minDistance, controls.maxDistance);

  if (hitPoint && delta > 0) {
    // Zooming in: shift orbit target toward the cursor hit point
    const shiftStrength = 0.15;
    controls.target.lerp(hitPoint, shiftStrength);
  }

  // Move camera along the offset direction
  offset.normalize().multiplyScalar(newDist);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}, { passive: false });

// ───────────── Lighting ─────────────

const ambientLight = new THREE.AmbientLight(0x8088a0, 1.4);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffeedd, 1.8);
keyLight.position.set(10, 20, 15);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 60;
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 30;
keyLight.shadow.camera.bottom = -20;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9999dd, 1.0);
fillLight.position.set(-10, 10, -10);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff6666, 0.5);
rimLight.position.set(0, 5, -20);
scene.add(rimLight);

const bottomLight = new THREE.DirectionalLight(0x778899, 0.6);
bottomLight.position.set(0, -10, 5);
scene.add(bottomLight);

// Hemisphere light for natural feel
const hemiLight = new THREE.HemisphereLight(0xbbddff, 0x553333, 0.8);
scene.add(hemiLight);

// Front fill light to ensure muscles facing camera are well-lit
const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
frontLight.position.set(0, 10, 20);
scene.add(frontLight);

// ───────────── Ground Grid ─────────────

const gridHelper = new THREE.GridHelper(60, 30, 0x333355, 0x222244);
gridHelper.position.y = -16;
scene.add(gridHelper);

// Ground plane for shadows
const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -16;
ground.receiveShadow = true;
scene.add(ground);

// ───────────── Loading Overlay ─────────────

const loadingOverlay = document.getElementById('loading-overlay');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');

function updateLoadingProgress(pct) {
  if (loadingBar) loadingBar.style.width = `${pct}%`;
  if (loadingText) loadingText.textContent = `正在加载解剖模型... ${pct}%`;
}

function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
  }
}

// ───────────── Shared State ─────────────
// These are populated asynchronously after GLB loads
let muscleMeshes = [];
let skeletonGroup = null;
let bodyGroup = null;

// Computed camera framing — updated after model loads
let defaultCameraPos = new THREE.Vector3(0, 5, 35);
let defaultLookAt = new THREE.Vector3(0, 5, 0);

// Manually hidden parts
const hiddenMeshes = new Set();

// ───────────── Raycasting & Interaction ─────────────

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh = null;
let selectedMesh = null;
let focusedMesh = null;

canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('click', onClick);

function onMouseMove(event) {
  if (muscleMeshes.length === 0) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const visibleMeshes = muscleMeshes.filter(m => m.visible);
  const intersects = raycaster.intersectObjects(visibleMeshes, false);

  // Unhover previous
  if (hoveredMesh && hoveredMesh !== selectedMesh) {
    resetMeshAppearance(hoveredMesh);
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    if (mesh !== selectedMesh) {
      hoveredMesh = mesh;
      highlightMesh(mesh, 0.3);
    }
    canvas.style.cursor = 'pointer';
  } else {
    hoveredMesh = null;
    canvas.style.cursor = 'default';
  }
}

function onClick(event) {
  if (muscleMeshes.length === 0) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const visibleMeshes = muscleMeshes.filter(m => m.visible);
  const intersects = raycaster.intersectObjects(visibleMeshes, false);

  // Deselect previous
  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    selectMesh(mesh);
    showInfoPanel(mesh.userData);
  } else {
    hideInfoPanel();
  }
}

function selectMesh(mesh, options = {}) {
  if (selectedMesh && selectedMesh !== mesh) {
    resetMeshAppearance(selectedMesh);
  }

  selectedMesh = mesh;
  selectedMesh.visible = true;
  highlightMesh(mesh, 0.6);

  if (options.focus) {
    focusOnMesh(mesh);
  } else {
    updateFocusButtons();
  }
}

function highlightMesh(mesh, intensity) {
  // Swap to highlight or selected material (intensity > 0.5 = selected)
  if (intensity > 0.5) {
    mesh.material = selectedMaterial;
  } else {
    mesh.material = highlightMaterial;
  }
}

function resetMeshAppearance(mesh) {
  // If mesh has a custom highlight color, restore that; otherwise restore the group material
  if (mesh.userData.customMaterial) {
    mesh.material = mesh.userData.customMaterial;
  } else if (mesh.userData.originalMaterial) {
    mesh.material = mesh.userData.originalMaterial;
  }
}

// ───────────── Info Panel ─────────────

const infoPanel = document.getElementById('info-panel');
const infoName = document.getElementById('info-name');
const infoType = document.getElementById('info-type');
const infoDetails = document.getElementById('info-details');
const infoClose = document.getElementById('info-close');

infoClose.addEventListener('click', () => {
  hideInfoPanel();
  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }
});

function showInfoPanel(userData) {
  const data = userData.muscleData;
  const info = data.info;
  const zhInfo = getChineseMuscleInfo(data.rawName);

  infoName.textContent = userData.displayName;
  infoType.textContent = TYPE_LABELS[data.type] || data.type;
  infoType.className = `badge ${data.type}`;

  let html = '';
  html += `<p><strong>英文原名：</strong> ${escapeHTML(data.englishName || userData.englishName || data.rawName)}</p>`;
  html += `<p><strong>分类：</strong> ${escapeHTML(MUSCLE_GROUPS[data.group]?.label || data.group)}</p>`;

  if (data.type === 'muscle') {
    html += `<p><strong>起点：</strong> ${formatAnatomyDetail(zhInfo?.origin, info.origin)}</p>`;
    html += `<p><strong>止点：</strong> ${formatAnatomyDetail(zhInfo?.insertion, info.insertion)}</p>`;
    html += `<p><strong>主要作用：</strong> ${formatAnatomyDetail(zhInfo?.action, info.action)}</p>`;
    if (info.innervation) {
      html += `<p><strong>神经支配：</strong> ${formatAnatomyDetail(zhInfo?.innervation, info.innervation)}</p>`;
    }
  } else {
    html += `<p><strong>起始 / 来源：</strong> ${formatAnatomyDetail(zhInfo?.origin, info.origin)}</p>`;
    html += `<p><strong>止点 / 附着：</strong> ${formatAnatomyDetail(zhInfo?.insertion, info.insertion)}</p>`;
    html += `<p><strong>功能：</strong> ${formatAnatomyDetail(zhInfo?.action, info.action)}</p>`;
    if (info.notes) {
      html += `<p><strong>备注：</strong> ${formatAnatomyDetail(zhInfo?.notes, info.notes)}</p>`;
    }
  }

  infoDetails.innerHTML = html;

  // Build external reference links
  const infoLinks = document.getElementById('info-links');
  infoLinks.innerHTML = '';
  const searchTerm = getAnatomySearchTerm(data.rawName);
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, '_'))}_muscle`;
  const wikiSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchTerm + ' muscle anatomy')}`;
  const kenHubUrl = `https://www.kenhub.com/en/search?q=${encodeURIComponent(searchTerm)}`;

  const wikiLink = document.createElement('a');
  wikiLink.href = wikiSearchUrl;
  wikiLink.target = '_blank';
  wikiLink.rel = 'noopener noreferrer';
  wikiLink.textContent = '英文资料：Wikipedia';
  infoLinks.appendChild(wikiLink);

  const kenHubLink = document.createElement('a');
  kenHubLink.href = kenHubUrl;
  kenHubLink.target = '_blank';
  kenHubLink.rel = 'noopener noreferrer';
  kenHubLink.textContent = '英文资料：Kenhub';
  infoLinks.appendChild(kenHubLink);

  infoPanel.classList.remove('hidden');

  // Update color picker swatch active states
  updateColorSwatchStates();
  updateFocusButtons();
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAnatomyDetail(zhValue, englishValue) {
  if (zhValue) return escapeHTML(zhValue);
  if (!englishValue || englishValue === 'See anatomical references') {
    return '暂无中文说明';
  }
  return `<span class="source-text">待补充中文；英文原文：${escapeHTML(englishValue)}</span>`;
}

/**
 * Extract a clean anatomical search term from the raw BP3D mesh name.
 * Strips left/right, part qualifiers, and duplicate numbers.
 * e.g. "abdominal part of left pectoralis major" -> "pectoralis major"
 * e.g. "left gluteus maximus" -> "gluteus maximus"
 * e.g. "left calcaneal tendon" -> "calcaneal tendon"
 */
function getAnatomySearchTerm(rawName) {
  let term = rawName.toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, '')            // remove (2), (3) etc
    .replace(/_/g, ' ')
    .replace(/\b(left|right)\b/g, '')          // remove left/right
    .replace(/\b\w+\s+part\s+of\s+/g, '')     // "abdominal part of" -> ""
    .replace(/\b\w+\s+head\s+of\s+/g, '')     // "long head of" -> ""
    .replace(/\b\w+\s+belly\s+of\s+/g, '')    // "anterior belly of" -> ""
    .replace(/\bset\s+of\b/g, '')              // "set of" -> ""
    .replace(/\s+/g, ' ')
    .trim();
  return term;
}

function hideInfoPanel() {
  infoPanel.classList.add('hidden');
}

// ───────────── Color Highlight Picker ─────────────

const colorSwatches = document.getElementById('color-swatches');
const btnClearColor = document.getElementById('btn-clear-color');

// Build swatch buttons once
HIGHLIGHT_COLORS.forEach((color, index) => {
  const swatch = document.createElement('div');
  swatch.className = 'color-swatch';
  swatch.style.backgroundColor = color.hex;
  swatch.title = COLOR_LABELS[color.name] || color.name;
  swatch.dataset.colorIndex = index;

  swatch.addEventListener('click', () => {
    if (!selectedMesh) return;
    // Assign this highlight color material to the selected mesh
    selectedMesh.userData.customMaterial = highlightColorMaterials[index];
    selectedMesh.userData.customColorIndex = index;
    selectedMesh.material = highlightColorMaterials[index];
    updateColorSwatchStates();
  });

  colorSwatches.appendChild(swatch);
});

btnClearColor.addEventListener('click', () => {
  if (!selectedMesh) return;
  // Remove custom color, restore to selected material (since it's still selected)
  delete selectedMesh.userData.customMaterial;
  delete selectedMesh.userData.customColorIndex;
  selectedMesh.material = selectedMaterial;
  updateColorSwatchStates();
});

function updateColorSwatchStates() {
  const swatches = colorSwatches.querySelectorAll('.color-swatch');
  swatches.forEach((swatch) => {
    const idx = parseInt(swatch.dataset.colorIndex, 10);
    if (selectedMesh && selectedMesh.userData.customColorIndex === idx) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });
}

// ───────────── Hide / Show Parts ─────────────

const btnHidePart = document.getElementById('btn-hide-part');
const btnFocusPart = document.getElementById('btn-focus-part');
const btnClearFocus = document.getElementById('btn-clear-focus');
const hiddenPanel = document.getElementById('hidden-panel');
const hiddenCountSpan = document.getElementById('hidden-count');
const hiddenList = document.getElementById('hidden-list');
const btnShowAll = document.getElementById('btn-show-all');

function focusOnMesh(mesh, options = {}) {
  focusedMesh = mesh;
  hiddenMeshes.delete(mesh);
  mesh.visible = true;
  updateMuscleVisibility();
  highlightMesh(mesh, 0.6);
  if (options.view !== 'keep') {
    moveCameraToFocusedMesh(mesh);
  }
  updateFocusButtons();
}

function moveCameraToFocusedMesh(mesh) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.localToWorld(center);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = Math.max(maxDim * 5, 14);

  const view = getPreferredFocusView(mesh);
  const sideSign = center.x >= 0 ? 1 : -1;
  let targetPos;

  if (view === 'front') {
    targetPos = new THREE.Vector3(center.x, center.y + 0.35, center.z + dist);
  } else if (view === 'side') {
    targetPos = new THREE.Vector3(center.x + sideSign * dist, center.y + 0.35, center.z);
  } else if (view === 'posterolateral') {
    targetPos = new THREE.Vector3(center.x + sideSign * dist * 0.75, center.y + 0.35, center.z - dist * 0.75);
  } else {
    targetPos = new THREE.Vector3(center.x, center.y + 0.35, center.z - dist);
  }

  animateCamera(targetPos, center, 900);
}

function getPreferredFocusView(mesh) {
  const data = mesh.userData.muscleData;
  const rawName = (data?.rawName || '').toLowerCase().replace(/_/g, ' ');
  const group = data?.group;

  const posteriorKeywords = [
    'multifidus', 'erector', 'iliocostalis', 'longissimus', 'spinalis',
    'semispinalis', 'splenius', 'rotatores', 'interspinalis', 'intertransversarii',
    'quadratus lumborum', 'thoracolumbar fascia', 'trapezius', 'rhomboid',
    'latissimus dorsi', 'serratus posterior', 'gluteus', 'piriformis',
    'coccygeus', 'iliococcygeus', 'pubococcygeus', 'puborectalis',
    'biceps femoris', 'semitendinosus', 'semimembranosus', 'gastrocnemius',
    'soleus', 'plantaris',
  ];

  const anteriorKeywords = [
    'sternocleidomastoid', 'longus capitis', 'longus colli', 'pectoralis',
    'serratus anterior', 'rectus abdominis', 'transversus abdominis',
    'external oblique', 'internal oblique', 'diaphragm', 'iliacus', 'psoas',
    'rectus femoris', 'vastus', 'adductor', 'pectineus', 'sartorius',
    'tibialis anterior', 'extensor digitorum longus', 'extensor hallucis',
  ];

  const sideKeywords = [
    'scalenus', 'levator scapulae', 'deltoid', 'supraspinatus', 'infraspinatus',
    'subscapularis', 'teres major', 'teres minor', 'tensor fasciae latae',
    'iliotibial tract', 'gluteus medius', 'gluteus minimus', 'fibularis',
  ];

  if (sideKeywords.some((keyword) => rawName.includes(keyword))) return 'side';
  if (posteriorKeywords.some((keyword) => rawName.includes(keyword))) return 'back';
  if (anteriorKeywords.some((keyword) => rawName.includes(keyword))) return 'front';

  if (group === 'BACK') return 'back';
  if (group === 'CHEST' || group === 'ABDOMEN' || group === 'TRUNK') return 'front';
  if (group === 'HIP' || group === 'SHOULDER') return 'posterolateral';
  if (group === 'UPPER_ARM' || group === 'FOREARM' || group === 'UPPER_LEG' || group === 'LOWER_LEG') return 'side';

  return 'back';
}

function clearFocus() {
  focusedMesh = null;
  updateMuscleVisibility();
  if (selectedMesh) highlightMesh(selectedMesh, 0.6);
  updateFocusButtons();
}

function updateFocusButtons() {
  if (!btnFocusPart || !btnClearFocus) return;

  if (selectedMesh) {
    btnFocusPart.disabled = focusedMesh === selectedMesh;
    btnFocusPart.textContent = focusedMesh === selectedMesh ? '正在聚焦此结构' : '仅显示此结构';
  }

  btnClearFocus.classList.toggle('hidden', !focusedMesh);
}

function updateHiddenUI() {
  hiddenCountSpan.textContent = hiddenMeshes.size;
  if (hiddenMeshes.size > 0) {
    hiddenPanel.classList.remove('hidden');
  } else {
    hiddenPanel.classList.add('hidden');
  }

  // Rebuild the list
  hiddenList.innerHTML = '';
  for (const mesh of hiddenMeshes) {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'hidden-part-name';
    nameSpan.textContent = mesh.userData.displayName;
    nameSpan.title = mesh.userData.displayName;
    li.appendChild(nameSpan);

    const btn = document.createElement('button');
    btn.textContent = '显示';
    btn.addEventListener('click', () => {
      hiddenMeshes.delete(mesh);
      updateMuscleVisibility();
      updateHiddenUI();
    });
    li.appendChild(btn);

    hiddenList.appendChild(li);
  }
}

btnHidePart.addEventListener('click', () => {
  if (!selectedMesh) return;

  if (focusedMesh === selectedMesh) focusedMesh = null;
  hiddenMeshes.add(selectedMesh);
  selectedMesh.visible = false;
  resetMeshAppearance(selectedMesh);
  selectedMesh = null;
  hideInfoPanel();
  updateHiddenUI();
});

btnFocusPart.addEventListener('click', () => {
  if (!selectedMesh) return;
  focusOnMesh(selectedMesh);
});

btnClearFocus.addEventListener('click', () => {
  clearFocus();
});

btnShowAll.addEventListener('click', () => {
  hiddenMeshes.clear();
  focusedMesh = null;
  updateMuscleVisibility();
  updateHiddenUI();
  updateFocusButtons();
});

// ───────────── Lumbar / Back Layer Peel ─────────────

const LAYER_PEEL_STEPS = [
  {
    label: '完整腰背',
    description: '显示腰背相关的浅层、中层、深层肌肉和胸腰筋膜。',
  },
  {
    label: '去掉浅层',
    description: '隐藏斜方肌、背阔肌、臀大肌等浅层大肌肉，查看中深层结构。',
  },
  {
    label: '进入深层',
    description: '保留深层背肌、腰方肌、髋后深层肌和胸腰筋膜。',
  },
  {
    label: '深层稳定肌',
    description: '聚焦多裂肌、回旋肌、棘间肌、横突间肌等脊柱深层稳定肌。',
  },
  {
    label: '胸腰筋膜',
    description: '仅显示胸腰筋膜相关层次，配合骨骼观察腰背力传递通道。',
  },
];

const toggleLayerPeel = document.getElementById('toggle-layer-peel');
const layerPeelSlider = document.getElementById('layer-peel-slider');
const layerPeelLabel = document.getElementById('layer-peel-label');
const layerPeelDescription = document.getElementById('layer-peel-description');

function isLayerPeelEnabled() {
  return Boolean(toggleLayerPeel?.checked);
}

function getLayerPeelStep() {
  return Number(layerPeelSlider?.value || 0);
}

function updateLayerPeelUI() {
  const enabled = isLayerPeelEnabled();
  const step = getLayerPeelStep();
  const config = LAYER_PEEL_STEPS[step] || LAYER_PEEL_STEPS[0];

  layerPeelSlider.disabled = !enabled;
  layerPeelLabel.textContent = config.label;
  layerPeelDescription.textContent = enabled
    ? config.description
    : '显示腰背相关结构，用滑块逐步去掉外层。';
}

function getLayerPeelClass(mesh) {
  const rawName = (mesh.userData.muscleData?.rawName || '').toLowerCase().replace(/_/g, ' ');

  if (rawName.includes('thoracolumbar fascia')) return 4;

  if (rawName.includes('multifidus') ||
      rawName.includes('rotatores') ||
      rawName.includes('interspinalis') ||
      rawName.includes('intertransversarii') ||
      rawName.includes('rectus capitis posterior') ||
      rawName.includes('quadratus lumborum') ||
      rawName.includes('piriformis') ||
      rawName.includes('obturator') ||
      rawName.includes('gemellus') ||
      rawName.includes('quadratus femoris')) {
    return 3;
  }

  if (rawName.includes('semispinalis') ||
      rawName.includes('iliocostalis') ||
      rawName.includes('longissimus') ||
      rawName.includes('spinalis') ||
      rawName.includes('splenius') ||
      rawName.includes('levator scapulae') ||
      rawName.includes('gluteus medius') ||
      rawName.includes('gluteus minimus')) {
    return 2;
  }

  if (rawName.includes('trapezius') ||
      rawName.includes('latissimus dorsi') ||
      rawName.includes('rhomboid') ||
      rawName.includes('serratus posterior') ||
      rawName.includes('gluteus maximus')) {
    return 1;
  }

  return 0;
}

function shouldShowForLayerPeel(mesh) {
  const layerClass = getLayerPeelClass(mesh);
  const step = getLayerPeelStep();

  if (!layerClass) return false;
  if (step === 0) return layerClass >= 1;
  if (step === 1) return layerClass >= 2;
  if (step === 2) return layerClass >= 3;
  if (step === 3) return layerClass === 3;
  if (step === 4) return layerClass === 4;

  return layerClass >= 1;
}

function moveCameraToLayerPeelView() {
  const dist = defaultCameraPos.distanceTo(defaultLookAt);
  animateCamera(
    new THREE.Vector3(defaultLookAt.x, defaultLookAt.y, defaultLookAt.z - dist),
    defaultLookAt.clone(), 800
  );
}

toggleLayerPeel.addEventListener('change', () => {
  if (isLayerPeelEnabled()) {
    focusedMesh = null;
    if (selectedMesh) {
      resetMeshAppearance(selectedMesh);
      selectedMesh = null;
      hideInfoPanel();
    }
    moveCameraToLayerPeelView();
  }

  updateLayerPeelUI();
  updateFocusButtons();
  updateMuscleVisibility();
});

layerPeelSlider.addEventListener('input', () => {
  updateLayerPeelUI();
  updateMuscleVisibility();
});

updateLayerPeelUI();

// ───────────── Pain Records ─────────────

const PAIN_RECORD_STORAGE_KEY = 'easton-pain-records-v1';
let painRecords = [];
let linkedPainMesh = null;

const painForm = document.getElementById('pain-form');
const painDate = document.getElementById('pain-date');
const painSide = document.getElementById('pain-side');
const painRegion = document.getElementById('pain-region');
const painScore = document.getElementById('pain-score');
const painScoreValue = document.getElementById('pain-score-value');
const painTrigger = document.getElementById('pain-trigger');
const painTreatment = document.getElementById('pain-treatment');
const painChange = document.getElementById('pain-change');
const painNote = document.getElementById('pain-note');
const painLinkedStructure = document.getElementById('pain-linked-structure');
const painSaveStatus = document.getElementById('pain-save-status');
const btnLinkSelected = document.getElementById('btn-link-selected');
const btnClearPainForm = document.getElementById('btn-clear-pain-form');
const painRecordCount = document.getElementById('pain-record-count');
const painRecordList = document.getElementById('pain-record-list');
const btnExportPainCsv = document.getElementById('btn-export-pain-csv');
const btnExportPainJson = document.getElementById('btn-export-pain-json');
const painExportStatus = document.getElementById('pain-export-status');

function getTodayISODate() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function loadPainRecords() {
  try {
    const raw = localStorage.getItem(PAIN_RECORD_STORAGE_KEY);
    painRecords = raw ? JSON.parse(raw) : [];
  } catch {
    painRecords = [];
  }
}

function persistPainRecords() {
  localStorage.setItem(PAIN_RECORD_STORAGE_KEY, JSON.stringify(painRecords));
}

function updatePainLinkedStructure(mesh) {
  linkedPainMesh = mesh || null;

  if (linkedPainMesh) {
    painLinkedStructure.textContent = linkedPainMesh.userData.displayName;
    painLinkedStructure.title = linkedPainMesh.userData.englishName || linkedPainMesh.userData.displayName;
    painLinkedStructure.classList.add('linked');
  } else {
    painLinkedStructure.textContent = '未关联解剖结构';
    painLinkedStructure.removeAttribute('title');
    painLinkedStructure.classList.remove('linked');
  }
}

function resetPainForm() {
  painForm.reset();
  painDate.value = getTodayISODate();
  painScore.value = 5;
  painScoreValue.textContent = '5';
  painSaveStatus.textContent = '';
  updatePainLinkedStructure(null);
}

function getLinkedStructurePayload() {
  if (!linkedPainMesh) return null;

  return {
    name: linkedPainMesh.userData.displayName,
    englishName: linkedPainMesh.userData.englishName || '',
    rawName: linkedPainMesh.userData.muscleData?.rawName || '',
    group: linkedPainMesh.userData.muscleData?.group || '',
  };
}

function getPainRecordPayload() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    date: painDate.value || getTodayISODate(),
    side: painSide.value,
    region: painRegion.value,
    score: Number(painScore.value),
    trigger: painTrigger.value.trim(),
    treatment: painTreatment.value,
    change: painChange.value.trim(),
    note: painNote.value.trim(),
    structure: getLinkedStructurePayload(),
  };
}

function updatePainExportControls() {
  const hasRecords = painRecords.length > 0;
  btnExportPainCsv.disabled = !hasRecords;
  btnExportPainJson.disabled = !hasRecords;

  if (!hasRecords) {
    painExportStatus.textContent = '';
  }
}

function renderPainRecords() {
  painRecordCount.textContent = painRecords.length;
  painRecordList.innerHTML = '';
  updatePainExportControls();

  if (painRecords.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'pain-record-empty';
    empty.textContent = '暂无记录';
    painRecordList.appendChild(empty);
    return;
  }

  for (const record of painRecords) {
    const item = document.createElement('li');
    item.className = 'pain-record-item';

    const title = document.createElement('div');
    title.className = 'pain-record-title';

    const titleText = document.createElement('span');
    titleText.textContent = `${record.date}｜${record.region}｜${record.score}/10`;
    title.appendChild(titleText);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'pain-record-delete';
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.dataset.recordId = record.id;
    title.appendChild(deleteButton);

    const meta = document.createElement('div');
    meta.className = 'pain-record-meta';
    const lines = [
      `${record.side}${record.structure?.name ? `｜关联：${record.structure.name}` : ''}`,
      `治疗：${record.treatment}`,
      record.trigger ? `诱发：${record.trigger}` : '',
      record.change ? `变化：${record.change}` : '',
      record.note ? `备注：${record.note}` : '',
    ].filter(Boolean);
    meta.textContent = lines.join(' / ');

    item.appendChild(title);
    item.appendChild(meta);
    painRecordList.appendChild(item);
  }
}

function getExportDateStamp() {
  return getTodayISODate().replace(/-/g, '');
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function formatPainRecordsAsCSV() {
  const headers = [
    '日期',
    '左右侧',
    '部位',
    '疼痛等级',
    '关联结构',
    '英文原名',
    '诱发动作',
    '治疗方式',
    '治疗后变化',
    '备注',
    '创建时间',
  ];
  const rows = painRecords.map((record) => [
    record.date,
    record.side,
    record.region,
    record.score,
    record.structure?.name || '',
    record.structure?.englishName || '',
    record.trigger || '',
    record.treatment || '',
    record.change || '',
    record.note || '',
    record.createdAt || '',
  ]);

  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}`;
}

function exportPainRecords(format) {
  if (painRecords.length === 0) {
    painExportStatus.textContent = '暂无记录可导出';
    return;
  }

  const filenameBase = `easton-pain-records-${getExportDateStamp()}`;

  if (format === 'json') {
    const payload = {
      app: 'Easton 疼痛解剖地图',
      exportedAt: new Date().toISOString(),
      recordCount: painRecords.length,
      records: painRecords,
    };

    downloadTextFile(
      `${filenameBase}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
    painExportStatus.textContent = '已生成 JSON 文件';
    return;
  }

  downloadTextFile(`${filenameBase}.csv`, formatPainRecordsAsCSV(), 'text/csv;charset=utf-8');
  painExportStatus.textContent = '已生成 CSV 文件';
}

function savePainRecord(event) {
  event.preventDefault();
  const record = getPainRecordPayload();
  painRecords.unshift(record);
  persistPainRecords();
  renderPainRecords();
  resetPainForm();
  painSaveStatus.textContent = '已保存到本地记录';
}

painForm.addEventListener('submit', savePainRecord);

painScore.addEventListener('input', () => {
  painScoreValue.textContent = painScore.value;
});

btnLinkSelected.addEventListener('click', () => {
  if (!selectedMesh) {
    painLinkedStructure.textContent = '请先点击或搜索一个结构';
    painLinkedStructure.classList.remove('linked');
    return;
  }
  updatePainLinkedStructure(selectedMesh);
});

btnClearPainForm.addEventListener('click', () => {
  resetPainForm();
});

btnExportPainCsv.addEventListener('click', () => {
  exportPainRecords('csv');
});

btnExportPainJson.addEventListener('click', () => {
  exportPainRecords('json');
});

painRecordList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.pain-record-delete');
  if (!deleteButton) return;

  painRecords = painRecords.filter((record) => record.id !== deleteButton.dataset.recordId);
  persistPainRecords();
  renderPainRecords();
});

loadPainRecords();
resetPainForm();
renderPainRecords();

// ───────────── UI Controls ─────────────

// Search
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = '';

  if (query.length < 2 || muscleMeshes.length === 0) return;

  const matches = muscleMeshes.filter((m) =>
    (m.userData.searchText || m.userData.displayName || '').toLowerCase().includes(query)
  );

  for (const mesh of matches.slice(0, 10)) {
    const div = document.createElement('div');
    div.className = 'search-item';
    div.textContent = mesh.userData.displayName;
    div.addEventListener('click', () => {
      // Select this muscle
      selectMesh(mesh, { focus: true });
      showInfoPanel(mesh.userData);
      searchInput.value = '';
      searchResults.innerHTML = '';

      // Focus mode already moves the camera to a posterior view.
    });
    searchResults.appendChild(div);
  }
});

function zoomToMesh(mesh) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.localToWorld(center);

  // Scale zoom distance based on mesh size
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const zoomDist = Math.max(maxDim * 3, 8);

  // Camera approaches from current viewing direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const targetPos = center.clone().sub(dir.multiplyScalar(zoomDist));

  animateCamera(targetPos, center, 1000);
}

// Muscle group filters
const filterContainer = document.getElementById('muscle-group-filters');
const activeGroups = new Set(Object.keys(MUSCLE_GROUPS));

for (const [key, group] of Object.entries(MUSCLE_GROUPS)) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn active';
  btn.textContent = group.label;
  btn.dataset.group = key;
  btn.style.borderColor = group.color;

  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    if (activeGroups.has(key)) {
      activeGroups.delete(key);
    } else {
      activeGroups.add(key);
    }
    updateMuscleVisibility();
  });

  filterContainer.appendChild(btn);
}

function updateMuscleVisibility() {
  for (const mesh of muscleMeshes) {
    if (focusedMesh) {
      mesh.visible = mesh === focusedMesh;
      continue;
    }

    if (hiddenMeshes.has(mesh)) {
      mesh.visible = false;
      continue;
    }

    if (isLayerPeelEnabled()) {
      mesh.visible = shouldShowForLayerPeel(mesh);
      continue;
    }

    const group = mesh.userData.muscleData.group;
    const isTendon = mesh.userData.muscleData.type === 'tendon';
    const tendonVisible = document.getElementById('toggle-tendons').checked;

    mesh.visible = activeGroups.has(group) && (!isTendon || tendonVisible);
  }
}

// View buttons
document.getElementById('btn-front').addEventListener('click', () => {
  const dist = defaultCameraPos.distanceTo(defaultLookAt);
  animateCamera(
    new THREE.Vector3(defaultLookAt.x, defaultLookAt.y, defaultLookAt.z + dist),
    defaultLookAt.clone(), 800
  );
});

document.getElementById('btn-back').addEventListener('click', () => {
  const dist = defaultCameraPos.distanceTo(defaultLookAt);
  animateCamera(
    new THREE.Vector3(defaultLookAt.x, defaultLookAt.y, defaultLookAt.z - dist),
    defaultLookAt.clone(), 800
  );
});

document.getElementById('btn-side').addEventListener('click', () => {
  const dist = defaultCameraPos.distanceTo(defaultLookAt);
  animateCamera(
    new THREE.Vector3(defaultLookAt.x + dist, defaultLookAt.y, defaultLookAt.z),
    defaultLookAt.clone(), 800
  );
});

document.getElementById('btn-reset').addEventListener('click', () => {
  animateCamera(defaultCameraPos.clone(), defaultLookAt.clone(), 800);
  // Reset all filters
  activeGroups.clear();
  Object.keys(MUSCLE_GROUPS).forEach((k) => activeGroups.add(k));
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.add('active'));
  document.getElementById('muscle-opacity-slider').value = 1;
  setMuscleOpacity(1);
  document.getElementById('skeleton-opacity-slider').value = 0.6;
  setSkeletonOpacity(0.6);
  toggleLayerPeel.checked = false;
  layerPeelSlider.value = 0;
  updateLayerPeelUI();
  // Restore all hidden parts
  hiddenMeshes.clear();
  focusedMesh = null;
  updateHiddenUI();
  // Clear all custom highlight colors
  for (const mesh of muscleMeshes) {
    if (mesh.userData.customMaterial) {
      delete mesh.userData.customMaterial;
      delete mesh.userData.customColorIndex;
      mesh.material = mesh.userData.originalMaterial;
    }
  }
  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }
  hideInfoPanel();
  updateMuscleVisibility();
  updateFocusButtons();
});

function animateCamera(targetPosition, lookAtTarget, duration) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function update() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Ease in-out
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    camera.position.lerpVectors(startPosition, targetPosition, ease);
    controls.target.lerpVectors(startTarget, lookAtTarget, ease);
    controls.update();

    if (t < 1) requestAnimationFrame(update);
  }
  update();
}

// Toggle skeleton
document.getElementById('toggle-skeleton').addEventListener('change', (e) => {
  if (skeletonGroup) skeletonGroup.visible = e.target.checked;
});

// Toggle tendons
document.getElementById('toggle-tendons').addEventListener('change', () => {
  updateMuscleVisibility();
});

// Muscle opacity slider
document.getElementById('muscle-opacity-slider').addEventListener('input', (e) => {
  setMuscleOpacity(parseFloat(e.target.value));
});

// Skeleton opacity slider
document.getElementById('skeleton-opacity-slider').addEventListener('input', (e) => {
  setSkeletonOpacity(parseFloat(e.target.value));
});

function setMuscleOpacity(opacity) {
  // Since materials are shared, collect unique materials and set opacity once
  const seen = new Set();
  for (const mesh of muscleMeshes) {
    const mat = mesh.userData.originalMaterial;
    if (mat && !seen.has(mat)) {
      seen.add(mat);
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      mat.depthWrite = opacity >= 1;
    }
  }
  // Also update the active highlight/selected materials if in use
  highlightMaterial.opacity = opacity;
  highlightMaterial.transparent = opacity < 1;
  highlightMaterial.depthWrite = opacity >= 1;
  selectedMaterial.opacity = opacity;
  selectedMaterial.transparent = opacity < 1;
  selectedMaterial.depthWrite = opacity >= 1;
  // Also update custom highlight color materials
  for (const mat of highlightColorMaterials) {
    mat.opacity = opacity;
    mat.transparent = opacity < 1;
    mat.depthWrite = opacity >= 1;
  }
}

function setSkeletonOpacity(opacity) {
  boneMaterial.opacity = opacity;
  boneMaterial.transparent = opacity < 1;
  // depthWrite off when transparent to avoid z-fighting
  boneMaterial.depthWrite = opacity >= 1;
}

// ───────────── Resize ─────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ───────────── Animation Loop ─────────────

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Start animation loop immediately (renders scene even while loading)
animate();

// ───────────── Load Anatomy Model (Async) ─────────────

async function initBody() {
  try {
    updateLoadingProgress(0);

    const result = await buildBody((pct) => {
      updateLoadingProgress(pct);
    });

    bodyGroup = result.bodyGroup;
    muscleMeshes = result.muscleMeshes;
    skeletonGroup = result.skeletonGroup;

    scene.add(bodyGroup);

    // Make skeleton visible by default (matches HTML checked state)
    skeletonGroup.visible = true;

    // Compute bounding box of entire body for camera adjustment
    const bodyBox = new THREE.Box3().setFromObject(bodyGroup);
    const bodyCenter = bodyBox.getCenter(new THREE.Vector3());
    const bodySize = bodyBox.getSize(new THREE.Vector3());
    console.log('Body bounding box:', bodyBox.min.toArray().map(v => v.toFixed(1)), 'to', bodyBox.max.toArray().map(v => v.toFixed(1)));
    console.log('Body center:', bodyCenter.toArray().map(v => v.toFixed(1)), 'size:', bodySize.toArray().map(v => v.toFixed(1)));

    // Adjust camera to frame the model properly
    const maxDim = Math.max(bodySize.x, bodySize.y, bodySize.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = (maxDim / 2) / Math.tan(fov / 2);
    cameraZ *= 1.3; // Add some padding

    // Adjust grid and ground to be at model's feet
    const feetY = bodyBox.min.y - 0.5;
    gridHelper.position.y = feetY;
    ground.position.y = feetY;

    // Update shadow camera to cover the model
    keyLight.shadow.camera.top = bodySize.y + 5;
    keyLight.shadow.camera.bottom = feetY;
    keyLight.shadow.camera.left = -bodySize.x;
    keyLight.shadow.camera.right = bodySize.x;
    keyLight.shadow.camera.far = maxDim * 3;
    keyLight.shadow.camera.updateProjectionMatrix();

    // Animate camera to frame the model
    const viewTarget = new THREE.Vector3(bodyCenter.x, bodyCenter.y, bodyCenter.z);
    const viewPos = new THREE.Vector3(bodyCenter.x, bodyCenter.y, bodyCenter.z + cameraZ);

    // Store computed defaults for view buttons
    defaultCameraPos = viewPos.clone();
    defaultLookAt = viewTarget.clone();

    animateCamera(viewPos, viewTarget, 1200);

    console.log(`Body Explorer: ${muscleMeshes.length} muscle/tendon meshes loaded`);

    hideLoadingOverlay();
  } catch (error) {
    console.error('Failed to load anatomy model:', error);
    if (loadingText) {
      loadingText.textContent = '解剖模型加载失败，请检查文件是否完整。';
      loadingText.style.color = '#e74c3c';
    }
  }
}

initBody();
