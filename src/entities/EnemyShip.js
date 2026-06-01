import * as THREE from 'three';
import { Entity } from './Entity.js';
import { buildAlienFighter } from './ShipFactory.js';

// Alien fighter with simple combat AI. Two modes:
//  - 'hunt': pursue and strafe the player, firing when aligned.
//  - 'strike': dive toward Earth to damage it, peeling off if the player is close.
// Variants scale speed/hp/aggression.
const _toTarget = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _desiredQ = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _strafe = new THREE.Vector3();

export class EnemyShip extends Entity {
  constructor(variant = 'fighter') {
    const mesh = buildAlienFighter();
    const stats = {
      fighter: { hp: 8, speed: 180, turn: 1.4, fireRate: 1.2, range: 600 },
      raider: { hp: 14, speed: 150, turn: 1.1, fireRate: 0.9, range: 700 },
      drone: { hp: 4, speed: 220, turn: 1.8, fireRate: 1.6, range: 500 },
    }[variant] || { hp: 8, speed: 180, turn: 1.4, fireRate: 1.2, range: 600 };

    super(mesh, { faction: 'alien', radius: 4, hp: stats.hp });
    this.variant = variant;
    this.speed = stats.speed;
    this.turnRate = stats.turn;
    this.fireRate = stats.fireRate;
    this.range = stats.range;
    this._fireCd = Math.random() * 1.5;
    this.glow = mesh.userData.glow || [];
    this.muzzles = mesh.userData.muzzles || [];
    // Each fighter picks a role; ~40% go after Earth.
    this.role = Math.random() < 0.4 ? 'strike' : 'hunt';
    this._strafePhase = Math.random() * Math.PI * 2;
  }

  // Returns a fire request {origin, dir} or null. weapon firing handled by caller.
  update(dt, player, earth, ctx) {
    if (!this.alive) return null;
    this._strafePhase += dt;

    // Decide target point.
    let targetPos;
    if (this.role === 'strike' && earth && earth.alive) {
      targetPos = earth.center;
      // If player is dangerously close, switch to evasive hunt briefly.
      if (player && player.alive && this.position.distanceTo(player.position) < 220) {
        targetPos = player.position;
      }
    } else if (player && player.alive) {
      targetPos = player.position;
    } else if (earth) {
      targetPos = earth.center;
    } else {
      return null;
    }

    _toTarget.copy(targetPos).sub(this.position);
    const dist = _toTarget.length();
    _toTarget.normalize();

    // Add a strafing sideways component when hunting and close, so they circle.
    if (this.role === 'hunt' && dist < this.range) {
      _strafe.set(Math.cos(this._strafePhase), Math.sin(this._strafePhase * 0.7), 0);
      _toTarget.addScaledVector(_strafe, 0.5).normalize();
    }

    // Steer toward desired direction (slerp the quaternion).
    _m.lookAt(new THREE.Vector3(0, 0, 0), _toTarget.clone().multiplyScalar(-1), _up);
    _desiredQ.setFromRotationMatrix(_m);
    this.mesh.quaternion.slerp(_desiredQ, Math.min(1, this.turnRate * dt));

    // Move forward.
    _fwd.set(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    this.mesh.position.addScaledVector(_fwd, this.speed * dt);

    // Pulse glow.
    const g = 3 + Math.sin(this._strafePhase * 4) * 0.6;
    for (const e of this.glow) e.material.emissiveIntensity = g;

    // Fire if roughly aligned and in range of a combat target.
    this._fireCd -= dt;
    const aligned = _fwd.dot(_toTarget) > 0.95;
    const combatTarget = this.role === 'hunt' || (targetPos === player?.position);
    if (this._fireCd <= 0 && aligned && combatTarget && dist < this.range) {
      this._fireCd = 1 / this.fireRate;
      const origin = this.muzzles[0].clone().applyQuaternion(this.mesh.quaternion).add(this.position);
      return { origin, dir: _fwd.clone() };
    }
    return null;
  }
}
