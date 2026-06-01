// Generic object pool to avoid GC churn for short-lived FX (lasers, explosions).
// The factory creates an instance; reset(obj, ...args) re-initialises it on acquire.
export class Pool {
  constructor(factory, reset, initial = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initial; i++) this.free.push(this.factory());
  }

  acquire(...args) {
    const obj = this.free.pop() || this.factory();
    this.reset(obj, ...args);
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const i = this.active.indexOf(obj);
    if (i !== -1) {
      this.active.splice(i, 1);
      this.free.push(obj);
    }
  }

  // Iterate active objects; if cb returns true the object is released.
  update(cb) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (cb(obj)) {
        this.active.splice(i, 1);
        this.free.push(obj);
      }
    }
  }

  forEach(cb) {
    for (let i = 0; i < this.active.length; i++) cb(this.active[i]);
  }
}
