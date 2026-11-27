/**
 * PINE-033 — newly illustrated, depth-separated 2.5D pine for the sample gate.
 * Art: assets/pine-033/pine-layer-atlas.png, 2172 × 724, three 724 px cells.
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

const DEFAULT_ATLAS = new URL('../assets/pine-033/pine-layer-atlas.webp', import.meta.url).href;
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
  gradient.addColorStop(0, 'rgba(16,27,38,0.40)');
  gradient.addColorStop(0.45, 'rgba(20,32,44,0.21)');
  gradient.addColorStop(1, 'rgba(20,32,44,0)');
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
  group.name = 'PINE-033 layered gate pine';
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
    // Layer transforms are composed only when the root/camera changes. The
    // renderer still updates their world matrices normally before drawing.
    mesh.matrixAutoUpdate = false;
    mesh.name = `PINE-033 ${spec.key}`;
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
    const registeredPositions = geometry.attributes.position.array.slice();
    const reliefFactors = new Float64Array(geometry.attributes.position.count);
    let maximumFactor = 0;
    for (let i = 0; i < reliefFactors.length; i++) {
      const imageHeight = (spec.offset[1] + registeredPositions[i * 3 + 1]) / height;
      const t = T.MathUtils.clamp((imageHeight - 0.10) / 0.52, 0, 1);
      const factor = t * t * (3 - 2 * t);
      reliefFactors[i] = factor;
      maximumFactor = Math.max(maximumFactor, factor);
    }
    geometry.attributes.position.setUsage(T.DynamicDrawUsage);
    records.push({ mesh, spec, registeredPositions, reliefFactors, maximumFactor });
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
  contact.name = 'PINE-033 ground-conformed root contact shadow';
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
        group.userData.loadError = 'PINE-033 atlas could not be loaded';
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
  const cameraScale = new T.Vector3();
  const layerWorld = new T.Vector3();
  const backward = new T.Vector3();
  const cameraFromLayer = new T.Vector3();
  const previousRootMatrix = new T.Matrix4();
  const previousCameraMatrix = new T.Matrix4();
  let previousRelief = NaN;
  let initialized = false;

  function update(_dt, { player, camera } = {}) {
    if (!camera || disposed) return lastUpdate;
    group.updateWorldMatrix(true, false);
    camera.updateWorldMatrix(true, false);
    const geometryChanged = !initialized || previousRelief !== upperRelief
      || !previousRootMatrix.equals(group.matrixWorld)
      || !previousCameraMatrix.equals(camera.matrixWorld);
    if (!geometryChanged) {
      // Player depth is diagnostic; a moving player does not deform the tree.
      if (player?.getWorldPosition) {
        player.getWorldPosition(playerWorld);
        cameraSpace.copy(playerWorld).applyMatrix4(camera.matrixWorldInverse);
        lastUpdate.playerDepth = -cameraSpace.z;
      }
      for (const { mesh, spec } of records) lastUpdate.layers[spec.key].visible = mesh.visible;
      return lastUpdate;
    }
    previousRootMatrix.copy(group.matrixWorld);
    previousCameraMatrix.copy(camera.matrixWorld);
    previousRelief = upperRelief;
    initialized = true;
    // Decompose each world matrix once. getWorldPosition/Scale/Quaternion each
    // recursively updated the same ancestor chain in the previous version.
    group.matrixWorld.decompose(rootWorld, parentQuaternion, worldScale);
    camera.matrixWorld.decompose(cameraWorld, cameraQuaternion, cameraScale);
    inverseWorld.copy(group.matrixWorld).invert();
    localQuaternion.copy(parentQuaternion).invert().multiply(cameraQuaternion);
    right.set(1, 0, 0).applyQuaternion(cameraQuaternion);
    up.set(0, 1, 0).applyQuaternion(cameraQuaternion);
    backward.set(0, 0, 1).applyQuaternion(cameraQuaternion);
    towardCamera.subVectors(cameraWorld, rootWorld);
    const distance = Math.max(1, towardCamera.length());
    towardCamera.multiplyScalar(1 / distance);
    const uniformScale = (Math.abs(worldScale.x) + Math.abs(worldScale.y) + Math.abs(worldScale.z)) / 3;
    const uniformRoot = worldScale.x > 0 && worldScale.y > 0 && worldScale.z > 0
      && Math.abs(worldScale.x - worldScale.y) < 1e-10
      && Math.abs(worldScale.x - worldScale.z) < 1e-10;

    // Moving along the camera-to-root ray and scaling by the distance ratio
    // preserves the painted layer registration in perspective. Their actual
    // depth separation remains real, so the player crosses each independently.
    for (const { mesh, spec, registeredPositions, reliefFactors, maximumFactor } of records) {
      const depth = spec.depth * uniformScale;
      const registrationScale = T.MathUtils.clamp(1 - depth / distance, 0.2, 2);
      worldPoint.copy(rootWorld).addScaledVector(towardCamera, depth)
        .addScaledVector(right, spec.offset[0] * uniformScale * registrationScale)
        .addScaledVector(up, spec.offset[1] * uniformScale * registrationScale);
      layerWorld.copy(worldPoint);
      mesh.position.copy(worldPoint).applyMatrix4(inverseWorld);
      mesh.quaternion.copy(localQuaternion);
      mesh.scale.setScalar(registrationScale);
      mesh.updateMatrix();
      // The painted S-trunk must rise in front of the original stone rail.
      // A flat camera-facing card otherwise recedes behind that rail as its
      // pixels rise. Give middle/upper pixels bounded forward depth relief.
      // Move EACH vertex on its own camera ray, so its projected position and
      // the atlas registration stay fixed, including perspective/aspect.
      const positions = mesh.geometry.attributes.position;
      const output = positions.array;
      const maximumRelief = upperRelief > 0 ? upperRelief * uniformScale * maximumFactor : 0;
      if (upperRelief > 0) {
        if (uniformRoot) {
          // Same ray deformation, expressed in the billboard's local basis.
          // Uniform root scale cancels: no per-vertex world/inverse transforms
          // and no inverse matrix per layer are needed for the actual game tree.
          const layerScale = uniformScale * registrationScale;
          cameraFromLayer.subVectors(cameraWorld, layerWorld);
          const cx = cameraFromLayer.dot(right) / layerScale;
          const cy = cameraFromLayer.dot(up) / layerScale;
          const cz = cameraFromLayer.dot(backward) / layerScale;
          for (let i = 0; i < positions.count; i++) {
            const j = i * 3, x = registeredPositions[j], y = registeredPositions[j + 1], z = registeredPositions[j + 2];
            const dx = cx - x, dy = cy - y, dz = cz - z;
            const rayDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const factor = Math.min(upperRelief * reliefFactors[i] / (registrationScale * rayDistance), 0.2);
            output[j] = x + dx * factor;
            output[j + 1] = y + dy * factor;
            output[j + 2] = z + dz * factor;
          }
        } else {
          // Preserve the previous exact matrix path for unusual nonuniform or
          // mirrored parent transforms; the shipped tree uses positive scale1.
          mesh.updateMatrixWorld();
          inverseMeshWorld.copy(mesh.matrixWorld).invert();
          for (let i = 0; i < positions.count; i++) {
            const j = i * 3, relief = upperRelief * uniformScale * reliefFactors[i];
            if (relief <= 0) {
              output[j] = registeredPositions[j];output[j + 1] = registeredPositions[j + 1];output[j + 2] = registeredPositions[j + 2];
              continue;
            }
            reliefVertex.set(registeredPositions[j], registeredPositions[j + 1], registeredPositions[j + 2]).applyMatrix4(mesh.matrixWorld);
            reliefRay.subVectors(cameraWorld, reliefVertex);
            const rayDistance = reliefRay.length();
            reliefVertex.addScaledVector(reliefRay, Math.min(relief, rayDistance * 0.2) / rayDistance).applyMatrix4(inverseMeshWorld);
            output[j] = reliefVertex.x;output[j + 1] = reliefVertex.y;output[j + 2] = reliefVertex.z;
          }
        }
      } else output.set(registeredPositions);
      positions.needsUpdate = true;
      mesh.userData.maximumUpperRelief = maximumRelief;
      cameraSpace.copy(layerWorld).applyMatrix4(camera.matrixWorldInverse);
      const diagnostic = lastUpdate.layers[spec.key] ?? (lastUpdate.layers[spec.key] = {});
      diagnostic.rootDepth = -cameraSpace.z;diagnostic.offset = spec.depth;diagnostic.upperRelief = maximumRelief;diagnostic.visible = mesh.visible;
    }
    rootWorld.toArray(lastUpdate.root);
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
      technique: 'H33 newly repainted matte layered 2.5D atlas; not a game screenshot',
      atlas: DEFAULT_ATLAS, approvedReference: REFERENCE,
      originalAtlasPixels: [2172, 724], cells: ['rear', 'trunk', 'front'],
      alphaCutoff: alphaTest, upperRelief: upperRelief, real3DTreeClaimed: false,
    },
  };
}
