// Fixed-timestep accumulator. Keeps physics/AI deterministic and frame-rate
// independent. The render step interpolates implicitly because dt is constant.
export class FixedClock {
  constructor(step = 1 / 60, maxSubSteps = 5) {
    this.step = step;
    this.maxSubSteps = maxSubSteps;
    this.accumulator = 0;
    this.last = performance.now() / 1000;
    this.elapsed = 0;
  }

  // Returns the number of fixed steps to run this frame. Each consumes `this.step`.
  // Usage: for (let i = tick(); i > 0; i--) update(step);
  tick() {
    const now = performance.now() / 1000;
    let frame = now - this.last;
    this.last = now;
    // Avoid spiral-of-death after a tab stall.
    if (frame > 0.25) frame = 0.25;
    this.accumulator += frame;

    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSubSteps) {
      this.accumulator -= this.step;
      steps++;
      this.elapsed += this.step;
    }
    // Drop leftover time if we hit the cap, to stay responsive.
    if (steps === this.maxSubSteps) this.accumulator = 0;
    return steps;
  }
}
