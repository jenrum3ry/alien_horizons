import * as THREE from 'three';
import { EnemyShip } from '../entities/EnemyShip.js';

// Spawns waves of enemy fighters per the active mission's wave script and tracks
// the live enemy list. Waves trigger by time and/or when the field is cleared.
export class EnemySpawner {
  constructor(scene, enemies) {
    this.scene = scene;
    this.enemies = enemies; // shared live array
    this.waves = [];
    this.timer = 0;
    this._waveIndex = 0;
    this.totalSpawned = 0;
  }

  // waves: [{ at, count, variant, fromEarth }]
  load(waves) {
    this.waves = waves ? waves.map((w) => ({ ...w, done: false })) : [];
    this.timer = 0;
    this._waveIndex = 0;
    this.totalSpawned = 0;
  }

  get allWavesSpawned() {
    return this.waves.every((w) => w.done);
  }

  update(dt, earth) {
    this.timer += dt;
    for (const w of this.waves) {
      if (w.done) continue;
      // Trigger by time, or immediately if `at` omitted and field is clear.
      const timeReady = w.at != null && this.timer >= w.at;
      const clearReady = w.onClear && this.enemies.length === 0 && this.timer > 1;
      if (timeReady || clearReady) {
        this._spawnWave(w, earth);
        w.done = true;
      }
    }
  }

  _spawnWave(wave, earth) {
    const count = wave.count || 3;
    const variant = wave.variant || 'fighter';

    // Spawn in a loose cone ahead of the player so contacts appear on-screen,
    // not behind or kilometres away. Falls back to a fixed forward area.
    const player = this.player;
    const origin = player ? player.position : new THREE.Vector3(0, 60, 300);
    const fwd = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    if (player) {
      fwd.applyQuaternion(player.mesh.quaternion);
      right.applyQuaternion(player.mesh.quaternion);
      up.applyQuaternion(player.mesh.quaternion);
    }

    for (let i = 0; i < count; i++) {
      const e = new EnemyShip(variant);
      const dist = 380 + Math.random() * 320; // 380–700 units ahead
      const spreadX = (i / Math.max(1, count - 1) - 0.5) * 520 + (Math.random() - 0.5) * 160;
      const spreadY = (Math.random() - 0.5) * 280;
      e.mesh.position
        .copy(origin)
        .addScaledVector(fwd, dist)
        .addScaledVector(right, spreadX)
        .addScaledVector(up, spreadY);
      this.scene.add(e.mesh);
      this.enemies.push(e);
      this.totalSpawned++;
    }
  }

  // Remove dead ships from scene + list. Returns count removed this frame.
  cull() {
    let removed = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  clearAll() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies.length = 0;
  }
}
