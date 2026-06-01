import * as THREE from 'three';

// Procedural ship-mesh builders. Keeps all geometry self-contained (no GLTF).

// Player interceptor: sleek arrow body, swept wings, glowing twin engines.
export function buildPlayerShip() {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x9aa6b5,
    metalness: 0.85,
    roughness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a5a,
    metalness: 0.7,
    roughness: 0.4,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x113355,
    metalness: 0.2,
    roughness: 0.1,
    emissive: 0x224488,
    emissiveIntensity: 0.4,
  });

  // Fuselage (cone pointing -Z forward).
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 8), hullMat);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -1;
  g.add(body);

  // Rear hull block.
  const rear = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 3.5), accentMat);
  rear.position.z = 2.4;
  g.add(rear);

  // Cockpit canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8), glassMat);
  canopy.scale.set(1, 0.6, 1.6);
  canopy.position.set(0, 0.7, -0.5);
  g.add(canopy);

  // Swept wings.
  const wingGeo = new THREE.BoxGeometry(5.5, 0.25, 2.4);
  const left = new THREE.Mesh(wingGeo, hullMat);
  left.position.set(-3.0, -0.1, 1.8);
  left.rotation.y = 0.35;
  g.add(left);
  const right = left.clone();
  right.position.x = 3.0;
  right.rotation.y = -0.35;
  g.add(right);

  // Engine glow cores (bloom-friendly emissive).
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x40c0ff,
    emissive: 0x40c0ff,
    emissiveIntensity: 4,
  });
  const eGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.2, 12);
  const eL = new THREE.Mesh(eGeo, engineMat);
  eL.rotation.x = Math.PI / 2;
  eL.position.set(-0.9, 0, 4.1);
  g.add(eL);
  const eR = eL.clone();
  eR.position.x = 0.9;
  g.add(eR);

  g.userData.engines = [eL, eR];
  g.userData.muzzles = [
    new THREE.Vector3(-3.0, -0.1, -1.5),
    new THREE.Vector3(3.0, -0.1, -1.5),
  ];
  return g;
}

// Alien fighter: organic dark hull with menacing red glow.
export function buildAlienFighter() {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x2a1530,
    metalness: 0.6,
    roughness: 0.5,
    emissive: 0x1a0520,
    emissiveIntensity: 0.5,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff3344,
    emissive: 0xff2233,
    emissiveIntensity: 3.5,
  });

  // Saucer-ish central body.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), hullMat);
  core.scale.set(1.4, 0.7, 1.2);
  g.add(core);

  // Side prongs.
  const prongGeo = new THREE.ConeGeometry(0.6, 4, 6);
  const pL = new THREE.Mesh(prongGeo, hullMat);
  pL.rotation.x = Math.PI / 2;
  pL.position.set(-2.4, 0, -1.2);
  g.add(pL);
  const pR = pL.clone();
  pR.position.x = 2.4;
  g.add(pR);

  // Central eye.
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), glowMat);
  eye.position.z = -1.6;
  g.add(eye);

  g.userData.glow = [eye];
  g.userData.muzzles = [new THREE.Vector3(0, 0, -2.2)];
  return g;
}

// Big alien mothership: dark hulk with multiple turret nubs and a core eye.
export function buildMothership() {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1c1226,
    metalness: 0.7,
    roughness: 0.6,
    emissive: 0x150418,
    emissiveIntensity: 0.4,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff2a5a,
    emissive: 0xff1a4a,
    emissiveIntensity: 3,
  });

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(60, 2), hullMat);
  body.scale.set(1.6, 0.6, 1.1);
  g.add(body);

  // Spine ridge.
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 110), hullMat);
  g.add(ridge);

  // Core eye (the final weak point).
  const core = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 24), glowMat);
  core.position.set(0, 0, -50);
  g.add(core);
  g.userData.core = core;

  // Turret mount points (filled by Mothership entity).
  g.userData.turretMounts = [
    new THREE.Vector3(-55, 6, -20),
    new THREE.Vector3(55, 6, -20),
    new THREE.Vector3(-40, 6, 30),
    new THREE.Vector3(40, 6, 30),
  ];
  return g;
}
