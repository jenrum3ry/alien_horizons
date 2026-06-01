// Centralised input: keyboard + mouse (pointer lock) flight controls.
// Exposes a normalized control state consumed by PlayerShip each tick.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    // Mouse delta accumulated since last consume(), in pixels.
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;
    this.firePrimary = false;
    this.enabled = false;

    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      // Prevent page scroll on space / arrows.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    };
    this._onMouseDown = (e) => {
      if (!this.enabled) return;
      if (e.button === 0) this.firePrimary = true;
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.firePrimary = false;
    };
    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.firePrimary = false;
    }
  }

  requestPointerLock() {
    this.canvas.requestPointerLock?.();
  }

  exitPointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  has(code) {
    return this.keys.has(code);
  }

  // Snapshot the per-tick control state and reset accumulated mouse deltas.
  consume() {
    const state = {
      // Rotational intent (-1..1)
      pitch: 0,
      yaw: 0,
      roll: 0,
      // Throttle / boost / brake
      throttle: 0,
      boost: this.has('ShiftLeft') || this.has('ShiftRight'),
      brake: this.has('Space'),
      fire: this.firePrimary,
      mouseDX: this.mouseDX,
      mouseDY: this.mouseDY,
    };

    // Mouse steers pitch/yaw; keys are an alternative/augment.
    state.yaw += this.mouseDX;
    state.pitch += this.mouseDY;

    if (this.has('KeyW')) state.pitch -= 100; // nose down (look-style: W pitches down)
    if (this.has('KeyS')) state.pitch += 100;
    if (this.has('KeyA')) state.yaw -= 100;
    if (this.has('KeyD')) state.yaw += 100;
    if (this.has('KeyQ')) state.roll -= 1;
    if (this.has('KeyE')) state.roll += 1;

    // Throttle: ArrowUp/Down or always-forward feel. Default mild forward.
    if (this.has('ArrowUp')) state.throttle += 1;
    if (this.has('ArrowDown')) state.throttle -= 1;

    this.mouseDX = 0;
    this.mouseDY = 0;
    return state;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
