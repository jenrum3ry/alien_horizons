// Broadphase sphere collisions. Resolves projectile hits against ships, the
// mothership (turrets + core) and Earth, plus enemy ships ramming Earth.
// Emits gameplay events back through the provided callbacks object.
export function resolveCollisions(ctx) {
  const { weapons, enemies, player, earth, mothership, events } = ctx;

  weapons.projectiles.update((p) => {
    if (!p.alive) return true;
    const pos = p.mesh.position;

    if (p.faction === 'player') {
      // vs enemy fighters
      for (const e of enemies) {
        if (!e.alive) continue;
        if (within(pos, e.position, p.radius + e.radius)) {
          const dead = e.takeDamage(p.damage);
          weapons.spawnExplosion(pos, 0xffaa33, dead ? 1.6 : 0.4);
          if (dead) events.onEnemyKilled(e);
          return true; // consume projectile
        }
      }
      // vs mothership turrets + core
      if (mothership && mothership.alive) {
        for (const t of mothership.turrets) {
          if (!t.alive) continue;
          if (within(pos, t.worldPos, p.radius + t.radius)) {
            const dead = t.takeDamage(p.damage);
            weapons.spawnExplosion(pos, 0xff4466, dead ? 2 : 0.5);
            if (dead) events.onTurretKilled(mothership);
            return true;
          }
        }
        // core (only matters when vulnerable, but still blocks shots)
        const coreWorld = ctx.tmp;
        mothership.core.getWorldPosition(coreWorld);
        if (within(pos, coreWorld, p.radius + 14)) {
          const result = mothership.damageCore(p.damage);
          weapons.spawnExplosion(pos, result === 'shielded' ? 0x4488ff : 0xff66aa, 0.6);
          if (result === 'destroyed') events.onMothershipDestroyed(mothership, coreWorld);
          return true;
        }
      }
    } else {
      // enemy projectile vs player
      if (player && player.alive && within(pos, player.position, p.radius + player.radius)) {
        const dead = player.takeDamage(p.damage);
        weapons.spawnExplosion(pos, 0x66bbff, 0.4);
        if (dead) events.onPlayerKilled();
        return true;
      }
    }
    return false;
  });

  // Enemy fighters ramming Earth: damage Earth and self-destruct.
  if (earth && earth.alive) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (within(e.position, earth.center, e.radius + earth.radius)) {
        earth.damage(8);
        e.alive = false;
        weapons.spawnExplosion(e.position, 0xff8844, 1.4);
        events.onEnemyKilled(e, true);
      }
    }
    // Mothership reaching Earth is catastrophic.
    if (mothership && mothership.alive) {
      if (within(mothership.position, earth.center, mothership.radius + earth.radius)) {
        earth.damage(100);
      }
    }
  }
}

function within(a, b, r) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz <= r * r;
}
