/**
 * PINE-007 — newly illustrated, depth-separated 2.5D pine for the sample gate.
 * Art: assets/pine-007/pine-layer-atlas.png, 2172 × 724, three 724 px cells.
 * Reference: assets/pine-002/reference.png. No H28/H29 screenshot is used.
 *
 * Usage:
 *   const pine = createLayeredPine({ position: [-7, groundHeight, -7] });
 *   scene.add(pine.group); await pine.ready;
 *   // After updating the normal gameplay camera each frame:
 *   pine.update(dt, { player, camera });
 *
 * The caller retains the existing 0.72 root collider. These visual planes do
 * not intercept pointer/raycast movement. They use real depth tests: the rear
 * crown, trunk and forward branch can independently cover/be covered by the
 * character. There is no whole-tree opacity fade.
 */
import * as T from 'three';

const DEFAULT_ATLAS = new URL('../assets/pine-007/pine-layer-atlas.png', import.meta.url).href;
const REFERENCE = new URL('../assets/pine-002/reference.png', import.meta.url).href;

function point3(value, fallback) {
  if (value?.isVector3) return value.clone();
  if (Array.isArray(value)) return new T.Vector3(...value);
  return new T.Vector3(...fallback);
}

function cutoutPlane(width, height, anchor, column, columns, padding, imageWidth, imageHeight) {
  // A small grid supports depth relief without bending the painted silhouette.
  const geometry = new T.PlaneGeometry(width, height, 4, 24);
  // Image anchors use normalized pixel coordinates measured from the top left.
  geometry.translate((0.5 - anchor[0]) * width, (anchor[1] - 0.5) * height, 0);
  const uv = geometry.attributes.uv;
  const left = column / columns + padding / imageWidth;
  const right = (column + 1) / columns - padding / imageWidth;
  const bottom = padding / imageHeight;
  const top = 1 - padding / imageHeight;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, T.MathUtils.lerp(left, right, uv.getX(i)), T.MathUtils.lerp(bottom, top, uv.getY(i)));
  }
  uv.needsUpdate = true;
  return geometry;
}

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(12,22,21,0.40)');
  gradient.addColorStop(0.45, 'rgba(12,22,21,0.21)');
  gradient.addColorStop(1, 'rgba(12,22,21,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}

export function createLayeredPine(options = {}) {
  const width = options.width ?? 6.4;
  const height = options.height ?? 5.6;
  const columns = options.columns ?? 3;
  const atlasWidth = options.atlasWidth ?? 2172;
  const atlasHeight = options.atlasHeight ?? 724;
  const alphaTest = options.alphaTest ?? 0.55;
  let upperRelief = options.upperRelief ?? 1.6;
  const group = new T.Group();
  group.name = 'PINE-007 layered gate pine';
  group.position.copy(point3(options.position, [-7, 0, -7]));
  group.userData.visualTechnique = 'new illustrated atlas with independent camera-facing depth planes';
  group.userData.collisionRadius = 0.72;

  // Rear and trunk cells share their full-canvas root registration. The newly
  // generated front cell is an isolated branch rather than a registered whole
  // tree: its left woody fork is explicitly attached to the trunk's right arm.
  const rootAnchor = options.rootAnchor ?? [0.48, 0.97];
  const specifications = [
    { key: 'rear', column: 0, depth: -1.05, w: width, h: height, anchor: rootAnchor,
      offset: [0, 0], tint: options.rearTint ?? 0xb8cbb8 },
    { key: 'trunk', column: 1, depth: 0, w: width, h: height, anchor: rootAnchor,
      offset: [0, 0], tint: options.trunkTint ?? 0xc3c9c1 },
    { key: 'front', column: 2, depth: 0.85, w: width * 0.68, h: height * 0.68,
      anchor: options.frontAnchor ?? [0.14, 0.52],
      offset: options.frontOffset ?? [width * 0.18, height * 0.26],
      tint: options.frontTint ?? 0xb6c9b4 },
  ].map(spec => ({ ...spec, ...(options.layout?.[spec.key] ?? {}) }));

  const layers = {};
  const records = [];
  for (const spec of specifications) {
    const geometry = cutoutPlane(spec.w, spec.h, spec.anchor, spec.column, columns,
      options.padding ?? 2, atlasWidth, atlasHeight);
    const material = new T.MeshBasicMaterial({
      color: spec.tint,
      alphaTest,
      // Cutouts participate in the opaque depth pass. Transparent object
      // sorting would incorrectly draw the entire tree over/under the player.
      transparent: false,
      depthTest: true,
      depthWrite: true,
      side: T.FrontSide,
      toneMapped: false,
      fog: options.fog ?? true,
    });
    material.alphaToCoverage = true;
    const mesh = new T.Mesh(geometry, material);
    mesh.name = `PINE-007 ${spec.key}`;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.raycast = () => {}; // The ground remains the movement target.
    mesh.userData.layer = spec.key;
    mesh.userData.cameraDepthOffset = spec.depth;
    mesh.userData.atlasCell = spec.column;
    mesh.userData.registrationAnchor = [...spec.anchor];
    group.add(mesh);
    layers[spec.key] = mesh;
    records.push({ mesh, spec, registeredPositions: geometry.attributes.position.array.slice() });
  }

  const contactMap = shadowTexture();
  const contactMaterial = new T.MeshBasicMaterial({
    map: contactMap, transparent: true, opacity: 0.65,
    depthTest: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const contactGeometry = new T.PlaneGeometry(4.25, 2.1, 16, 10);
  contactGeometry.rotateX(-Math.PI / 2);
  if (options.groundAt) {
    const p=contactGeometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const h=options.groundAt(group.position.x+p.getX(i),group.position.z+p.getZ(i));
      p.setY(i,(h??group.position.y)-group.position.y+.018);
    }
    contactGeometry.computeVertexNormals();
  }
  const contact = new T.Mesh(contactGeometry, contactMaterial);
  contact.name = 'PINE-007 ground-conformed root contact shadow';
  contact.position.y = options.groundAt ? 0 : .025;
  contact.raycast = () => {};
  group.add(contact);

  let disposed = false;
  let sourceTexture = null;
  let ownsTexture = false;
  let loaded = false;
  const lastUpdate = { loaded: false, root: [-7, 0, -7], layers: {}, playerDepth: null };
  function applyTexture(texture) {
    if (disposed) return texture;
    sourceTexture = texture;
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
    texture.magFilter = T.LinearFilter;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    for (const { mesh } of records) {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
      mesh.visible = true;
    }
    loaded = lastUpdate.loaded = true;
    return texture;
  }
  const requestedTexture = options.texture ?? options.atlasUrl ?? DEFAULT_ATLAS;
  let ready;
  if (requestedTexture?.isTexture) {
    ready = Promise.resolve(applyTexture(requestedTexture));
  } else {
    ownsTexture = true;
    ready = new Promise((resolve, reject) => {
      new T.TextureLoader().load(requestedTexture, texture => resolve(applyTexture(texture)), undefined, error => {
        group.userData.loadError = 'PINE-007 atlas could not be loaded';
        reject(error);
      });
    });
  }

  const rootWorld = new T.Vector3();
  const cameraWorld = new T.Vector3();
  const playerWorld = new T.Vector3();
  const towardCamera = new T.Vector3();
  const right = new T.Vector3();
  const up = new T.Vector3();
  const worldPoint = new T.Vector3();
  const worldScale = new T.Vector3();
  const cameraQuaternion = new T.Quaternion();
  const parentQuaternion = new T.Quaternion();
  const localQuaternion = new T.Quaternion();
  const inverseWorld = new T.Matrix4();
  const cameraSpace = new T.Vector3();
  const reliefVertex = new T.Vector3();
  const reliefRay = new T.Vector3();
  const inverseMeshWorld = new T.Matrix4();

  function update(_dt, { player, camera } = {}) {
    if (!camera || disposed) return lastUpdate;
    group.updateWorldMatrix(true, false);
    camera.updateWorldMatrix(true, false);
    group.getWorldPosition(rootWorld);
    group.getWorldScale(worldScale);
    group.getWorldQuaternion(parentQuaternion);
    camera.getWorldPosition(cameraWorld);
    camera.getWorldQuaternion(cameraQuaternion);
    inverseWorld.copy(group.matrixWorld).invert();
    localQuaternion.copy(parentQuaternion).invert().multiply(cameraQuaternion);
    right.set(1, 0, 0).applyQuaternion(cameraQuaternion);
    up.set(0, 1, 0).applyQuaternion(cameraQuaternion);
    towardCamera.subVectors(cameraWorld, rootWorld);
    const distance = Math.max(1, towardCamera.length());
    towardCamera.multiplyScalar(1 / distance);
    const uniformScale = (Math.abs(worldScale.x) + Math.abs(worldScale.y) + Math.abs(worldScale.z)) / 3;

    // Moving along the camera-to-root ray and scaling by the distance ratio
    // preserves the painted layer registration in perspective. Their actual
    // depth separation remains real, so the player crosses each independently.
    for (const { mesh, spec, registeredPositions } of records) {
      const depth = spec.depth * uniformScale;
      const registrationScale = T.MathUtils.clamp(1 - depth / distance, 0.2, 2);
      worldPoint.copy(rootWorld).addScaledVector(towardCamera, depth)
        .addScaledVector(right, spec.offset[0] * uniformScale * registrationScale)
        .addScaledVector(up, spec.offset[1] * uniformScale * registrationScale);
      mesh.position.copy(worldPoint.applyMatrix4(inverseWorld));
      mesh.quaternion.copy(localQuaternion);
      mesh.scale.setScalar(registrationScale);
      mesh.updateMatrixWorld();
      // The painted S-trunk must rise in front of the original stone rail.
      // A flat camera-facing card otherwise recedes behind that rail as its
      // pixels rise. Give middle/upper pixels bounded forward depth relief.
      // Move EACH vertex on its own camera ray, so its projected position and
      // the atlas registration stay fixed, including perspective/aspect.
      const positions = mesh.geometry.attributes.position;
      positions.array.set(registeredPositions);
      let maximumRelief = 0;
      if (upperRelief > 0) {
        inverseMeshWorld.copy(mesh.matrixWorld).invert();
        for (let i = 0; i < positions.count; i++) {
          const j = i * 3;
          const imageHeight = (spec.offset[1] + registeredPositions[j + 1]) / height;
          // Root and first 10% stay at their actual root depth. Upper relief
          // eases in continuously and reaches its cap above 62% tree height.
          const t = T.MathUtils.clamp((imageHeight - 0.10) / 0.52, 0, 1);
          const relief = upperRelief * uniformScale * t * t * (3 - 2 * t);
          maximumRelief = Math.max(maximumRelief, relief);
          if (relief <= 0) continue;
          reliefVertex.set(registeredPositions[j], registeredPositions[j + 1], registeredPositions[j + 2])
            .applyMatrix4(mesh.matrixWorld);
          reliefRay.subVectors(cameraWorld, reliefVertex);
          const rayDistance = reliefRay.length();
          reliefVertex.addScaledVector(reliefRay, Math.min(relief, rayDistance * 0.2) / rayDistance)
            .applyMatrix4(inverseMeshWorld);
          positions.setXYZ(i, reliefVertex.x, reliefVertex.y, reliefVertex.z);
        }
      }
      positions.needsUpdate = true;
      mesh.userData.maximumUpperRelief = maximumRelief;
      const center = mesh.getWorldPosition(worldPoint);
      cameraSpace.copy(center).applyMatrix4(camera.matrixWorldInverse);
      lastUpdate.layers[spec.key] = { rootDepth: -cameraSpace.z, offset: spec.depth, upperRelief: maximumRelief, visible: mesh.visible };
    }
    lastUpdate.root = rootWorld.toArray();
    if (player?.getWorldPosition) {
      player.getWorldPosition(playerWorld);
      cameraSpace.copy(playerWorld).applyMatrix4(camera.matrixWorldInverse);
      lastUpdate.playerDepth = -cameraSpace.z;
    }
    return lastUpdate;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const { mesh } of records) { mesh.geometry.dispose(); mesh.material.dispose(); }
    contact.geometry.dispose(); contact.material.dispose(); contactMap.dispose();
    if (ownsTexture) sourceTexture?.dispose();
    group.removeFromParent();
  }

  return {
    group, layers, contact, ready, update, dispose, lastUpdate,
    get loaded() { return loaded; },
    get upperRelief() { return upperRelief; },
    set upperRelief(value) { upperRelief = T.MathUtils.clamp(Number(value) || 0, 0, 3); },
    collision: { radius: 0.72, getCenter: () => group.getWorldPosition(new T.Vector3()) },
    provenance: {
      technique: 'newly illustrated layered 2.5D atlas, not H29 imagery',
      atlas: DEFAULT_ATLAS, approvedReference: REFERENCE,
      originalAtlasPixels: [2172, 724], cells: ['rear', 'trunk', 'front'],
      alphaCutoff: alphaTest, upperRelief: upperRelief, real3DTreeClaimed: false,
    },
  };
}
