import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBody, highlightMaterial, selectedMaterial, boneMaterial } from './bodyBuilder.js';
import {
  loadHighPrecisionModels,
  highPrecisionBoneMaterial,
  highPrecisionFocusMaterial,
  highPrecisionReferenceMaterial,
} from './highPrecisionModels.js';
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
let highPrecisionModels = null;
let highPrecisionGroup = null;
let highPrecisionMeshes = [];
const painMarkerGroup = new THREE.Group();
scene.add(painMarkerGroup);

const painMarkerGeometry = new THREE.SphereGeometry(0.22, 24, 16);
let painMarkerMeshes = [];

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
let activePainRecordId = null;
let activeMechanismTopicId = null;
let activePainAreaId = null;
let activeNeckDetailId = null;
let activeHighPrecisionMode = 'full';

canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('click', onClick);

function getVisibleInteractiveMeshes() {
  const visibleMuscles = muscleMeshes.filter((mesh) => mesh.visible);
  const visibleHighPrecisionMeshes = isHighPrecisionEnabled()
    ? highPrecisionMeshes.filter((mesh) => mesh.visible)
    : [];
  return [...visibleMuscles, ...visibleHighPrecisionMeshes];
}

function onMouseMove(event) {
  if (muscleMeshes.length === 0) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const markerIntersects = raycaster.intersectObjects(getVisiblePainMarkers(), false);
  const visibleMeshes = getVisibleInteractiveMeshes();
  const intersects = raycaster.intersectObjects(visibleMeshes, false);

  // Unhover previous
  if (hoveredMesh && hoveredMesh !== selectedMesh) {
    resetMeshAppearance(hoveredMesh);
  }

  if (markerIntersects.length > 0) {
    hoveredMesh = null;
    canvas.style.cursor = 'pointer';
  } else if (intersects.length > 0) {
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
  const markerIntersects = raycaster.intersectObjects(getVisiblePainMarkers(), false);
  const visibleMeshes = getVisibleInteractiveMeshes();
  const intersects = raycaster.intersectObjects(visibleMeshes, false);

  // Deselect previous
  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }

  if (markerIntersects.length > 0) {
    hideInfoPanel();
    selectPainMarker(markerIntersects[0].object, { moveCamera: false });
  } else if (intersects.length > 0) {
    const mesh = intersects[0].object;
    selectMesh(mesh);
    showInfoPanel(mesh.userData);
  } else {
    hideInfoPanel();
    hidePainDetailPanel();
    hideMechanismDetailPanel();
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
  hidePainDetailPanel();
  hideMechanismDetailPanel();

  const data = userData.muscleData;
  const info = data.info || {};
  const zhInfo = getChineseMuscleInfo(data.rawName);
  const isBone = data.type === 'bone';

  infoName.textContent = userData.displayName;
  infoType.textContent = TYPE_LABELS[data.type] || data.type;
  infoType.className = `badge ${data.type}`;

  let html = '';
  html += `<p><strong>英文原名：</strong> ${escapeHTML(data.englishName || userData.englishName || data.rawName)}</p>`;
  html += `<p><strong>分类：</strong> ${escapeHTML(isBone ? '高精度骨骼模型' : MUSCLE_GROUPS[data.group]?.label || data.group)}</p>`;

  if (isBone) {
    html += `<p><strong>来源：</strong> ${escapeHTML(info.source || 'Open3DModel')}</p>`;
    html += `<p><strong>授权：</strong> ${escapeHTML(info.license || 'Creative Commons Attribution-ShareAlike 4.0')}</p>`;
    html += `<p><strong>用途：</strong> ${escapeHTML(info.notes || '用于解剖学习和医患沟通，不替代诊断。')}</p>`;
  } else if (data.type === 'muscle') {
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
  const wikiSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchTerm + (isBone ? ' bone anatomy' : ' muscle anatomy'))}`;
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

  if (isBone && userData.highPrecisionSource?.url) {
    const sourceLink = document.createElement('a');
    sourceLink.href = userData.highPrecisionSource.url;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = '模型来源：Open3DModel';
    infoLinks.appendChild(sourceLink);
  }

  infoPanel.classList.remove('hidden');

  const colorPicker = document.getElementById('info-color-picker');
  if (colorPicker) colorPicker.style.display = isBone ? 'none' : '';
  if (btnHidePart) btnHidePart.style.display = isBone ? 'none' : '';

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
    .replace(/\.[rl]$/, '')                   // remove Open3DModel right/left suffix
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
  updateHighPrecisionVisibility();
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
    clearMechanismTopic();
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

// ───────────── High Precision Model Trial (v0.10) ─────────────

const HIGH_PRECISION_MODES = [
  {
    id: 'full',
    label: '全身骨骼',
    view: 'front',
    roles: ['skeleton'],
    description: '显示 Open3DModel 备用高精度全身骨骼；用于对比观察，不替代原始骨骼与肌肉系统。',
  },
  {
    id: 'lumbar-pelvis',
    label: '腰骶重点',
    view: 'back',
    roles: ['skeleton'],
    keywords: ['lumbar vertebrae', 'sacrum', 'coccyx', 'hip bone'],
    description: '突出腰椎、骶骨、尾骨和髋骨，便于观察腰部与骶髂区域。',
  },
  {
    id: 'cervical',
    label: '颈椎重点',
    view: 'back',
    roles: ['skeleton'],
    keywords: ['atlas', 'axis', 'cervical vertebrae', 'occipital bone'],
    description: '突出枕骨、寰椎、枢椎和颈椎，便于观察枕后与后颈部。',
  },
  {
    id: 'vertebrae-reference',
    label: '典型椎骨',
    view: 'front',
    roles: ['reference'],
    description: '显示 3 块独立典型椎骨参考模型，用于解释颈椎、胸椎、腰椎形态差异，不代表完整脊柱。',
  },
];

const toggleHighPrecision = document.getElementById('toggle-high-precision');
const highPrecisionButtons = document.getElementById('high-precision-buttons');
const highPrecisionStatus = document.getElementById('high-precision-status');

function getActiveHighPrecisionMode() {
  return HIGH_PRECISION_MODES.find((mode) => mode.id === activeHighPrecisionMode) || HIGH_PRECISION_MODES[0];
}

function isHighPrecisionEnabled() {
  return Boolean(toggleHighPrecision?.checked && highPrecisionGroup && document.getElementById('toggle-skeleton')?.checked);
}

function getHighPrecisionRawName(mesh) {
  return (mesh.userData.muscleData?.rawName || '').toLowerCase().replace(/_/g, ' ');
}

function meshMatchesHighPrecisionMode(mesh, mode) {
  if (!mode.roles.includes(mesh.userData.highPrecisionRole)) return false;
  if (!mode.keywords) return true;

  const rawName = getHighPrecisionRawName(mesh);
  return mode.keywords.some((keyword) => rawName.includes(keyword));
}

function getHighPrecisionModeMeshes(mode = getActiveHighPrecisionMode()) {
  return highPrecisionMeshes.filter((mesh) => meshMatchesHighPrecisionMode(mesh, mode));
}

function renderHighPrecisionButtons() {
  if (!highPrecisionButtons) return;
  highPrecisionButtons.innerHTML = '';

  for (const mode of HIGH_PRECISION_MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'high-precision-btn';
    button.textContent = mode.label;
    button.dataset.modeId = mode.id;
    button.disabled = true;
    button.addEventListener('click', () => {
      activateHighPrecisionMode(mode.id);
    });
    highPrecisionButtons.appendChild(button);
  }

  updateHighPrecisionButtons();
}

function updateHighPrecisionButtons() {
  if (!highPrecisionButtons) return;

  highPrecisionButtons.querySelectorAll('.high-precision-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.modeId === activeHighPrecisionMode);
    button.disabled = !highPrecisionGroup;
  });
}

function updateHighPrecisionStatus() {
  if (!highPrecisionStatus) return;

  if (!highPrecisionGroup) {
    highPrecisionStatus.textContent = '备用高精度骨骼正在后台加载，加载完成后可用于对比。';
    return;
  }

  if (!document.getElementById('toggle-skeleton')?.checked) {
    highPrecisionStatus.textContent = '骨骼显示已关闭；打开“显示骨骼”后可使用备用高精度层。';
    return;
  }

  if (!toggleHighPrecision?.checked) {
    highPrecisionStatus.textContent = '当前使用原始骨骼和肌肉；备用高精度骨骼默认隐藏。';
    return;
  }

  const mode = getActiveHighPrecisionMode();
  const count = highPrecisionMeshes.filter((mesh) => mesh.visible).length;
  highPrecisionStatus.textContent = `${mode.label}：显示 ${count} 个 Open3DModel 备用高精度结构；原始骨骼已临时隐藏，肌肉仍使用原模型。`;
}

function getHighPrecisionMaterial(mesh, mode) {
  if (mesh.userData.highPrecisionRole === 'reference') return highPrecisionReferenceMaterial;
  if (mode.id !== 'full' && meshMatchesHighPrecisionMode(mesh, mode)) return highPrecisionFocusMaterial;
  return highPrecisionBoneMaterial;
}

function updateHighPrecisionVisibility() {
  const skeletonChecked = Boolean(document.getElementById('toggle-skeleton')?.checked);
  const enabled = isHighPrecisionEnabled();

  if (skeletonGroup) {
    skeletonGroup.visible = skeletonChecked && !enabled;
  }

  if (!highPrecisionGroup) {
    updateHighPrecisionStatus();
    return;
  }

  const mode = getActiveHighPrecisionMode();
  const focusedHighPrecisionMesh = highPrecisionMeshes.includes(focusedMesh);
  highPrecisionGroup.visible = enabled;

  for (const mesh of highPrecisionMeshes) {
    if (!enabled) {
      mesh.visible = false;
      continue;
    }

    if (focusedHighPrecisionMesh) {
      mesh.visible = mesh === focusedMesh;
    } else {
      mesh.visible = !hiddenMeshes.has(mesh) && meshMatchesHighPrecisionMode(mesh, mode);
    }

    if (mesh !== selectedMesh) {
      mesh.material = getHighPrecisionMaterial(mesh, mode);
    }
  }

  updateHighPrecisionStatus();
}

function activateHighPrecisionMode(modeId) {
  const mode = HIGH_PRECISION_MODES.find((item) => item.id === modeId);
  if (!mode) return;

  activeHighPrecisionMode = mode.id;
  if (toggleHighPrecision) toggleHighPrecision.checked = true;

  if (focusedMesh && highPrecisionMeshes.includes(focusedMesh)) {
    focusedMesh = null;
  }

  updateHighPrecisionButtons();
  updateHighPrecisionVisibility();
  moveCameraToHighPrecisionMode(mode);
}

function moveCameraToHighPrecisionMode(mode) {
  const meshes = getHighPrecisionModeMeshes(mode);
  if (!meshes.length) {
    animateCamera(defaultCameraPos.clone(), defaultLookAt.clone(), 800);
    return;
  }

  const box = new THREE.Box3();
  for (const mesh of meshes) {
    box.expandByObject(mesh);
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const baseDist = defaultCameraPos.distanceTo(defaultLookAt);
  const dist = Math.max(size.length() * 1.55, baseDist * 0.36, 8);
  let cameraPos;

  if (mode.view === 'back') {
    cameraPos = new THREE.Vector3(center.x, center.y + 0.5, center.z - dist);
  } else {
    cameraPos = new THREE.Vector3(center.x, center.y + 0.5, center.z + dist);
  }

  animateCamera(cameraPos, center, 900);
}

function alignHighPrecisionGroupToBody(targetBox) {
  if (!highPrecisionGroup || !highPrecisionModels?.skeletonGroup) return;

  highPrecisionGroup.visible = true;
  highPrecisionGroup.updateMatrixWorld(true);
  const sourceBox = new THREE.Box3().setFromObject(highPrecisionModels.skeletonGroup);
  const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const targetCenter = targetBox.getCenter(new THREE.Vector3());
  const targetSize = targetBox.getSize(new THREE.Vector3());
  const scale = targetSize.y / sourceSize.y;

  highPrecisionGroup.scale.setScalar(scale);
  highPrecisionGroup.position.set(
    targetCenter.x - sourceCenter.x * scale,
    targetCenter.y - sourceCenter.y * scale,
    targetCenter.z - sourceCenter.z * scale
  );
  highPrecisionGroup.updateMatrixWorld(true);
  highPrecisionGroup.visible = false;
}

async function initHighPrecisionModels(targetBox) {
  updateHighPrecisionStatus();

  try {
    const models = await loadHighPrecisionModels();
    highPrecisionModels = models;
    highPrecisionGroup = models.highPrecisionGroup;
    highPrecisionMeshes = models.meshes;
    alignHighPrecisionGroupToBody(targetBox);
    scene.add(highPrecisionGroup);
    updateHighPrecisionButtons();
    updateHighPrecisionVisibility();
    console.log(`Open3DModel v0.10: ${highPrecisionMeshes.length} high precision structures loaded`);
  } catch (error) {
    console.error('Failed to load high precision models:', error);
    if (highPrecisionStatus) {
      highPrecisionStatus.textContent = '备用高精度模型加载失败；原始骨骼和肌肉仍可正常使用。';
    }
  }
}

if (toggleHighPrecision) {
  toggleHighPrecision.addEventListener('change', () => {
    updateHighPrecisionVisibility();
    if (toggleHighPrecision.checked && highPrecisionGroup) {
      moveCameraToHighPrecisionMode(getActiveHighPrecisionMode());
    }
  });
}

renderHighPrecisionButtons();

// ───────────── Pain Mechanism Topics ─────────────

const EASTON_PAIN_AREAS = [
  {
    id: 'occipital-neck-pain',
    label: '枕后 / 后颈',
    badge: '头颈疼痛区域',
    view: 'back',
    keywords: [
      'rectus capitis posterior',
      'semispinalis capitis',
      'semispinalis cervicis',
      'splenius capitis',
      'splenius cervicis',
      'levator scapulae',
      'trapezius',
      'sternocleidomastoid',
      'scalenus',
    ],
    sections: [
      {
        title: '疼痛入口',
        text: '用于观察 Easton 的枕后、枕下区和后颈部疼痛。重点不是单一肌肉，而是上颈椎、枕骨下方、颈后深层肌和肩颈交界区域的整体关系。',
      },
      {
        title: '相关结构',
        text: '重点包括枕下肌群、半棘肌、夹肌、肩胛提肌、斜方肌上部和胸锁乳突肌等。长时间低头学习、头前伸姿势或颈部保护性紧张时，可作为医患沟通入口。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '如果脊柱侧弯伴随头颈代偿，应记录头部是否偏移、肩胛高度是否不对称、颈部哪侧更紧。具体矫正方向需由施罗斯治疗师根据弯型确认。',
      },
    ],
  },
  {
    id: 'lumbar-pain',
    label: '腰部',
    badge: '腰背疼痛区域',
    view: 'back',
    keywords: [
      'multifidus',
      'erector',
      'iliocostalis',
      'longissimus',
      'spinalis',
      'quadratus lumborum',
      'psoas major',
      'thoracolumbar fascia',
      'internal oblique',
      'transversus abdominis',
    ],
    sections: [
      {
        title: '疼痛入口',
        text: '用于观察 Easton 的腰部疼痛，尤其是久坐、弯腰、坐站转换、运动后疲劳时出现的腰背不适。',
      },
      {
        title: '相关结构',
        text: '重点包括多裂肌、竖脊肌群、腰方肌、腰大肌、腹横肌/腹内斜肌和胸腰筋膜。它们共同参与腰椎稳定、骨盆控制和腰背力传递。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '可记录腰弯凸侧/凹侧、骨盆是否偏移、腰部哪侧更紧、施罗斯训练后腰痛是否改变。不要自行按压深层腰大肌，需由专业人员评估。',
      },
    ],
  },
  {
    id: 'sacroiliac-pain',
    label: '骶髂部',
    badge: '骨盆环疼痛区域',
    view: 'posterolateral',
    keywords: [
      'gluteus maximus',
      'gluteus medius',
      'gluteus minimus',
      'piriformis',
      'obturator',
      'gemellus',
      'quadratus femoris',
      'coccygeus',
      'iliococcygeus',
      'pubococcygeus',
      'thoracolumbar fascia',
    ],
    sections: [
      {
        title: '疼痛入口',
        text: '用于观察 Easton 的骶髂部、骶骨旁、髂后上棘附近或臀深部疼痛。这个区域常需要区分腰椎、骶髂关节、髋部和臀深层结构的影响。',
      },
      {
        title: '相关结构',
        text: '重点包括臀大肌、臀中肌、臀小肌、梨状肌、闭孔肌、孖肌、股方肌、骨盆底相关肌和胸腰筋膜。骶髂区域稳定依赖关节形态、韧带和周围肌群协同。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '可记录单腿站立、上下楼、跑跳、翻身、坐站转换是否诱发骶髂不适。若存在骨盆旋转或侧移，施罗斯治疗师的骨盆校正方向应作为记录重点。',
      },
    ],
  },
  {
    id: 'deep-stability-pain',
    label: '深层稳定肌',
    badge: '稳定控制区域',
    view: 'back',
    keywords: [
      'multifidus',
      'rotatores',
      'interspinalis',
      'intertransversarii',
      'thoracolumbar fascia',
      'transversus abdominis',
      'internal oblique',
      'quadratus lumborum',
      'psoas major',
    ],
    sections: [
      {
        title: '疼痛入口',
        text: '用于把“深层稳定肌相关”的模糊疼痛记录转成可观察结构。它适合记录腰背不稳感、运动后疲劳、姿势保持困难或治疗师提到的深层控制问题。',
      },
      {
        title: '相关结构',
        text: '重点包括多裂肌、回旋肌、棘间肌、横突间肌、腹横肌、腹内斜肌、腰方肌、腰大肌和胸腰筋膜。它们共同参与腰椎和骨盆的动态稳定。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '施罗斯训练中的轴向延展、去旋转、凹侧呼吸和保持校正姿势，都需要稳定控制参与。此处可记录训练前后疼痛、疲劳和姿势保持能力变化。',
      },
    ],
  },
];

const NECK_DETAIL_LAYERS = [
  {
    id: 'suboccipital-deep',
    label: '枕下深层',
    badge: '上颈深层控制',
    view: 'back',
    keywords: [
      'rectus capitis posterior',
      'rectus capitis anterior',
      'rectus capitis lateralis',
      'semispinalis capitis',
    ],
    sections: [
      {
        title: '观察重点',
        text: '枕下深层位于枕骨下方和上颈椎附近，适合观察枕后痛、头颈交界处紧张和上颈椎小范围控制。',
      },
      {
        title: '机制提示',
        text: '枕下区域肌肉体积小，但和头颈位置感、轻微伸展与旋转控制有关。长时间低头、头前伸或颈部保护性紧张时，可作为医生查体和沟通重点。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '记录头是否前伸、偏向某侧，枕后哪侧更紧，施罗斯训练中的轴向延展后枕后痛是否改变。具体矫正方向应由治疗师确认。',
      },
    ],
  },
  {
    id: 'posterior-neck-extensors',
    label: '颈后伸肌',
    badge: '颈后支撑链',
    view: 'back',
    keywords: [
      'semispinalis capitis',
      'semispinalis cervicis',
      'splenius capitis',
      'splenius cervicis',
      'multifidus cervicis',
      'trapezius',
    ],
    sections: [
      {
        title: '观察重点',
        text: '颈后伸肌连接头颈、颈胸交界和肩背区域，适合观察后颈部疼痛、低头学习后疲劳和颈背连接处紧张。',
      },
      {
        title: '机制提示',
        text: '颈后肌群既参与头颈伸展和旋转，也承担姿势保持。若胸椎姿势、肩胛位置或脊柱侧弯代偿改变，颈后肌群负荷可能增加。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '可记录训练前后头颈是否更容易保持中立位，后颈疼痛是否随胸廓去旋转、轴向延展或肩胛位置变化而改变。',
      },
    ],
  },
  {
    id: 'neck-shoulder-link',
    label: '肩颈连接',
    badge: '肩胛-颈椎协同',
    view: 'posterolateral',
    keywords: [
      'levator scapulae',
      'trapezius',
      'rhomboid',
      'splenius cervicis',
      'scalenus',
    ],
    sections: [
      {
        title: '观察重点',
        text: '肩颈连接层用于观察肩胛提肌、斜方肌和菱形肌等结构，帮助理解后颈痛与肩胛位置、上背姿势的关系。',
      },
      {
        title: '机制提示',
        text: '肩胛上提、圆肩、胸椎姿势变化或左右肩高度不对称时，肩颈连接结构可能出现持续负荷或代偿紧张。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '可记录肩高差、肩胛突出、胸弯凸侧/凹侧与颈部紧张的关系。施罗斯中的肩带摆位应以治疗师指导为准。',
      },
    ],
  },
  {
    id: 'anterior-neck-compensation',
    label: '前侧代偿',
    badge: '头颈前侧链',
    view: 'front',
    keywords: [
      'sternocleidomastoid',
      'scalenus',
      'longus capitis',
      'longus colli',
      'rectus capitis anterior',
      'rectus capitis lateralis',
    ],
    sections: [
      {
        title: '观察重点',
        text: '前侧代偿层用于观察胸锁乳突肌、斜角肌、头长肌和颈长肌等前侧结构，帮助理解头前伸、转头或呼吸相关紧张。',
      },
      {
        title: '机制提示',
        text: '如果头颈长期前移，前侧浅层和深层结构可能参与代偿。前颈深层结构位置敏感，不适合自行深按或强拉。',
      },
      {
        title: '施罗斯 / 侧弯观察',
        text: '可记录轴向延展后下颌、头颈前移和胸廓姿势是否改善。若训练中出现头晕、麻木或疼痛加重，应停止并告知治疗师。',
      },
    ],
  },
];

const MECHANISM_TOPICS = [
  {
    id: 'deep-stabilizers',
    label: '多裂肌稳定',
    badge: '深层稳定肌',
    view: 'back',
    keywords: ['multifidus', 'rotatores', 'interspinalis', 'intertransversarii'],
    sections: [
      {
        title: '观察重点',
        text: '多裂肌、回旋肌、棘间肌和横突间肌位于脊柱深层，贴近椎体节段，适合用来观察局部节段稳定与腰背深层控制。',
      },
      {
        title: '可能相关机制',
        text: '这些结构更偏向精细稳定和姿势控制，而不是产生大幅度动作。腰部疼痛、保护性紧张或运动控制下降时，医生常会关注深层稳定肌是否参与不足或代偿紧张。',
      },
      {
        title: '沟通提示',
        text: '记录时可标注疼痛是否与久坐、弯腰后起身、旋转、单腿支撑或运动后疲劳有关。训练和放松方案应由医生或康复师确认。',
      },
    ],
  },
  {
    id: 'thoracolumbar-fascia',
    label: '胸腰筋膜',
    badge: '筋膜力传递',
    view: 'back',
    keywords: [
      'thoracolumbar fascia',
      'latissimus dorsi',
      'gluteus maximus',
      'erector',
      'iliocostalis',
      'longissimus',
      'internal oblique',
      'transversus abdominis',
    ],
    sections: [
      {
        title: '观察重点',
        text: '胸腰筋膜覆盖并连接腰背、腹壁和骨盆周围结构，是腰背部力传递和张力分布的重要通道。',
      },
      {
        title: '可能相关机制',
        text: '当背阔肌、臀大肌、腹横肌、腹内斜肌和竖脊肌等结构协同变化时，胸腰筋膜张力也可能改变，影响腰背和骶髂区域的受力感受。',
      },
      {
        title: '沟通提示',
        text: '适合和医生讨论疼痛是否呈片状、带状、牵拉样，或是否随躯干旋转、呼吸、步态和骨盆控制变化。',
      },
    ],
  },
  {
    id: 'quadratus-lumborum',
    label: '腰方肌',
    badge: '腰背侧链',
    view: 'posterolateral',
    keywords: ['quadratus lumborum', 'iliocostalis', 'psoas major', 'thoracolumbar fascia'],
    sections: [
      {
        title: '观察重点',
        text: '腰方肌位于后腹壁深层，连接髂嵴、腰椎横突和第十二肋，常用于观察腰背侧方稳定、侧屈和骨盆-肋骨之间的关系。',
      },
      {
        title: '可能相关机制',
        text: '腰方肌与腰椎侧屈、腰部稳定和呼吸辅助有关。单侧负荷、骨盆倾斜、步态不对称或久坐后起身不适时，可以把它作为讨论对象。',
      },
      {
        title: '沟通提示',
        text: '如果疼痛偏一侧腰部、髂嵴上方或靠近第十二肋，可记录左右侧、诱发姿势和触诊反馈。',
      },
    ],
  },
  {
    id: 'iliopsoas',
    label: '腰大肌 / 髂肌',
    badge: '髋屈肌群',
    view: 'front',
    keywords: ['psoas major', 'iliacus'],
    sections: [
      {
        title: '观察重点',
        text: '腰大肌从腰椎前外侧区域走向股骨小转子，和髂肌共同形成髂腰肌，主要参与髋关节屈曲，也与腰椎和髋部稳定有关。',
      },
      {
        title: '可能相关机制',
        text: '久坐、髋部屈曲负荷、骨盆前倾或腰髋控制不佳时，腰大肌和髂肌常被纳入评估。深部放松不适合自行强按，应由专业人员判断。',
      },
      {
        title: '沟通提示',
        text: '可记录疼痛是否与坐久、跑跳、抬腿、髋前侧紧张或腰部前侧牵拉感有关。',
      },
    ],
  },
  {
    id: 'sacroiliac-stability',
    label: '骶髂稳定',
    badge: '骨盆环',
    view: 'posterolateral',
    keywords: [
      'gluteus maximus',
      'gluteus medius',
      'gluteus minimus',
      'piriformis',
      'obturator',
      'gemellus',
      'quadratus femoris',
      'coccygeus',
      'iliococcygeus',
      'pubococcygeus',
    ],
    sections: [
      {
        title: '观察重点',
        text: '骶髂区域稳定依赖骨盆关节形态、韧带结构和周围肌群协同。模型中可重点观察臀肌群、梨状肌、闭孔肌、孖肌和骨盆底相关结构。',
      },
      {
        title: '可能相关机制',
        text: '单腿站立、跑跳、上下楼、步态不对称或骨盆控制不足时，骶髂区域可能出现负荷敏感。疼痛来源需要医生结合查体判断。',
      },
      {
        title: '沟通提示',
        text: '记录疼痛是否靠近髂后上棘、臀深部、骶骨旁，是否与单腿支撑、翻身、坐站转换或运动后加重相关。',
      },
    ],
  },
  {
    id: 'suboccipital-neck',
    label: '枕下 / 颈后',
    badge: '头颈深层',
    view: 'back',
    keywords: ['rectus capitis posterior', 'semispinalis capitis', 'splenius capitis', 'splenius cervicis'],
    sections: [
      {
        title: '观察重点',
        text: '枕下肌群和颈后深层肌肉位于枕骨下方与上颈椎附近，适合观察枕后痛、后颈部紧张和头颈姿势控制。',
      },
      {
        title: '可能相关机制',
        text: '长时间低头、头前伸姿势、颈椎小关节负荷或保护性紧张时，枕下和颈后深层结构可能成为医生查体关注点。',
      },
      {
        title: '沟通提示',
        text: '可记录疼痛是否与低头学习、屏幕时间、仰头、转头、头痛样牵涉或触诊敏感有关。',
      },
    ],
  },
];

const mechanismTopicButtons = document.getElementById('mechanism-topic-buttons');
const mechanismTopicStatus = document.getElementById('mechanism-topic-status');
const painAreaButtons = document.getElementById('easton-pain-area-buttons');
const painAreaStatus = document.getElementById('easton-pain-area-status');
const neckDetailButtons = document.getElementById('neck-detail-buttons');
const neckDetailStatus = document.getElementById('neck-detail-status');
const mechanismDetailPanel = document.getElementById('mechanism-detail-panel');
const mechanismDetailClose = document.getElementById('mechanism-detail-close');
const mechanismDetailTitle = document.getElementById('mechanism-detail-title');
const mechanismDetailBadge = document.getElementById('mechanism-detail-badge');
const mechanismDetailBody = document.getElementById('mechanism-detail-body');
const btnMechanismBackView = document.getElementById('btn-mechanism-back-view');
const btnClearMechanismTopic = document.getElementById('btn-clear-mechanism-topic');

function getActiveMechanismTopic() {
  return MECHANISM_TOPICS.find((topic) => topic.id === activeMechanismTopicId) || null;
}

function getActivePainArea() {
  return EASTON_PAIN_AREAS.find((area) => area.id === activePainAreaId) || null;
}

function getActiveNeckDetail() {
  return NECK_DETAIL_LAYERS.find((layer) => layer.id === activeNeckDetailId) || null;
}

function getActiveDisplayTopic() {
  return getActiveNeckDetail() || getActivePainArea() || getActiveMechanismTopic();
}

function getMeshRawName(mesh) {
  return (mesh.userData.muscleData?.rawName || '').toLowerCase().replace(/_/g, ' ');
}

function meshMatchesMechanismTopic(mesh, topic) {
  const rawName = getMeshRawName(mesh);
  return topic.keywords.some((keyword) => rawName.includes(keyword));
}

function getMechanismTopicMeshes(topic) {
  if (!topic) return [];
  return muscleMeshes.filter((mesh) => meshMatchesMechanismTopic(mesh, topic));
}

function getPainAreaMeshes(area) {
  if (!area) return [];
  return muscleMeshes.filter((mesh) => meshMatchesMechanismTopic(mesh, area));
}

function getNeckDetailMeshes(layer) {
  if (!layer) return [];
  return muscleMeshes.filter((mesh) => meshMatchesMechanismTopic(mesh, layer));
}

function isMechanismTopicEnabled() {
  return Boolean(activeMechanismTopicId);
}

function isPainAreaEnabled() {
  return Boolean(activePainAreaId);
}

function isNeckDetailEnabled() {
  return Boolean(activeNeckDetailId);
}

function shouldShowForMechanismTopic(mesh) {
  const topic = getActiveMechanismTopic();
  return Boolean(topic && meshMatchesMechanismTopic(mesh, topic));
}

function shouldShowForPainArea(mesh) {
  const area = getActivePainArea();
  return Boolean(area && meshMatchesMechanismTopic(mesh, area));
}

function shouldShowForNeckDetail(mesh) {
  const layer = getActiveNeckDetail();
  return Boolean(layer && meshMatchesMechanismTopic(mesh, layer));
}

function renderPainAreaButtons() {
  painAreaButtons.innerHTML = '';

  for (const area of EASTON_PAIN_AREAS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pain-area-btn';
    button.textContent = area.label;
    button.dataset.areaId = area.id;
    button.addEventListener('click', () => {
      activatePainArea(area.id);
    });
    painAreaButtons.appendChild(button);
  }

  updatePainAreaButtons();
}

function updatePainAreaButtons() {
  painAreaButtons.querySelectorAll('.pain-area-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.areaId === activePainAreaId);
  });
}

function updatePainAreaStatus() {
  const area = getActivePainArea();

  if (!area) {
    painAreaStatus.textContent = '从实际疼痛区域进入相关解剖结构。';
    return;
  }

  const count = getPainAreaMeshes(area).length;
  painAreaStatus.textContent = `${area.label}：当前模型中显示 ${count} 个相关结构`;
}

function renderNeckDetailButtons() {
  neckDetailButtons.innerHTML = '';

  for (const layer of NECK_DETAIL_LAYERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'neck-detail-btn';
    button.textContent = layer.label;
    button.dataset.layerId = layer.id;
    button.addEventListener('click', () => {
      activateNeckDetail(layer.id);
    });
    neckDetailButtons.appendChild(button);
  }

  updateNeckDetailButtons();
}

function updateNeckDetailButtons() {
  neckDetailButtons.querySelectorAll('.neck-detail-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.layerId === activeNeckDetailId);
  });
}

function updateNeckDetailStatus() {
  const layer = getActiveNeckDetail();

  if (!layer) {
    neckDetailStatus.textContent = '细分枕后、颈后和肩颈连接结构。';
    return;
  }

  const count = getNeckDetailMeshes(layer).length;
  neckDetailStatus.textContent = `${layer.label}：当前模型中显示 ${count} 个相关结构`;
}

function renderMechanismTopicButtons() {
  mechanismTopicButtons.innerHTML = '';

  for (const topic of MECHANISM_TOPICS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mechanism-topic-btn';
    button.textContent = topic.label;
    button.dataset.topicId = topic.id;
    button.addEventListener('click', () => {
      activateMechanismTopic(topic.id);
    });
    mechanismTopicButtons.appendChild(button);
  }

  updateMechanismTopicButtons();
}

function updateMechanismTopicButtons() {
  mechanismTopicButtons.querySelectorAll('.mechanism-topic-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.topicId === activeMechanismTopicId);
  });
}

function updateMechanismTopicStatus() {
  const topic = getActiveMechanismTopic();

  if (!topic) {
    mechanismTopicStatus.textContent = '选择一个专题，查看相关深层肌肉与筋膜。';
    return;
  }

  const count = getMechanismTopicMeshes(topic).length;
  mechanismTopicStatus.textContent = `${topic.label}：当前模型中显示 ${count} 个相关结构`;
}

function renderMechanismDetailPanel(topic, options = {}) {
  if (!topic) return;

  const structures = getMechanismTopicMeshes(topic)
    .map((mesh) => mesh.userData.displayName)
    .filter(Boolean);
  const structureList = structures.length
    ? `<ul>${structures.slice(0, 12).map((name) => `<li>${escapeHTML(name)}</li>`).join('')}</ul>`
    : '<p class="source-text">当前模型暂未匹配到相关结构。</p>';

  mechanismDetailTitle.textContent = topic.label;
  mechanismDetailBadge.textContent = topic.badge;
  mechanismDetailBody.innerHTML = [
    options.intro ? `
      <div class="mechanism-section">
        <h3>${escapeHTML(options.intro.title)}</h3>
        <p>${escapeHTML(options.intro.text)}</p>
      </div>
    ` : '',
    ...topic.sections.map((section) => `
      <div class="mechanism-section">
        <h3>${escapeHTML(section.title)}</h3>
        <p>${escapeHTML(section.text)}</p>
      </div>
    `),
    `
      <div class="mechanism-section">
        <h3>当前显示结构</h3>
        ${structureList}
      </div>
    `,
    `
      <div class="mechanism-section">
        <h3>使用边界</h3>
        <p>本专题用于解剖学习和医患沟通，不替代诊断、手法治疗或康复处方。任何放松、拉伸、训练和干预方案都应由医生或康复师结合 Easton 的查体结果确认。</p>
      </div>
    `,
  ].join('');
  mechanismDetailPanel.classList.remove('hidden');
}

function hideMechanismDetailPanel() {
  mechanismDetailPanel.classList.add('hidden');
}

function moveCameraToMechanismTopic(topic) {
  const meshes = getMechanismTopicMeshes(topic);
  const dist = defaultCameraPos.distanceTo(defaultLookAt);

  if (meshes.length === 0) {
    animateCamera(defaultCameraPos.clone(), defaultLookAt.clone(), 800);
    return;
  }

  const box = new THREE.Box3();
  for (const mesh of meshes) {
    box.expandByObject(mesh);
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const topicDist = Math.max(size.length() * 1.4, dist * 0.42, 10);
  let cameraPos;

  if (topic.view === 'front') {
    cameraPos = new THREE.Vector3(center.x, center.y + 0.5, center.z + topicDist);
  } else if (topic.view === 'posterolateral') {
    cameraPos = new THREE.Vector3(center.x + topicDist * 0.65, center.y + 0.5, center.z - topicDist * 0.75);
  } else {
    cameraPos = new THREE.Vector3(center.x, center.y + 0.5, center.z - topicDist);
  }

  animateCamera(cameraPos, center, 900);
}

function activateMechanismTopic(topicId) {
  const topic = MECHANISM_TOPICS.find((item) => item.id === topicId);
  if (!topic) return;

  activeMechanismTopicId = topic.id;
  activePainAreaId = null;
  activeNeckDetailId = null;
  focusedMesh = null;
  toggleLayerPeel.checked = false;
  layerPeelSlider.value = 0;
  updateLayerPeelUI();

  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }

  hideInfoPanel();
  hidePainDetailPanel();
  updatePainAreaButtons();
  updatePainAreaStatus();
  updateNeckDetailButtons();
  updateNeckDetailStatus();
  updateMechanismTopicButtons();
  updateMechanismTopicStatus();
  renderMechanismDetailPanel(topic);
  updateFocusButtons();
  updateMuscleVisibility();
  moveCameraToMechanismTopic(topic);
}

function activatePainArea(areaId) {
  const area = EASTON_PAIN_AREAS.find((item) => item.id === areaId);
  if (!area) return;

  activePainAreaId = area.id;
  activeMechanismTopicId = null;
  activeNeckDetailId = null;
  focusedMesh = null;
  toggleLayerPeel.checked = false;
  layerPeelSlider.value = 0;
  updateLayerPeelUI();

  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }

  hideInfoPanel();
  hidePainDetailPanel();
  updatePainAreaButtons();
  updatePainAreaStatus();
  updateNeckDetailButtons();
  updateNeckDetailStatus();
  updateMechanismTopicButtons();
  updateMechanismTopicStatus();
  renderMechanismDetailPanel(area, {
    intro: {
      title: 'Easton 疼痛区域入口',
      text: '此视图从孩子当前疼痛位置出发，帮助把疼痛记录、相关解剖结构、脊柱侧弯观察和施罗斯康复沟通连接起来。',
    },
  });
  updateFocusButtons();
  updateMuscleVisibility();
  moveCameraToMechanismTopic(area);
}

function activateNeckDetail(layerId) {
  const layer = NECK_DETAIL_LAYERS.find((item) => item.id === layerId);
  if (!layer) return;

  activeNeckDetailId = layer.id;
  activePainAreaId = null;
  activeMechanismTopicId = null;
  focusedMesh = null;
  toggleLayerPeel.checked = false;
  layerPeelSlider.value = 0;
  updateLayerPeelUI();

  if (selectedMesh) {
    resetMeshAppearance(selectedMesh);
    selectedMesh = null;
  }

  hideInfoPanel();
  hidePainDetailPanel();
  updatePainAreaButtons();
  updatePainAreaStatus();
  updateNeckDetailButtons();
  updateNeckDetailStatus();
  updateMechanismTopicButtons();
  updateMechanismTopicStatus();
  renderMechanismDetailPanel(layer, {
    intro: {
      title: '颈部详细层',
      text: '此视图把枕后和后颈疼痛继续拆成更细的结构层，便于观察头颈姿势、肩颈连接和脊柱侧弯相关代偿。',
    },
  });
  updateFocusButtons();
  updateMuscleVisibility();
  moveCameraToMechanismTopic(layer);
}

function clearMechanismTopic(options = {}) {
  activeMechanismTopicId = null;
  activePainAreaId = null;
  activeNeckDetailId = null;
  updatePainAreaButtons();
  updatePainAreaStatus();
  updateNeckDetailButtons();
  updateNeckDetailStatus();
  updateMechanismTopicButtons();
  updateMechanismTopicStatus();
  if (!options.keepPanel) {
    hideMechanismDetailPanel();
  }
  updateMuscleVisibility();
}

renderPainAreaButtons();
renderNeckDetailButtons();
renderMechanismTopicButtons();

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
const painMarkerStatus = document.getElementById('pain-marker-status');
const togglePainMarkers = document.getElementById('toggle-pain-markers');
const painDetailPanel = document.getElementById('pain-detail-panel');
const painDetailClose = document.getElementById('pain-detail-close');
const painDetailTitle = document.getElementById('pain-detail-title');
const painDetailScore = document.getElementById('pain-detail-score');
const painDetailBody = document.getElementById('pain-detail-body');
const btnPainDetailFocus = document.getElementById('btn-pain-detail-focus');
const btnPainDetailStructure = document.getElementById('btn-pain-detail-structure');

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
    item.dataset.recordId = record.id;
    if (record.id === activePainRecordId) {
      item.classList.add('marker-active');
    }

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
      app: 'Tsuen’s 解剖系统',
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

function getPainRecordById(recordId) {
  return painRecords.find((record) => record.id === recordId) || null;
}

function formatPainDetailText(value) {
  return value ? escapeHTML(value) : '<span class="source-text">未填写</span>';
}

function formatPainDetailDateTime(value) {
  if (!value) return '<span class="source-text">未填写</span>';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHTML(value);

  return escapeHTML(date.toLocaleString('zh-CN', { hour12: false }));
}

function getPainScoreLabel(score) {
  const value = Number(score) || 0;
  if (value >= 7) return '较重';
  if (value >= 4) return '中等';
  if (value > 0) return '较轻';
  return '无痛';
}

function getPainScoreColor(score) {
  const value = THREE.MathUtils.clamp(Number(score) || 0, 0, 10) / 10;
  return new THREE.Color('#ffd166').lerp(new THREE.Color('#ef476f'), value).getStyle();
}

function buildPainDetailRow(label, valueHTML) {
  return `
    <div class="pain-detail-row">
      <span class="pain-detail-label">${escapeHTML(label)}</span>
      <span class="pain-detail-value">${valueHTML}</span>
    </div>
  `;
}

function showPainDetailPanel(record) {
  if (!record) return;

  hideInfoPanel();
  hideMechanismDetailPanel();
  painDetailTitle.textContent = `${record.date}｜${record.region}`;
  painDetailScore.textContent = `疼痛 ${record.score}/10｜${getPainScoreLabel(record.score)}`;
  painDetailScore.style.background = getPainScoreColor(record.score);

  const structureName = record.structure?.name || '';
  const structureEnglishName = record.structure?.englishName || '';
  const structureHTML = structureName
    ? `${escapeHTML(structureName)}${structureEnglishName ? `<br><span class="source-text">${escapeHTML(structureEnglishName)}</span>` : ''}`
    : '<span class="source-text">未关联具体解剖结构</span>';

  painDetailBody.innerHTML = [
    buildPainDetailRow('左右侧', formatPainDetailText(record.side)),
    buildPainDetailRow('部位', formatPainDetailText(record.region)),
    buildPainDetailRow('关联结构', structureHTML),
    buildPainDetailRow('诱发动作', formatPainDetailText(record.trigger)),
    buildPainDetailRow('治疗方式', formatPainDetailText(record.treatment)),
    buildPainDetailRow('治疗后变化', formatPainDetailText(record.change)),
    buildPainDetailRow('备注', formatPainDetailText(record.note)),
    buildPainDetailRow('创建时间', formatPainDetailDateTime(record.createdAt)),
  ].join('');

  btnPainDetailStructure.disabled = !findLinkedStructureMesh(record);
  painDetailPanel.classList.remove('hidden');
}

function hidePainDetailPanel() {
  painDetailPanel.classList.add('hidden');
}

function getVisiblePainMarkers() {
  if (!painMarkerGroup.visible) return [];
  return painMarkerMeshes.filter((marker) => marker.visible);
}

function clearPainMarkers() {
  for (const marker of painMarkerMeshes) {
    painMarkerGroup.remove(marker);
    marker.material.dispose();
  }
  painMarkerMeshes = [];
}

function getMeshWorldCenter(mesh) {
  mesh.geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  mesh.geometry.boundingBox.getCenter(center);
  mesh.localToWorld(center);
  return center;
}

function findLinkedStructureMesh(record) {
  const rawName = record.structure?.rawName;
  if (rawName) {
    const exactMatch = muscleMeshes.find((mesh) => mesh.userData.muscleData?.rawName === rawName);
    if (exactMatch) return exactMatch;
  }

  const englishName = (record.structure?.englishName || '').toLowerCase();
  if (englishName) {
    return muscleMeshes.find((mesh) =>
      (mesh.userData.englishName || '').toLowerCase() === englishName
    );
  }

  return null;
}

function getBodyMetrics() {
  const fallbackBox = new THREE.Box3(
    new THREE.Vector3(-5, -15, -3),
    new THREE.Vector3(5, 15, 3)
  );
  const box = bodyGroup ? new THREE.Box3().setFromObject(bodyGroup) : fallbackBox;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  return {
    box,
    center,
    width: Math.max(size.x, 1),
    height: Math.max(size.y, 1),
    depth: Math.max(size.z, 1),
  };
}

function getLeftSideSign() {
  const leftSamples = muscleMeshes
    .filter((mesh) => mesh.userData.muscleData?.rawName?.toLowerCase().startsWith('left '))
    .slice(0, 20);
  const rightSamples = muscleMeshes
    .filter((mesh) => mesh.userData.muscleData?.rawName?.toLowerCase().startsWith('right '))
    .slice(0, 20);

  if (leftSamples.length === 0 || rightSamples.length === 0) return 1;

  const avgX = (meshes) =>
    meshes.reduce((sum, mesh) => sum + getMeshWorldCenter(mesh).x, 0) / meshes.length;

  return avgX(leftSamples) >= avgX(rightSamples) ? 1 : -1;
}

function getSideOffset(side, width) {
  const leftSign = getLeftSideSign();
  const offset = width * 0.18;

  if (side === '左侧') return leftSign * offset;
  if (side === '右侧') return -leftSign * offset;
  return 0;
}

function getRegionAnchorPosition(record) {
  const metrics = getBodyMetrics();
  const sideX = getSideOffset(record.side, metrics.width);
  const backZ = metrics.box.min.z - metrics.depth * 0.05;
  const centerX = metrics.center.x + sideX;
  let y = metrics.center.y;

  if (record.region.includes('枕后')) {
    y = metrics.box.max.y - metrics.height * 0.12;
  } else if (record.region.includes('后颈')) {
    y = metrics.box.max.y - metrics.height * 0.24;
  } else if (record.region.includes('骶髂')) {
    y = metrics.center.y - metrics.height * 0.18;
  } else if (record.region.includes('髋部') || record.region.includes('臀部')) {
    y = metrics.center.y - metrics.height * 0.25;
  } else if (record.region.includes('腰部') || record.region.includes('深层稳定肌')) {
    y = metrics.center.y - metrics.height * 0.05;
  }

  return new THREE.Vector3(centerX, y, backZ);
}

function getPainMarkerPosition(record) {
  const linkedMesh = findLinkedStructureMesh(record);

  if (linkedMesh) {
    const metrics = getBodyMetrics();
    const center = getMeshWorldCenter(linkedMesh);
    const outward = center.clone().sub(metrics.center);
    if (outward.length() < 0.01) outward.set(0, 0, -1);
    return center.add(outward.normalize().multiplyScalar(0.45));
  }

  return getRegionAnchorPosition(record);
}

function getPainMarkerColor(score) {
  const value = THREE.MathUtils.clamp(Number(score) || 0, 0, 10) / 10;
  return new THREE.Color('#ffd166').lerp(new THREE.Color('#ef476f'), value);
}

function createPainMarkerMaterial(score) {
  const color = getPainMarkerColor(score);
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.45),
    roughness: 0.35,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
  });
}

function refreshPainMarkers() {
  clearPainMarkers();
  painMarkerGroup.visible = Boolean(togglePainMarkers?.checked);

  if (!bodyGroup || painRecords.length === 0) {
    activePainRecordId = null;
    updatePainMarkerStatus();
    return;
  }

  if (!painRecords.some((record) => record.id === activePainRecordId)) {
    activePainRecordId = null;
  }

  for (const record of painRecords) {
    const marker = new THREE.Mesh(painMarkerGeometry, createPainMarkerMaterial(record.score));
    const scale = 0.8 + THREE.MathUtils.clamp(Number(record.score) || 0, 0, 10) * 0.06;

    marker.position.copy(getPainMarkerPosition(record));
    marker.scale.setScalar(scale);
    marker.renderOrder = 20;
    marker.userData.isPainMarker = true;
    marker.userData.recordId = record.id;
    marker.userData.baseScale = scale;
    marker.userData.recordTitle = `${record.date}｜${record.region}｜${record.score}/10`;

    painMarkerGroup.add(marker);
    painMarkerMeshes.push(marker);
  }

  updatePainMarkerSelection();
  updatePainMarkerStatus();
}

function updatePainMarkerStatus() {
  if (!painMarkerStatus) return;

  if (activePainRecordId && !getPainRecordById(activePainRecordId)) {
    hidePainDetailPanel();
  }

  if (!painMarkerGroup.visible && painMarkerMeshes.length > 0) {
    painMarkerStatus.textContent = `疼痛标记已隐藏：${painMarkerMeshes.length} 个`;
    return;
  }

  const activeRecord = painRecords.find((record) => record.id === activePainRecordId);
  if (activeRecord) {
    painMarkerStatus.textContent = `已定位：${activeRecord.date}｜${activeRecord.region}｜${activeRecord.score}/10`;
    return;
  }

  painMarkerStatus.textContent = `模型标记：${painMarkerMeshes.length} 个`;
}

function updatePainMarkerSelection() {
  for (const marker of painMarkerMeshes) {
    const active = marker.userData.recordId === activePainRecordId;
    marker.scale.setScalar(marker.userData.baseScale * (active ? 1.45 : 1));
    marker.material.opacity = active ? 1 : 0.92;
  }

  painRecordList.querySelectorAll('.pain-record-item').forEach((item) => {
    item.classList.toggle('marker-active', item.dataset.recordId === activePainRecordId);
  });
}

function moveCameraToPainMarker(marker) {
  const target = marker.position.clone();
  const dist = Math.max(defaultCameraPos.distanceTo(defaultLookAt) * 0.42, 9);
  const backSide = marker.position.z <= defaultLookAt.z;
  const cameraZ = marker.position.z + (backSide ? -dist : dist);
  const cameraPos = new THREE.Vector3(marker.position.x, marker.position.y + 1.2, cameraZ);
  animateCamera(cameraPos, target, 800);
}

function selectPainMarker(marker, options = {}) {
  activePainRecordId = marker.userData.recordId;
  updatePainMarkerSelection();
  updatePainMarkerStatus();
  showPainDetailPanel(getPainRecordById(activePainRecordId));

  const item = [...painRecordList.querySelectorAll('.pain-record-item')]
    .find((recordItem) => recordItem.dataset.recordId === activePainRecordId);
  item?.scrollIntoView({ block: 'nearest' });

  if (options.moveCamera !== false) {
    moveCameraToPainMarker(marker);
  }
}

function focusPainMarkerByRecord(recordId) {
  const marker = painMarkerMeshes.find((item) => item.userData.recordId === recordId);
  if (!marker) return;
  selectPainMarker(marker);
}

function savePainRecord(event) {
  event.preventDefault();
  const record = getPainRecordPayload();
  painRecords.unshift(record);
  persistPainRecords();
  renderPainRecords();
  refreshPainMarkers();
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

painDetailClose.addEventListener('click', () => {
  hidePainDetailPanel();
});

mechanismDetailClose.addEventListener('click', () => {
  hideMechanismDetailPanel();
});

btnMechanismBackView.addEventListener('click', () => {
  const topic = getActiveDisplayTopic();
  if (topic) moveCameraToMechanismTopic({ ...topic, view: 'back' });
});

btnClearMechanismTopic.addEventListener('click', () => {
  clearMechanismTopic();
});

btnPainDetailFocus.addEventListener('click', () => {
  if (!activePainRecordId) return;
  focusPainMarkerByRecord(activePainRecordId);
});

btnPainDetailStructure.addEventListener('click', () => {
  const record = getPainRecordById(activePainRecordId);
  if (!record) return;

  const mesh = findLinkedStructureMesh(record);
  if (!mesh) return;

  selectMesh(mesh, { focus: true });
  showInfoPanel(mesh.userData);
});

togglePainMarkers.addEventListener('change', () => {
  painMarkerGroup.visible = togglePainMarkers.checked;
  updatePainMarkerStatus();
});

btnExportPainCsv.addEventListener('click', () => {
  exportPainRecords('csv');
});

btnExportPainJson.addEventListener('click', () => {
  exportPainRecords('json');
});

painRecordList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.pain-record-delete');
  if (deleteButton) {
    painRecords = painRecords.filter((record) => record.id !== deleteButton.dataset.recordId);
    if (activePainRecordId === deleteButton.dataset.recordId) {
      activePainRecordId = null;
      hidePainDetailPanel();
    }
    persistPainRecords();
    renderPainRecords();
    refreshPainMarkers();
    return;
  }

  const recordItem = event.target.closest('.pain-record-item');
  if (recordItem) {
    focusPainMarkerByRecord(recordItem.dataset.recordId);
  }
});

loadPainRecords();
resetPainForm();
renderPainRecords();
refreshPainMarkers();

// ───────────── UI Controls ─────────────

// Search
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = '';

  if (!isSearchQueryLongEnough(query) || muscleMeshes.length === 0) return;

  const matches = muscleMeshes
    .map((mesh) => ({ mesh, score: getSearchMatchScore(mesh, query) }))
    .filter((item) => item.score < Infinity)
    .sort((a, b) =>
      a.score - b.score ||
      String(a.mesh.userData.displayName || '').localeCompare(String(b.mesh.userData.displayName || ''), 'zh-Hans')
    )
    .map((item) => item.mesh);

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

function isSearchQueryLongEnough(query) {
  if (!query) return false;
  if (/[\u3400-\u9fff]/.test(query)) return query.length >= 1;
  return query.length >= 2;
}

function getSearchMatchScore(mesh, query) {
  const displayName = (mesh.userData.displayName || '').toLowerCase();
  const englishName = (mesh.userData.englishName || '').toLowerCase();
  const rawName = (mesh.userData.muscleData?.rawName || '').toLowerCase();
  const searchText = (mesh.userData.searchText || displayName).toLowerCase();

  if (!searchText.includes(query)) return Infinity;

  let score = 100;
  if (displayName.includes(query)) score -= 45;
  if (englishName.includes(query) || rawName.includes(query)) score -= 30;
  if (mesh.userData.muscleData?.type === 'muscle') score -= 20;
  if (displayName.startsWith(query)) score -= 10;
  if (query.includes('肌') && mesh.userData.muscleData?.type !== 'muscle') score += 30;

  return score;
}

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
const btnShowAllGroups = document.getElementById('btn-show-all-groups');
const btnClearAllGroups = document.getElementById('btn-clear-all-groups');
const activeGroups = new Set(Object.keys(MUSCLE_GROUPS));

function setAllMuscleGroups(active, options = {}) {
  if (options.clearFocus) {
    focusedMesh = null;
    activeMechanismTopicId = null;
    activePainAreaId = null;
    activeNeckDetailId = null;
    hideMechanismDetailPanel();
    updatePainAreaButtons();
    updatePainAreaStatus();
    updateNeckDetailButtons();
    updateNeckDetailStatus();
    updateMechanismTopicButtons();
    updateMechanismTopicStatus();
  }

  activeGroups.clear();
  if (active) {
    Object.keys(MUSCLE_GROUPS).forEach((key) => activeGroups.add(key));
  }

  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.classList.toggle('active', active);
  });

  updateMuscleVisibility();
  updateFocusButtons();
}

for (const [key, group] of Object.entries(MUSCLE_GROUPS)) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn active';
  btn.textContent = group.label;
  btn.dataset.group = key;
  btn.style.borderColor = group.color;

  btn.addEventListener('click', () => {
    clearMechanismTopic();
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

btnShowAllGroups.addEventListener('click', () => {
  setAllMuscleGroups(true, { clearFocus: true });
});

btnClearAllGroups.addEventListener('click', () => {
  setAllMuscleGroups(false, { clearFocus: true });
});

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

    if (isNeckDetailEnabled()) {
      mesh.visible = shouldShowForNeckDetail(mesh);
      continue;
    }

    if (isPainAreaEnabled()) {
      mesh.visible = shouldShowForPainArea(mesh);
      continue;
    }

    if (isMechanismTopicEnabled()) {
      mesh.visible = shouldShowForMechanismTopic(mesh);
      continue;
    }

    const group = mesh.userData.muscleData.group;
    const isTendon = mesh.userData.muscleData.type === 'tendon';
    const tendonVisible = document.getElementById('toggle-tendons').checked;

    mesh.visible = activeGroups.has(group) && (!isTendon || tendonVisible);
  }

  updateHighPrecisionVisibility();
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
  setAllMuscleGroups(true);
  document.getElementById('muscle-opacity-slider').value = 1;
  setMuscleOpacity(1);
  document.getElementById('skeleton-opacity-slider').value = 0.6;
  setSkeletonOpacity(0.6);
  if (toggleHighPrecision) toggleHighPrecision.checked = false;
  activeHighPrecisionMode = 'full';
  updateHighPrecisionButtons();
  updateHighPrecisionVisibility();
  toggleLayerPeel.checked = false;
  layerPeelSlider.value = 0;
  updateLayerPeelUI();
  activePainAreaId = null;
  updatePainAreaButtons();
  updatePainAreaStatus();
  activeNeckDetailId = null;
  updateNeckDetailButtons();
  updateNeckDetailStatus();
  activeMechanismTopicId = null;
  updateMechanismTopicButtons();
  updateMechanismTopicStatus();
  togglePainMarkers.checked = true;
  painMarkerGroup.visible = true;
  activePainRecordId = null;
  updatePainMarkerSelection();
  updatePainMarkerStatus();
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
  hidePainDetailPanel();
  hideMechanismDetailPanel();
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
  if (!e.target.checked && toggleHighPrecision) {
    toggleHighPrecision.checked = false;
  }
  updateHighPrecisionVisibility();
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
  for (const mat of [highPrecisionBoneMaterial, highPrecisionFocusMaterial, highPrecisionReferenceMaterial]) {
    mat.opacity = opacity;
    mat.transparent = opacity < 1;
    mat.depthWrite = opacity >= 1;
  }
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
    updateHighPrecisionVisibility();

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

    refreshPainMarkers();
    hideLoadingOverlay();
    initHighPrecisionModels(bodyBox);
  } catch (error) {
    console.error('Failed to load anatomy model:', error);
    if (loadingText) {
      loadingText.textContent = '解剖模型加载失败，请检查文件是否完整。';
      loadingText.style.color = '#e74c3c';
    }
  }
}

initBody();
