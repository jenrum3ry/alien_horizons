import * as THREE from 'three';

// A pooled particle burst. Uses an additive Points cloud that expands and fades.
const PARTICLES = 40;

export class Explosion {
  constructor() {
    const positions = new Float32Array(PARTICLES * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._velocities = [];
    for (let i = 0; i < PARTICLES; i++) {
      this._velocities.push(new THREE.Vector3());
    }
    this.material = new THREE.PointsMaterial({
      color: 0xffaa33,
      size: 4,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.mesh = this.points; // for scene add/remove symmetry
    this.points.visible = false;
    this.life = 0;
    this.maxLife = 1;
    this.alive = false;
  }

  spawn(position, color = 0xffaa33, scale = 1) {
    const arr = this.points.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLES; i++) {
      arr[i * 3] = position.x;
      arr[i * 3 + 1] = position.y;
      arr[i * 3 + 2] = position.z;
      const v = this._velocities[i];
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize()
        .multiplyScalar((20 + Math.random() * 40) * scale);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.material.color.setHex(color);
    this.material.size = 4 * scale;
    this.material.opacity = 1;
    this.maxLife = 0.9;
    this.life = this.maxLife;
    this.alive = true;
    this.points.visible = true;
  }

  update(dt) {
    if (!this.alive) return true;
    const arr = this.points.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLES; i++) {
      const v = this._velocities[i];
      arr[i * 3] += v.x * dt;
      arr[i * 3 + 1] += v.y * dt;
      arr[i * 3 + 2] += v.z * dt;
      v.multiplyScalar(1 - dt * 1.5); // drag
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.life -= dt;
    this.material.opacity = Math.max(0, this.life / this.maxLife);
    if (this.life <= 0) {
      this.alive = false;
      this.points.visible = false;
      return true;
    }
    return false;
  }
}
