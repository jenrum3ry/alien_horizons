import * as THREE from 'three';

// In-flight HUD: crosshair, speed, shield/hull bars, Earth health, objective
// tracker, damage vignette and a small radar. Pure DOM, updated each frame.
export class HUD {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.className = 'hud hidden';
    this.el.innerHTML = `
      <div class="crosshair"></div>
      <div class="vignette"></div>

      <div class="hud-panel top-left">
        <div class="objective">
          <div class="obj-label">Objective</div>
          <div><span class="prog" data-obj-prog>—</span></div>
        </div>
        <div class="label-row" style="margin-top:8px"><span>Earth Integrity</span><span data-earth-pct>100%</span></div>
        <div class="bar earth"><span data-earth-bar style="width:100%"></span></div>
      </div>

      <div class="hud-panel bottom-left">
        <div class="label-row"><span>Shields</span><span data-shield-pct>100%</span></div>
        <div class="bar shield"><span data-shield-bar style="width:100%"></span></div>
        <div class="label-row"><span>Hull</span><span data-hull-pct>100%</span></div>
        <div class="bar hull"><span data-hull-bar style="width:100%"></span></div>
      </div>

      <div class="hud-panel top-right">
        <div class="speed"><span data-speed>0</span> <small>m/s</small></div>
        <div class="boost-tag hidden" data-boost>▲ BOOST</div>
        <div data-enemies style="margin-top:6px;opacity:0.85">Contacts: 0</div>
      </div>

      <canvas class="radar" data-radar width="150" height="150"></canvas>
    `;
    root.appendChild(this.el);

    this.objProg = this.el.querySelector('[data-obj-prog]');
    this.objLabel = this.el.querySelector('.obj-label');
    this.earthPct = this.el.querySelector('[data-earth-pct]');
    this.earthBar = this.el.querySelector('[data-earth-bar]');
    this.shieldPct = this.el.querySelector('[data-shield-pct]');
    this.shieldBar = this.el.querySelector('[data-shield-bar]');
    this.hullPct = this.el.querySelector('[data-hull-pct]');
    this.hullBar = this.el.querySelector('[data-hull-bar]');
    this.speedEl = this.el.querySelector('[data-speed]');
    this.boostEl = this.el.querySelector('[data-boost]');
    this.enemiesEl = this.el.querySelector('[data-enemies]');
    this.vignette = this.el.querySelector('.vignette');
    this.radar = this.el.querySelector('[data-radar]');
    this.radarCtx = this.radar.getContext('2d');

    this._lastHull = 100;
    this._tmp = new THREE.Vector3();
  }

  show() {
    this.el.classList.remove('hidden');
  }
  hide() {
    this.el.classList.add('hidden');
  }

  update(state) {
    const { player, earth, enemies, mission, camera, mothership } = state;

    // Objective
    if (mission) {
      const s = mission.objectiveStatus();
      this.objLabel.textContent = s.label;
      this.objProg.textContent = s.progress;
    }

    // Earth
    const ep = Math.round((earth.health / earth.maxHealth) * 100);
    this.earthPct.textContent = ep + '%';
    this.earthBar.style.width = ep + '%';

    // Shields / hull
    const sp = Math.round((player.shield / player.maxShield) * 100);
    const hp = Math.round((player.hp / player.maxHp) * 100);
    this.shieldPct.textContent = sp + '%';
    this.shieldBar.style.width = sp + '%';
    this.hullPct.textContent = hp + '%';
    this.hullBar.style.width = hp + '%';

    // Damage vignette pulse when hull drops.
    if (hp < this._lastHull) {
      this.vignette.style.boxShadow = 'inset 0 0 220px rgba(255,40,70,0.55)';
      setTimeout(() => (this.vignette.style.boxShadow = 'inset 0 0 220px rgba(255,40,70,0)'), 60);
    } else if (hp < 35) {
      const pulse = 0.25 + Math.sin(performance.now() / 250) * 0.12;
      this.vignette.style.boxShadow = `inset 0 0 220px rgba(255,40,70,${pulse})`;
    }
    this._lastHull = hp;

    // Speed + boost
    this.speedEl.textContent = Math.round(player.speed);
    this.boostEl.classList.toggle('hidden', player.boostLevel < 0.4);

    this.enemiesEl.textContent = 'Contacts: ' + enemies.length;

    this._drawRadar(player, enemies, earth, camera, mothership);
  }

  _drawRadar(player, enemies, earth, camera, mothership) {
    const ctx = this.radarCtx;
    const W = 150;
    const C = W / 2;
    ctx.clearRect(0, 0, W, W);
    // backdrop
    ctx.fillStyle = 'rgba(8,16,28,0.7)';
    ctx.beginPath();
    ctx.arc(C, C, C - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,208,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(C, C, (C - 2) / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Player heading basis: project enemies into player's local XZ plane.
    const inv = player.mesh.quaternion.clone().invert();
    const scale = (C - 8) / 1400; // world units to radar px (clamped range)

    const plot = (worldPos, color, size) => {
      this._tmp.copy(worldPos).sub(player.position).applyQuaternion(inv);
      let x = C + this._tmp.x * scale;
      let y = C + this._tmp.z * scale; // forward (-z) shows up top
      // clamp to circle
      const dx = x - C;
      const dy = y - C;
      const d = Math.hypot(dx, dy);
      const max = C - 6;
      if (d > max) {
        x = C + (dx / d) * max;
        y = C + (dy / d) * max;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    };

    // Earth blip (green, large)
    plot(earth.center, '#44ff99', 5);
    // Enemies (red)
    for (const e of enemies) plot(e.position, '#ff4466', 3);
    if (mothership && mothership.alive) plot(mothership.position, '#ff66cc', 6);

    // Player center marker
    ctx.fillStyle = '#5fd0ff';
    ctx.beginPath();
    ctx.moveTo(C, C - 5);
    ctx.lineTo(C - 4, C + 4);
    ctx.lineTo(C + 4, C + 4);
    ctx.closePath();
    ctx.fill();
  }
}
