import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const highPrecisionBoneMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xf2ead8),
  roughness: 0.72,
  metalness: 0.0,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.92,
  depthWrite: true,
});

export const highPrecisionFocusMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xffd166),
  roughness: 0.55,
  metalness: 0.0,
  emissive: new THREE.Color(0x5a3710),
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.98,
  depthWrite: true,
});

export const highPrecisionReferenceMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x8ecae6),
  roughness: 0.58,
  metalness: 0.0,
  emissive: new THREE.Color(0x0b2533),
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.9,
  depthWrite: true,
});

const HIGH_PRECISION_SOURCE = {
  title: 'Open3DModel',
  license: 'Creative Commons Attribution-ShareAlike 4.0',
  url: 'https://anatomytool.org/open3dmodel-create',
};

export function loadHighPrecisionModels(onProgress) {
  const base = import.meta.env.BASE_URL;
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(`${base}draco/gltf/`);
  loader.setDRACOLoader(dracoLoader);

  const skeletonPromise = loadGLB(loader, `${base}high_precision/open3dmodel/overview-skeleton.glb`, (pct) => {
    if (onProgress) onProgress(Math.round(pct * 0.82));
  });
  const vertebraePromise = loadGLB(loader, `${base}high_precision/open3dmodel/vertebrae.glb`, (pct) => {
    if (onProgress) onProgress(Math.round(82 + pct * 0.18));
  });

  return Promise.all([skeletonPromise, vertebraePromise]).then(([skeletonGLTF, vertebraeGLTF]) => {
    const highPrecisionGroup = new THREE.Group();
    const skeletonGroup = new THREE.Group();
    const vertebraeGroup = new THREE.Group();
    const meshes = [];

    skeletonGroup.name = 'Open3DModel 高精度骨骼';
    vertebraeGroup.name = 'Open3DModel 典型椎骨参考';
    highPrecisionGroup.name = 'v0.10 高精度模型';
    highPrecisionGroup.visible = false;

    collectHighPrecisionMeshes(skeletonGLTF.scene, skeletonGroup, meshes, {
      role: 'skeleton',
      material: highPrecisionBoneMaterial,
      mirrorRightSide: true,
    });

    collectHighPrecisionMeshes(vertebraeGLTF.scene, vertebraeGroup, meshes, {
      role: 'reference',
      material: highPrecisionReferenceMaterial,
      mirrorRightSide: false,
      offset: new THREE.Vector3(0, 0, 0),
    });

    highPrecisionGroup.add(skeletonGroup);
    highPrecisionGroup.add(vertebraeGroup);

    return {
      highPrecisionGroup,
      skeletonGroup,
      vertebraeGroup,
      meshes,
      source: HIGH_PRECISION_SOURCE,
    };
  });
}

function loadGLB(loader, url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      resolve,
      (progress) => {
        if (progress.total > 0 && onProgress) {
          onProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      reject
    );
  });
}

function collectHighPrecisionMeshes(sourceRoot, targetGroup, meshes, options) {
  sourceRoot.updateMatrixWorld(true);
  let count = 0;

  sourceRoot.traverse((child) => {
    if (!child.isMesh) return;

    const rawName = child.name || `Open3DModel structure ${count + 1}`;
    const shouldMirror = options.mirrorRightSide && shouldMirrorRightSideMesh(rawName, child);
    const sourceRawName = shouldMirror && !isRightSideOpen3DName(rawName) ? `${rawName}.r` : rawName;
    const mesh = createHighPrecisionMesh(child, sourceRawName, options);
    targetGroup.add(mesh);
    meshes.push(mesh);
    count += 1;

    if (shouldMirror) {
      const mirroredRawName = getMirroredOpen3DName(sourceRawName);
      const mirrored = createHighPrecisionMesh(child, mirroredRawName, options, { mirrored: true });
      targetGroup.add(mirrored);
      meshes.push(mirrored);
    }
  });
}

function createHighPrecisionMesh(sourceMesh, rawName, options, mirrorOptions = {}) {
  const geometry = sourceMesh.geometry.clone();
  geometry.applyMatrix4(sourceMesh.matrixWorld);
  if (mirrorOptions.mirrored) {
    geometry.scale(-1, 1, 1);
  }
  if (options.offset) {
    geometry.translate(options.offset.x, options.offset.y, options.offset.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, options.material);
  mesh.name = rawName;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = options.role === 'reference' ? 0 : -1;

  const englishName = formatOpen3DName(rawName);
  const displayName = getChineseBoneDisplayName(rawName, englishName);
  mesh.userData.displayName = displayName;
  mesh.userData.englishName = englishName;
  mesh.userData.originalMaterial = options.material;
  mesh.userData.highPrecisionRole = options.role;
  mesh.userData.highPrecisionSource = HIGH_PRECISION_SOURCE;
  mesh.userData.searchText = `${displayName} ${englishName} ${rawName} open3dmodel 高精度骨骼`.toLowerCase();
  mesh.userData.muscleData = {
    name: displayName,
    englishName,
    rawName,
    group: 'BONE',
    type: 'bone',
    info: {
      source: HIGH_PRECISION_SOURCE.title,
      license: HIGH_PRECISION_SOURCE.license,
      notes: '高精度骨骼模型用于解剖学习、疼痛位置讨论和医生沟通，不用于诊断或治疗决策。',
    },
  };

  return mesh;
}

function formatOpen3DName(name) {
  return name
    .replace(/[._]r$/i, ' right')
    .replace(/[._]l$/i, ' left')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getChineseBoneDisplayName(rawName, englishName) {
  const lower = rawName.toLowerCase();
  const side = /[._]r$/i.test(lower) ? '右侧' : /[._]l$/i.test(lower) ? '左侧' : '';
  const base = lower.replace(/[._][rl]$/i, '');

  const directTerms = [
    [/^atlas \(c1\)$/i, '寰椎（C1）'],
    [/^axis \(c2\)$/i, '枢椎（C2）'],
    [/^sacrum$/i, '骶骨'],
    [/^coccyx$/i, '尾骨'],
    [/^occipital bone$/i, '枕骨'],
    [/^hip bone$/i, '髋骨'],
    [/^femur$/i, '股骨'],
    [/^fibula$/i, '腓骨'],
    [/^tibia$/i, '胫骨'],
    [/^clavicle$/i, '锁骨'],
    [/^scapula$/i, '肩胛骨'],
    [/^humerus$/i, '肱骨'],
    [/^radius$/i, '桡骨'],
    [/^ulna$/i, '尺骨'],
    [/^mandible bone$/i, '下颌骨'],
    [/^frontal bone$/i, '额骨'],
    [/^sphenoid bone$/i, '蝶骨'],
    [/^ethmoid bone$/i, '筛骨'],
    [/^vomer$/i, '犁骨'],
    [/^manubrium of sternum$/i, '胸骨柄'],
    [/^body of sternum$/i, '胸骨体'],
  ];

  const vertebraMatch = base.match(/^(cervical|thoracic|lumbar) vertebrae? \(([ctl])(\d+)\)$/i);
  if (vertebraMatch) {
    const region = {
      cervical: '颈椎',
      thoracic: '胸椎',
      lumbar: '腰椎',
    }[vertebraMatch[1].toLowerCase()];
    return `第${vertebraMatch[3]}${region}`;
  }

  for (const [pattern, label] of directTerms) {
    if (pattern.test(base)) {
      return `${side}${label}`;
    }
  }

  return `${side}${englishName}`;
}

function isRightSideOpen3DName(name) {
  return /[._]r$/i.test(name);
}

function getMirroredOpen3DName(name) {
  return name.replace(/([._])r$/i, '$1l');
}

function shouldMirrorRightSideMesh(rawName, sourceMesh) {
  if (isRightSideOpen3DName(rawName)) return true;
  if (/\b(left|right)\b/i.test(rawName)) return false;

  const geometry = sourceMesh.geometry.clone();
  geometry.applyMatrix4(sourceMesh.matrixWorld);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  geometry.dispose();

  return center.x < -0.015;
}
