import * as THREE from 'three';

// Spring-follow chase camera that trails behind and above the ship, eases on
// turns, and kicks FOV on boost for a sense of speed.
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.offset = new THREE.Vector3(0, 7, 26); // local: above + behind
    this.lookAhead = 40;

    this._desiredPos = new THREE.Vector3();
    this._desiredLook = new THREE.Vector3();
    this._currentLook = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._initialised = false;
    this._shake = 0;
  }

  addShake(amount) {
    this._shake = Math.min(1.2, this._shake + amount);
  }

  // ship: THREE.Object3D (the player ship mesh group). boost: 0..1
  update(dt, ship, boost = 0) {
    // Desired position: ship position + offset rotated into ship space.
    this._desiredPos.copy(this.offset).applyQuaternion(ship.quaternion).add(ship.position);

    // Look target: a point ahead of the ship.
    this._tmp.set(0, 0, -this.lookAhead).applyQuaternion(ship.quaternion).add(ship.position);
    this._desiredLook.copy(this._tmp);

    if (!this._initialised) {
      this.camera.position.copy(this._desiredPos);
      this._currentLook.copy(this._desiredLook);
      this._initialised = true;
    }

    // Critically-damped-ish smoothing. Position lags more than look for feel.
    const posK = 1 - Math.pow(0.0008, dt);
    const lookK = 1 - Math.pow(0.0001, dt);
    this.camera.position.lerp(this._desiredPos, posK);
    this._currentLook.lerp(this._desiredLook, lookK);

    // Screen shake offset.
    if (this._shake > 0) {
      const s = this._shake * 1.5;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this._shake = Math.max(0, this._shake - dt * 3);
    }

    // Up vector follows ship roll so banking feels right.
    this._tmp.set(0, 1, 0).applyQuaternion(ship.quaternion);
    this.camera.up.copy(this._tmp);
    this.camera.lookAt(this._currentLook);

    // FOV kick on boost.
    const targetFov = this.baseFov + boost * 12;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.pow(0.01, dt));
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this._initialised = false;
    this._shake = 0;
  }
}
