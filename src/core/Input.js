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
  // Two rotation channels: `lookDX/lookDY` are raw mouse pixel deltas (applied
  // directly, mouse-look style), and `steerYaw/steerPitch` are analog axes in
  // -1..1 (applied as a dt-scaled turn rate). PlayerShip combines them.
  consume() {
    const state = {
      steerYaw: 0,
      steerPitch: 0,
      roll: 0,
      throttle: 0,
      boost: this.has('ShiftLeft') || this.has('ShiftRight'),
      brake: this.has('Space'),
      fire: this.firePrimary,
      lookDX: this.mouseDX,
      lookDY: this.mouseDY,
    };

    // Keyboard steering axes (held = full deflection).
    if (this.has('KeyW')) state.steerPitch -= 1; // nose down
    if (this.has('KeyS')) state.steerPitch += 1; // nose up
    if (this.has('KeyA')) state.steerYaw -= 1;
    if (this.has('KeyD')) state.steerYaw += 1;
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
