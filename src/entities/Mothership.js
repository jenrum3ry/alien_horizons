import * as THREE from 'three';
import { Entity } from './Entity.js';
import { buildMothership } from './ShipFactory.js';

// Boss craft. Turrets must be destroyed before the core becomes vulnerable.
// Slowly advances toward Earth and bombards it while alive.
const _toPlayer = new THREE.Vector3();
const _fwd = new THREE.Vector3();

class Turret {
  constructor(mesh, localPos) {
    this.mesh = mesh; // visual nub
    this.localPos = localPos;
    this.hp = 25;
    this.maxHp = 25;
    this.alive = true;
    this.radius = 10;
    this._fireCd = Math.random() * 2;
    this.worldPos = new THREE.Vector3();
  }
  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      return true;
    }
    return false;
  }
}

export class Mothership extends Entity {
  constructor() {
    const mesh = buildMothership();
    super(mesh, { faction: 'alien', radius: 75, hp: 1 });
    this.core = mesh.userData.core;
    this.coreHp = 120;
    this.coreMaxHp = 120;
    this.coreVulnerable = false;

    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x3a1030,
      emissive: 0xff2244,
      emissiveIntensity: 1.5,
      metalness: 0.6,
      roughness: 0.5,
    });
    this.turrets = [];
    for (const mount of mesh.userData.turretMounts) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), turretMat);
      t.position.copy(mount);
      mesh.add(t);
      this.turrets.push(new Turret(t, mount.clone()));
    }
    this.speed = 22;
  }

  get aliveTurrets() {
    return this.turrets.filter((t) => t.alive).length;
  }

  // Damage routing: caller checks which sub-target was hit. Helper below.
  // Returns 'destroyed' if the whole ship dies.
  damageCore(amount) {
    if (!this.coreVulnerable) return 'shielded';
    this.coreHp -= amount;
    this.core.material.emissiveIntensity = 1 + (this.coreHp / this.coreMaxHp) * 2;
    if (this.coreHp <= 0) {
      this.alive = false;
      return 'destroyed';
    }
    return 'hit';
  }

  update(dt, player, earth) {
    if (!this.alive) return [];

    // Reveal core once all turrets are gone.
    if (!this.coreVulnerable && this.aliveTurrets === 0) {
      this.coreVulnerable = true;
      this.core.material.color.setHex(0xff4488);
    }
    // Slow menacing spin + advance toward Earth.
    this.mesh.rotation.y += dt * 0.05;
    if (earth) {
      const dir = earth.center.clone().sub(this.position).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * dt);
    }

    // Keep turret world positions current for collision tests.
    for (const t of this.turrets) {
      if (t.alive) t.mesh.getWorldPosition(t.worldPos);
    }

    // Turret fire at player.
    const shots = [];
    if (player && player.alive) {
      for (const t of this.turrets) {
        if (!t.alive) continue;
        t._fireCd -= dt;
        if (t._fireCd <= 0) {
          t._fireCd = 2.0 + Math.random();
          _toPlayer.copy(player.position).sub(t.worldPos).normalize();
          shots.push({ origin: t.worldPos.clone(), dir: _toPlayer.clone() });
        }
      }
    }
    return shots;
  }
}
