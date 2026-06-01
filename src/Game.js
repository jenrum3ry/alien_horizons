import * as THREE from 'three';
import { FixedClock } from './core/Clock.js';
import { Input } from './core/Input.js';
import { TouchInput } from './core/TouchInput.js';
import { SceneSetup } from './scene/SceneSetup.js';
import { Starfield } from './scene/Starfield.js';
import { Earth } from './scene/Earth.js';
import { ThirdPersonCamera } from './scene/ThirdPersonCamera.js';
import { PlayerShip } from './entities/PlayerShip.js';
import { Mothership } from './entities/Mothership.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { EnemySpawner } from './systems/EnemySpawner.js';
import { resolveCollisions } from './systems/Collisions.js';
import { MissionManager } from './missions/MissionManager.js';
import { HUD } from './ui/HUD.js';
import { Menus } from './ui/Menus.js';

// States
const S = { MENU: 'menu', BRIEFING: 'briefing', PLAYING: 'playing', WON: 'won', LOST: 'lost' };

export class Game {
  constructor(canvas, uiRoot) {
    this.scene = new SceneSetup(canvas);
    // Two interchangeable input backends; the active one is chosen at the menu.
    this.desktopInput = new Input(canvas);
    this.touchInput = new TouchInput(uiRoot);
    this.input = this.desktopInput;
    this.mode = 'desktop';
    // Default the menu selection to touch on touch-capable devices.
    this.defaultMode =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'mobile' : 'desktop';
    this.clock = new FixedClock(1 / 60);
    this.chaseCam = new ThirdPersonCamera(this.scene.camera);

    // World
    this.starfield = new Starfield();
    this.scene.add(this.starfield.group);
    this.earth = new Earth();
    this.scene.add(this.earth.group);

    // Entities
    this.player = new PlayerShip();
    this.scene.add(this.player.mesh);
    this.enemies = [];
    this.mothership = null;

    // Systems
    this.weapons = new WeaponSystem(this.scene.scene);
    this.spawner = new EnemySpawner(this.scene.scene, this.enemies);
    this.spawner.player = this.player; // spawn contacts ahead of the player
    this.missions = new MissionManager();

    // UI
    this.hud = new HUD(uiRoot);
    this.menus = new Menus(uiRoot);

    this.state = S.MENU;
    this._tmpVec = new THREE.Vector3();
    this._collisionCtx = { tmp: new THREE.Vector3() };

    this._bindEscape();
    this._goMenu();
  }

  _bindEscape() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state === S.PLAYING) {
        this.input.exitPointerLock();
      }
    });
    // Re-lock on click while playing.
    this.scene.renderer.domElement.addEventListener('click', () => {
      if (this.state === S.PLAYING && !this.input.pointerLocked) {
        this.input.requestPointerLock();
      }
    });
  }

  // ---------- State transitions ----------
  _goMenu() {
    this.state = S.MENU;
    // Make sure neither input backend is grabbing controls behind the menu.
    this.desktopInput.setEnabled(false);
    this.touchInput.setEnabled(false);
    this.hud.hide();
    this.menus.showMainMenu((mode) => this._startCampaign(mode), this.defaultMode);
  }

  _startCampaign(mode = 'desktop') {
    this.mode = mode;
    this.input = mode === 'mobile' ? this.touchInput : this.desktopInput;
    this.missions.index = 0;
    this._goBriefing(0);
  }

  _goBriefing(index) {
    this.state = S.BRIEFING;
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    this.hud.hide();
    const mission = this.missions.mission && this.missions.index === index
      ? this.missions.mission
      : null;
    const m = mission || this._peekMission(index);
    this.menus.showBriefing(
      m,
      index + 1,
      this.missions.total,
      () => this._startMission(index),
      this.mode
    );
  }

  _peekMission(index) {
    // MissionManager.load mutates state; for briefing we just read the data.
    // Import-free peek: load then we keep it (we start it next anyway).
    return this.missions.load(index);
  }

  _startMission(index) {
    const mission = this.missions.load(index);
    this.state = S.PLAYING;

    // Reset world.
    this.spawner.clearAll();
    this.weapons.reset();
    this.earth.reset();
    this.player.reset(new THREE.Vector3(0, 60, 300));
    this.chaseCam.reset();
    this.spawner.load(mission.waves);

    // Mothership for the boss mission.
    if (this.mothership) {
      this.scene.remove(this.mothership.mesh);
      this.mothership = null;
    }
    if (mission.mothership) {
      this.mothership = new Mothership();
      this.mothership.mesh.position.set(0, 200, -2600);
      this.scene.add(this.mothership.mesh);
    }

    this.menus.clear();
    this.hud.show();
    this.input.setEnabled(true);
    this.input.requestPointerLock();
  }

  _win() {
    this.state = S.WON;
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    this.hud.hide();
    this.menus.showWin(this.missions.mission, this.missions.isLast, () => {
      if (this.missions.isLast) this._goMenu();
      else this._goBriefing(this.missions.index + 1);
    });
  }

  _lose() {
    this.state = S.LOST;
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    this.hud.hide();
    this.menus.showLose(this.missions.mission, () => this._goBriefing(this.missions.index));
  }

  // ---------- Main loop ----------
  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const steps = this.clock.tick();
      if (this.state === S.PLAYING) {
        for (let i = 0; i < steps; i++) this._fixedUpdate(this.clock.step);
      }
      this._render(this.clock.step);
    };
    requestAnimationFrame(loop);
  }

  _fixedUpdate(dt) {
    const control = this.input.consume();

    // Player
    this.player.update(dt, control);
    if (control.fire) this.weapons.tryFirePlayer(this.player, dt);

    // Enemies AI + their fire.
    for (const e of this.enemies) {
      const shot = e.update(dt, this.player, this.earth, null);
      if (shot) this.weapons.fire(shot.origin, shot.dir, 'alien');
    }

    // Mothership
    if (this.mothership && this.mothership.alive) {
      const shots = this.mothership.update(dt, this.player, this.earth);
      for (const s of shots) this.weapons.fire(s.origin, s.dir, 'alien');
    }

    // Spawner
    this.spawner.update(dt, this.earth);

    // Projectiles / explosions
    this.weapons.update(dt);

    // Collisions + events
    this._collisionCtx.weapons = this.weapons;
    this._collisionCtx.enemies = this.enemies;
    this._collisionCtx.player = this.player;
    this._collisionCtx.earth = this.earth;
    this._collisionCtx.mothership = this.mothership;
    this._collisionCtx.events = this._events();
    resolveCollisions(this._collisionCtx);

    this.spawner.cull();
    this.earth.update(dt);

    // Mission win/lose evaluation.
    const verdict = this.missions.update(dt, {
      earthAlive: this.earth.alive,
      enemiesRemaining: this.enemies.length,
      allWavesSpawned: this.spawner.allWavesSpawned,
      mothershipExists: !!this.mothership,
    });
    if (verdict === 'won') this._win();
    else if (verdict === 'lost') this._lose();
  }

  _events() {
    if (this._eventsObj) return this._eventsObj;
    this._eventsObj = {
      onEnemyKilled: (e, byEarth) => {
        this.weapons.spawnExplosion(e.position, 0xff7733, 1.4);
        this.missions.onEnemyKilled();
        if (!byEarth) this.chaseCam.addShake(0.15);
      },
      onTurretKilled: () => {
        this.chaseCam.addShake(0.3);
      },
      onMothershipDestroyed: (ms, pos) => {
        this.missions.onMothershipDestroyed();
        // Big multi-burst finale.
        for (let i = 0; i < 6; i++) {
          const p = pos.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 120,
              (Math.random() - 0.5) * 60,
              (Math.random() - 0.5) * 120
            )
          );
          this.weapons.spawnExplosion(p, 0xff66aa, 3);
        }
        this.chaseCam.addShake(1);
        this.scene.remove(ms.mesh);
        this.mothership = null;
      },
      onPlayerKilled: () => {
        // Player death = Earth's last defender lost → mission failed.
        this.weapons.spawnExplosion(this.player.position, 0x66ccff, 2.5);
        this.chaseCam.addShake(1);
        this.earth.health = 0; // trigger lose on next eval
      },
    };
    return this._eventsObj;
  }

  _render(dt) {
    // Camera + starfield follow even outside PLAYING for a live backdrop.
    if (this.state === S.PLAYING) {
      this.chaseCam.update(dt, this.player.mesh, this.player.boostLevel);
      this.hud.update({
        player: this.player,
        earth: this.earth,
        enemies: this.enemies,
        mission: this.missions,
        camera: this.scene.camera,
        mothership: this.mothership,
      });
    } else {
      // Slow orbit of Earth behind menus.
      const t = performance.now() / 1000;
      this.scene.camera.position.set(Math.cos(t * 0.05) * 600, 120, Math.sin(t * 0.05) * 600);
      this.scene.camera.lookAt(this.earth.center);
      this.earth.update(dt);
    }
    this.starfield.update(this.scene.camera.position);
    this.scene.render();
  }
}
