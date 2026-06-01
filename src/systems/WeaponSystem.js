import * as THREE from 'three';
import { Pool } from '../core/Pools.js';
import { Projectile } from '../entities/Projectile.js';
import { Explosion } from '../entities/Explosion.js';

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
    this.projectiles.update(() => true);
    this.explosions.update(() => true);
    this.projectiles.forEach((p) => p.deactivate());
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

  // Player firing from both muzzles, alternating, rate-limited.
  tryFirePlayer(player, dt) {
    this._playerCd -= dt;
    if (this._playerCd > 0) return false;
    this._playerCd = 1 / this.playerFireRate;
    const dir = new THREE.Vector3();
    player.getForward(dir);
    for (const m of player.muzzles) {
      const origin = m.clone().applyQuaternion(player.quaternion).add(player.position);
      this.fire(origin, dir, 'player');
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
