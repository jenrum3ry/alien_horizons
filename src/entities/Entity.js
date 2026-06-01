import * as THREE from 'three';

// Common base for all moving objects. Holds a mesh, velocity, a bounding-sphere
// radius for broadphase collisions, faction tag and health.
export class Entity {
  constructor(mesh, { faction = 'neutral', radius = 5, hp = 1 } = {}) {
    this.mesh = mesh;
    this.faction = faction;
    this.radius = radius;
    this.hp = hp;
    this.maxHp = hp;
    this.velocity = new THREE.Vector3();
    this.alive = true;
  }

  get position() {
    return this.mesh.position;
  }

  get quaternion() {
    return this.mesh.quaternion;
  }

  // Returns true if this hit was fatal.
  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }
}
