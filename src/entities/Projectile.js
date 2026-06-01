import * as THREE from 'three';

// A single laser bolt. Created via the Pool in WeaponSystem; reset on acquire.
// Shared geometry/materials by faction to keep draw state minimal.
const boltGeo = new THREE.CylinderGeometry(0.18, 0.18, 4, 6);
boltGeo.rotateX(Math.PI / 2); // align length with -Z

const matCache = {};
function boltMaterial(color) {
  if (!matCache[color]) {
    matCache[color] = new THREE.MeshBasicMaterial({ color });
  }
  return matCache[color];
}

export class Projectile {
  constructor() {
    this.mesh = new THREE.Mesh(boltGeo, boltMaterial(0x66ddff));
    this.mesh.visible = false;
    this.velocity = new THREE.Vector3();
    this.life = 0;
    this.faction = 'player';
    this.damage = 1;
    this.radius = 2;
    this.alive = false;
  }

  // origin: Vector3, dir: normalized Vector3, speed, faction, color
  spawn(origin, dir, speed, faction, color, damage) {
    this.mesh.position.copy(origin);
    this.velocity.copy(dir).multiplyScalar(speed);
    this.mesh.material = boltMaterial(color);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    this.faction = faction;
    this.damage = damage;
    this.life = 2.5;
    this.alive = true;
    this.mesh.visible = true;
  }

  update(dt) {
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
    return !this.alive;
  }

  deactivate() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
