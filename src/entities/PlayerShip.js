import * as THREE from 'three';
import { Entity } from './Entity.js';
import { buildPlayerShip } from './ShipFactory.js';

// The player's interceptor. Semi-realistic flight: momentum + drag, mouse/key
// steering, boost/brake, regenerating shields over a hull.
export class PlayerShip extends Entity {
  constructor() {
    const mesh = buildPlayerShip();
    super(mesh, { faction: 'player', radius: 4, hp: 100 });

    // Flight tuning.
    this.baseThrust = 220;
    this.boostThrust = 520;
    this.maxSpeed = 360;
    this.boostMaxSpeed = 640;
    this.drag = 0.7; // per second linear damping factor
    // Analog steering turn rates (radians/second) — applied dt-scaled.
    this.pitchRate = 1.9;
    this.yawRate = 1.7;
    this.rollRate = 2.4;
    this.mouseSensitivity = 0.0022; // mouse-look: radians per pixel
    // Smoothing of the steering input for a less twitchy, weightier feel.
    this._smYaw = 0;
    this._smPitch = 0;

    // Shields / hull.
    this.maxShield = 60;
    this.shield = 60;
    this.shieldRegen = 12; // per second
    this.shieldDelay = 3; // seconds after hit before regen
    this._regenTimer = 0;

    this.speed = 0;
    this.boostLevel = 0; // 0..1 for camera/HUD

    this._fwd = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.engines = mesh.userData.engines || [];
    this.muzzles = mesh.userData.muzzles || [];
  }

  reset(position) {
    this.alive = true;
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this._regenTimer = 0;
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.boostLevel = 0;
    this._smYaw = 0;
    this._smPitch = 0;
    this.mesh.position.copy(position || new THREE.Vector3(0, 0, 0));
    this.mesh.quaternion.identity();
  }

  // control: object from Input.consume()
  update(dt, control) {
    // --- Rotation ---
    // Analog steering (keys / touch stick): smoothed, applied as a turn rate.
    const sYaw = control.steerYaw || 0;
    const sPitch = control.steerPitch || 0;
    const k = 1 - Math.pow(0.0001, dt); // smoothing toward target deflection
    this._smYaw += (sYaw - this._smYaw) * k;
    this._smPitch += (sPitch - this._smPitch) * k;

    // Mouse-look (desktop): raw pixel deltas, applied directly (frame-rate
    // independent because it's a one-shot delta, not a held rate).
    const lookYaw = (control.lookDX || 0) * this.mouseSensitivity;
    const lookPitch = (control.lookDY || 0) * this.mouseSensitivity;

    const yaw = this._smYaw * this.yawRate * dt + lookYaw;
    const pitch = this._smPitch * this.pitchRate * dt + lookPitch;

    // Apply as local rotations: pitch (X), yaw (Y), roll (Z).
    this._euler.set(-pitch, -yaw, control.roll * this.rollRate * dt);
    this._q.setFromEuler(this._euler);
    this.mesh.quaternion.multiply(this._q);
    this.mesh.quaternion.normalize();

    // --- Thrust along forward (-Z) ---
    this._fwd.set(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    const boosting = control.boost;
    this.boostLevel += ((boosting ? 1 : 0) - this.boostLevel) * Math.min(1, dt * 5);
    const thrust = boosting ? this.boostThrust : this.baseThrust;

    // Throttle keeps a baseline forward push for a flight feel.
    const throttle = 0.6 + Math.max(0, control.throttle) * 0.4;
    this.velocity.addScaledVector(this._fwd, thrust * throttle * dt);

    if (control.brake) {
      this.velocity.multiplyScalar(1 - Math.min(1, dt * 2.5));
    }

    // Linear drag.
    this.velocity.multiplyScalar(1 - Math.min(1, this.drag * dt));

    // Clamp speed.
    const cap = boosting ? this.boostMaxSpeed : this.maxSpeed;
    this.speed = this.velocity.length();
    if (this.speed > cap) {
      this.velocity.multiplyScalar(cap / this.speed);
      this.speed = cap;
    }

    this.mesh.position.addScaledVector(this.velocity, dt);

    // Engine glow scales with boost.
    const glow = 3 + this.boostLevel * 5;
    for (const e of this.engines) e.material.emissiveIntensity = glow;

    // --- Shield regen ---
    if (this._regenTimer > 0) this._regenTimer -= dt;
    else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
    }
  }

  // Override: shields absorb first, then hull.
  takeDamage(amount) {
    this._regenTimer = this.shieldDelay;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount <= 0) return false;
    return super.takeDamage(amount);
  }

  getForward(out) {
    return out.set(0, 0, -1).applyQuaternion(this.mesh.quaternion);
  }
}
