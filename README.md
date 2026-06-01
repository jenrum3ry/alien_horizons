# 🛸 Alien Horizons

A semi-realistic, 3rd-person space combat game built with **Three.js** + **Vite**.
An alien armada has crossed the dark between stars — you are humanity's last
interceptor pilot. Fly, fight, and save the Earth across a three-mission campaign.

![Alien Horizons](https://img.shields.io/badge/Three.js-WebGL-5fd0ff) ![Vite](https://img.shields.io/badge/Vite-5-646cff)

## ✨ Features

- **3rd-person flight** with a spring-follow chase camera, momentum-based
  (Newtonian-ish) handling, boost with FOV kick, and air-braking.
- **Semi-realistic space scene**: procedurally shaded Earth with an atmosphere
  shell and city lights on the night side, a 6,000-star field, nebula backdrop,
  and Unreal-bloom post-processing.
- **Combat**: twin laser cannons, regenerating shields over a hull, pooled
  projectiles and particle explosions, screen shake and a damage vignette.
- **Enemies**: alien fighters/raiders/drones with seek-strafe-evade AI that
  also dive-bomb Earth, plus a **Mothership boss** — destroy its turrets to
  expose the vulnerable core.
- **Mission campaign** (data-driven): *First Contact* → *Orbital Defense* →
  *Decapitation*, with briefings, an Earth integrity bar, objective tracking,
  a radar, and win/lose screens.

## 🎮 Controls

| Input | Action |
| --- | --- |
| **Mouse** | Steer (pitch / yaw) |
| **Left Click** | Fire lasers |
| **Shift** | Boost |
| **Space** | Air-brake |
| **Q / E** | Roll left / right |
| **↑ / ↓** | Throttle |
| **Esc** | Release mouse (click to re-lock) |

## 🚀 Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

Build a production bundle:

```bash
npm run build    # outputs to dist/
npm run preview
```

## 🗂️ Project structure

```
src/
  Game.js              # state machine (menu → briefing → playing → won/lost) + loop
  core/                # fixed-timestep clock, input, object pools
  scene/               # renderer + bloom, starfield, Earth, chase camera
  entities/            # player ship, enemy ships, mothership, projectiles, explosions
  systems/             # weapons, collisions, enemy spawner
  missions/            # data-driven mission defs + mission manager
  ui/                  # HUD, menus, styles
```

Ships and the planet are **procedurally generated** (geometry + GLSL shaders) —
no binary art assets, so the game is fully self-contained.
