import { MISSIONS } from './missions.js';

// Tracks the active mission's objective progress and decides win/lose.
// Logic only — content lives in missions.js.
export class MissionManager {
  constructor() {
    this.index = 0;
    this.mission = null;
    this.kills = 0;
    this.timeElapsed = 0;
    this.state = 'idle'; // idle | active | won | lost
    this.mothershipDead = false;
  }

  get isLast() {
    return this.index >= MISSIONS.length - 1;
  }

  get total() {
    return MISSIONS.length;
  }

  load(index) {
    this.index = index;
    this.mission = MISSIONS[index];
    this.kills = 0;
    this.timeElapsed = 0;
    this.state = 'active';
    this.mothershipDead = false;
    return this.mission;
  }

  next() {
    if (this.isLast) return null;
    return this.load(this.index + 1);
  }

  onEnemyKilled() {
    this.kills++;
  }

  onMothershipDestroyed() {
    this.mothershipDead = true;
  }

  // Returns human-readable objective progress for the HUD.
  objectiveStatus() {
    const o = this.mission.objective;
    if (o.type === 'destroyCount') {
      return { label: o.label, progress: `${Math.min(this.kills, o.target)} / ${o.target}` };
    }
    if (o.type === 'survive') {
      const remaining = Math.max(0, Math.ceil(o.duration - this.timeElapsed));
      return { label: 'Defend Earth', progress: formatTime(remaining) };
    }
    if (o.type === 'killMothership') {
      return { label: o.label, progress: this.mothershipDead ? 'COMPLETE' : 'ACTIVE' };
    }
    return { label: o.label || '', progress: '' };
  }

  // Evaluate win/lose each tick. Returns 'won' | 'lost' | null.
  update(dt, { earthAlive, enemiesRemaining, allWavesSpawned, mothershipExists }) {
    if (this.state !== 'active') return null;
    this.timeElapsed += dt;

    if (!earthAlive) {
      this.state = 'lost';
      return 'lost';
    }

    const o = this.mission.objective;
    if (o.type === 'destroyCount') {
      if (this.kills >= o.target) {
        this.state = 'won';
        return 'won';
      }
    } else if (o.type === 'survive') {
      if (this.timeElapsed >= o.duration) {
        this.state = 'won';
        return 'won';
      }
    } else if (o.type === 'killMothership') {
      if (this.mothershipDead) {
        this.state = 'won';
        return 'won';
      }
    }
    return null;
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
