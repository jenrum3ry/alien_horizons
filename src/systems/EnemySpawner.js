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
    for (let i = 0; i < count; i++) {
      const e = new EnemyShip(variant);
      // Spawn in an arc out in front / around the player area, away from origin.
      const angle = (i / count) * Math.PI * 2 + Math.random();
      const radius = 600 + Math.random() * 600;
      const height = (Math.random() - 0.5) * 400;
      e.mesh.position.set(
        Math.cos(angle) * radius,
        height + 100,
        Math.sin(angle) * radius - 400
      );
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
