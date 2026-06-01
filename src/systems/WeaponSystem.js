import * as THREE from 'three';
import { Pool } from '../core/Pools.js';
import { Projectile } from '../entities/Projectile.js';
import { Explosion } from '../entities/Explosion.js';

// Pre-allocated temporaries reused by the player firing loop to avoid GC churn.
const _tempDir = new THREE.Vector3();
const _tempMuzzle = new THREE.Vector3();

// Owns projectile + explosion pools and the player's fire-rate gate.
export class WeaponSystem {
  constructor(scene) {
    this.scene = scene;

    this.projectiles = new Pool(
      () => {
        const p = new Projectile();
        scene.add(p.mesh);
        return p;
      },
      () => {}, // spawn() handles reset
      80
    );

    this.explosions = new Pool(
      () => {
        const e = new Explosion();
        scene.add(e.mesh);
        return e;
      },
      () => {},
      24
    );

    this.playerFireRate = 7; // shots/sec
    this._playerCd = 0;
    this._muzzleToggle = 0;
  }

  reset() {
    // Release and hide every active projectile/explosion so none linger in the
    // scene across a mission reset or transition.
    this.projectiles.update((p) => {
      p.deactivate();
      return true;
    });
    this.explosions.update((e) => {
      e.alive = false;
      e.points.visible = false;
      return true;
    });
    this._playerCd = 0;
  }

  fire(origin, dir, faction) {
    const color = faction === 'player' ? 0x66ddff : 0xff5544;
    const speed = faction === 'player' ? 1100 : 700;
    const damage = faction === 'player' ? 4 : 6;
    const p = this.projectiles.acquire();
    p.spawn(origin, dir.clone().normalize(), speed, faction, color, damage);
    return p;
  }

  // Player firing from both muzzles, rate-limited. Each bolt is aimed at
  // `aimPoint` (the locked target, or a point under the crosshair) so shots
  // converge where the player is looking instead of along the ship's nose —
  // which is what makes 3rd-person aiming feel "off".
  tryFirePlayer(player, dt, aimPoint) {
    this._playerCd -= dt;
    if (this._playerCd > 0) return false;
    this._playerCd = 1 / this.playerFireRate;
    for (const m of player.muzzles) {
      _tempMuzzle.copy(m).applyQuaternion(player.quaternion).add(player.position);
      if (aimPoint) _tempDir.copy(aimPoint).sub(_tempMuzzle).normalize();
      else player.getForward(_tempDir);
      this.fire(_tempMuzzle, _tempDir, 'player');
    }
    return true;
  }

  spawnExplosion(position, color, scale) {
    this.explosions.acquire().spawn(position, color, scale);
  }

  update(dt) {
    this.projectiles.update((p) => p.update(dt));
    this.explosions.update((e) => e.update(dt));
  }
}
