// Touch / on-screen controls for mobile play. Mirrors the desktop Input's
// public surface (setEnabled, consume, requestPointerLock/exitPointerLock,
// pointerLocked) so Game can use either interchangeably.
//
// Layout: a floating virtual joystick on the left half steers pitch/yaw; a
// cluster of hold-buttons on the right fires, boosts, brakes and rolls.
export class TouchInput {
  constructor(uiRoot) {
    this.enabled = false;
    // Touch has no pointer lock; report locked so Game never tries to grab it.
    this.pointerLocked = true;

    // Normalized joystick deflection, -1..1 (x = right, y = down).
    this._jx = 0;
    this._jy = 0;
    this._joyPointer = null; // pointerId currently driving the stick
    this._joyOrigin = { x: 0, y: 0 };
    this.maxRadius = 70;

    this._fire = false;
    this._boost = false;
    this._brake = false;
    this._rollL = false;
    this._rollR = false;

    this._buildDom(uiRoot);
    this._bind();
  }

  _buildDom(root) {
    this.el = document.createElement('div');
    this.el.className = 'touch-controls hidden';
    this.el.innerHTML = `
      <div class="touch-zone" data-joyzone>
        <div class="joy-base hidden" data-joybase>
          <div class="joy-knob" data-joyknob></div>
        </div>
        <div class="touch-hint">Drag to steer</div>
      </div>
      <div class="touch-buttons">
        <div class="roll-row">
          <button class="touch-btn small" data-btn="rollL">⟲</button>
          <button class="touch-btn small" data-btn="rollR">⟳</button>
        </div>
        <button class="touch-btn boost" data-btn="boost">BOOST</button>
        <button class="touch-btn brake" data-btn="brake">BRAKE</button>
        <button class="touch-btn fire" data-btn="fire">FIRE</button>
      </div>
    `;
    root.appendChild(this.el);

    this.zone = this.el.querySelector('[data-joyzone]');
    this.base = this.el.querySelector('[data-joybase]');
    this.knob = this.el.querySelector('[data-joyknob]');
  }

  _bind() {
    // --- Joystick (floating) ---
    this.zone.addEventListener('pointerdown', (e) => {
      if (this._joyPointer !== null) return;
      this._joyPointer = e.pointerId;
      this._joyOrigin.x = e.clientX;
      this._joyOrigin.y = e.clientY;
      this.base.style.left = e.clientX + 'px';
      this.base.style.top = e.clientY + 'px';
      this.base.classList.remove('hidden');
      this._updateKnob(0, 0);
      // Capture so we keep getting moves even as the finger leaves the zone.
      // Can throw InvalidPointerId if the pointer is already gone — ignore.
      try {
        this.zone.setPointerCapture(e.pointerId);
      } catch (err) {
        /* pointer no longer active */
      }
      e.preventDefault();
    });
    this.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._joyPointer) return;
      let dx = e.clientX - this._joyOrigin.x;
      let dy = e.clientY - this._joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > this.maxRadius) {
        dx = (dx / len) * this.maxRadius;
        dy = (dy / len) * this.maxRadius;
      }
      this._jx = dx / this.maxRadius;
      this._jy = dy / this.maxRadius;
      this._updateKnob(dx, dy);
      e.preventDefault();
    });
    const endJoy = (e) => {
      if (e.pointerId !== this._joyPointer) return;
      this._joyPointer = null;
      this._jx = 0;
      this._jy = 0;
      this.base.classList.add('hidden');
    };
    this.zone.addEventListener('pointerup', endJoy);
    this.zone.addEventListener('pointercancel', endJoy);
    // System gestures / interruptions may steal the pointer without firing
    // up/cancel — reset on capture loss so the stick never sticks.
    this.zone.addEventListener('lostpointercapture', endJoy);

    // --- Hold buttons ---
    // No pointer capture here: that lets pointerleave fire so sliding a finger
    // off a button cancels its action.
    const map = { fire: '_fire', boost: '_boost', brake: '_brake', rollL: '_rollL', rollR: '_rollR' };
    for (const btn of this.el.querySelectorAll('[data-btn]')) {
      const prop = map[btn.dataset.btn];
      const down = (e) => {
        this[prop] = true;
        btn.classList.add('active');
        e.preventDefault();
      };
      const up = (e) => {
        this[prop] = false;
        btn.classList.remove('active');
        e.preventDefault();
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
  }

  _updateKnob(dx, dy) {
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  setEnabled(on) {
    this.enabled = on;
    this.el.classList.toggle('hidden', !on);
    if (!on) {
      this._jx = this._jy = 0;
      this._fire = this._boost = this._brake = this._rollL = this._rollR = false;
      this._joyPointer = null;
      this.base.classList.add('hidden');
      for (const b of this.el.querySelectorAll('[data-btn]')) b.classList.remove('active');
    }
  }

  // No-ops so Game can call these without branching on input type.
  requestPointerLock() {}
  exitPointerLock() {}

  // Same control shape as Input.consume(). Quadratic response on the stick for
  // finer control near centre; matches keyboard's ±100 range at full deflection.
  consume() {
    const curve = (v) => v * Math.abs(v) * 100;
    return {
      pitch: curve(this._jy),
      yaw: curve(this._jx),
      roll: (this._rollR ? 1 : 0) - (this._rollL ? 1 : 0),
      throttle: 0,
      boost: this._boost,
      brake: this._brake,
      fire: this._fire,
      mouseDX: 0,
      mouseDY: 0,
    };
  }
}
