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
    // Reinforcements: keep at least `sustainMin` aliens alive so there's always
    // something to lock onto and shoot. Topped up on an interval.
    this.sustainMin = 0;
    this.sustainInterval = 2.0;
    this._sustainTimer = 0;
  }

  // waves: [{ at, count, variant, fromEarth }]
  load(waves, sustainMin = 0) {
    this.waves = waves ? waves.map((w) => ({ ...w, done: false })) : [];
    this.timer = 0;
    this._waveIndex = 0;
    this.totalSpawned = 0;
    this.sustainMin = sustainMin;
    // Small initial delay so reinforcements don't pile onto the opening wave.
    this._sustainTimer = 3;
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
        this._spawnWave(w);
        w.done = true;
      }
    }

    // Reinforcements: top the field back up to the minimum on a steady interval.
    if (this.sustainMin > 0) {
      if (this.enemies.length >= this.sustainMin) {
        // Field is full — hold the timer so pacing stays consistent (and it
        // can't drift to large negative values) before the next drop.
        this._sustainTimer = this.sustainInterval;
      } else {
        this._sustainTimer -= dt;
        if (this._sustainTimer <= 0) {
          const need = Math.min(2, this.sustainMin - this.enemies.length);
          for (let i = 0; i < need; i++) this._spawnReinforcement();
          this._sustainTimer = this.sustainInterval;
        }
      }
    }
  }

  _spawnWave(wave) {
    const count = wave.count || 3;
    const variant = wave.variant || 'fighter';
    for (let i = 0; i < count; i++) {
      // Spread fighters across the cone; a lone fighter spawns centred (0.5).
      const ratio = count > 1 ? i / (count - 1) : 0.5;
      this._spawnEnemy(variant, ratio, false);
    }
  }

  // A reinforcement: a random fighter that always hunts the player, so the
  // field stays populated with lockable targets near the action.
  _spawnReinforcement() {
    const variants = ['fighter', 'drone', 'raider'];
    const variant = variants[(Math.random() * variants.length) | 0];
    this._spawnEnemy(variant, Math.random(), true);
  }

  // Place one enemy in a loose cone ahead of the player so it appears on-screen
  // rather than behind or kilometres away. `ratio` (0..1) biases it left↔right.
  _spawnEnemy(variant, ratio, forceHunt) {
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

    const e = new EnemyShip(variant);
    const dist = 320 + Math.random() * 260; // 320–580 units ahead
    const spreadX = (ratio - 0.5) * 440 + (Math.random() - 0.5) * 140;
    const spreadY = (Math.random() - 0.5) * 240;
    e.mesh.position
      .copy(origin)
      .addScaledVector(fwd, dist)
      .addScaledVector(right, spreadX)
      .addScaledVector(up, spreadY);
    if (forceHunt) e.role = 'hunt';
    this.scene.add(e.mesh);
    this.enemies.push(e);
    this.totalSpawned++;
    return e;
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
