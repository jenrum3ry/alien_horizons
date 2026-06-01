// Full-screen overlays: main menu, mission briefing, win/lose screens.
// Each show* method renders an overlay and resolves a callback on the button.
export class Menus {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.root.appendChild(this.el);
  }

  clear() {
    this.el.innerHTML = '';
  }

  _overlay(html, extraClass = '') {
    this.el.innerHTML = `<div class="overlay flash ${extraClass}">${html}</div>`;
    return this.el.querySelector('.overlay');
  }

  showMainMenu(onStart) {
    this._overlay(`
      <div class="sub">Earth · Year 2099 · Final Defense</div>
      <h1>ALIEN HORIZONS</h1>
      <p>An armada has crossed the dark between stars. You are humanity's last interceptor pilot.
         Fly. Fight. Save the Earth.</p>
      <button class="btn" data-start>Launch Campaign</button>
      <div class="controls-help">
        <b>Mouse</b><span>Steer (pitch / yaw)</span>
        <b>Left Click</b><span>Fire lasers</span>
        <b>Shift</b><span>Boost</span>
        <b>Space</b><span>Air-brake</span>
        <b>Q / E</b><span>Roll left / right</span>
        <b>↑ / ↓</b><span>Throttle</span>
      </div>
    `);
    this.el.querySelector('[data-start]').addEventListener('click', onStart);
  }

  showBriefing(mission, missionNumber, total, onLaunch) {
    this._overlay(`
      <div class="sub">Mission ${missionNumber} of ${total}</div>
      <h2>${mission.name}</h2>
      <p>${mission.briefing}</p>
      <p class="objective" style="font-size:18px"><b>Objective:</b> ${mission.objective.label}</p>
      <button class="btn" data-launch>Begin Mission</button>
      <div class="sub" style="margin-top:6px">Click to lock controls · ESC releases the mouse</div>
    `);
    this.el.querySelector('[data-launch]').addEventListener('click', onLaunch);
  }

  showWin(mission, isLast, onNext) {
    this._overlay(
      `
      <div class="sub">Objective Complete</div>
      <h1>${isLast ? 'EARTH IS SAVED' : 'MISSION ACCOMPLISHED'}</h1>
      <p>${
        isLast
          ? 'The Mothership burns in the upper atmosphere. The armada scatters. Humanity endures — because of you, pilot.'
          : 'Sector secured. But the armada keeps coming. Re-arm and prepare for the next engagement.'
      }</p>
      <button class="btn" data-next>${isLast ? 'Play Again' : 'Next Mission'}</button>
    `,
      'win'
    );
    this.el.querySelector('[data-next]').addEventListener('click', onNext);
  }

  showLose(mission, onRetry) {
    this._overlay(
      `
      <div class="sub">Mission Failed</div>
      <h1>EARTH HAS FALLEN</h1>
      <p>The defense grid is gone and the skies belong to them. But there is always another timeline,
         another chance. Try again, pilot.</p>
      <button class="btn" data-retry>Retry Mission</button>
    `,
      'lose'
    );
    this.el.querySelector('[data-retry]').addEventListener('click', onRetry);
  }
}
