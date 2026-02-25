// =============================================
// CollisionSystem.js — All collision detection
// =============================================

import { Physics } from '../engine/Physics.js';

export class CollisionSystem {
    /**
     * Check all collisions, return events
     */
    update(players, projectiles, meteorites, planets, particles) {
        const events = [];

        // Projectile ↔ Player
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (!proj.active) continue;

            for (const player of players) {
                if (!player.alive) continue;
                if (player.id === proj.ownerId) continue; // No self-damage
                if (player.invulnerable > 0) continue;

                if (Physics.circleCollision(
                    proj.x, proj.y, proj.radius,
                    player.x, player.y, player.radius + 4
                )) {
                    const died = player.takeDamage(proj.damage, proj.ownerId);
                    proj.active = false;

                    // Track shot hit
                    const attacker = players.find(p => p.id === proj.ownerId);
                    if (attacker) {
                        attacker.shotsHit++;
                        attacker.damageDealt += proj.damage;
                    }

                    // Particle effect
                    if (particles) {
                        particles.explosion(proj.x, proj.y, player.color, 8);
                    }

                    if (died) {
                        if (attacker) attacker.kills++;
                        if (particles) {
                            particles.deathEffect(player.x, player.y, player.color);
                        }
                        events.push({
                            type: 'kill',
                            killerId: proj.ownerId,
                            victimId: player.id,
                            killerName: attacker?.name,
                            victimName: player.name
                        });
                    } else {
                        events.push({
                            type: 'hit',
                            targetId: player.id,
                            damage: proj.damage
                        });
                    }
                    break;
                }
            }
        }

        // Projectile ↔ Planet (destroy on impact)
        for (const proj of projectiles) {
            if (!proj.active) continue;
            for (const planet of planets) {
                if (planet.isInside(proj.x, proj.y)) {
                    proj.active = false;
                    if (particles) {
                        particles.emit(proj.x, proj.y, 5, {
                            speed: 40,
                            colors: ['#888', '#666'],
                            size: 2,
                            lifetime: 0.3
                        });
                    }
                    break;
                }
            }
        }

        // Meteorite ↔ Player
        for (const met of meteorites) {
            if (!met.active) continue;
            for (const player of players) {
                if (!player.alive || player.invulnerable > 0) continue;

                if (Physics.circleCollision(
                    met.x, met.y, met.radius,
                    player.x, player.y, player.radius + 2
                )) {
                    const died = player.takeDamage(met.damage);
                    if (particles) {
                        particles.explosion(player.x, player.y, '#ff6600', 15);
                    }
                    if (died) {
                        if (particles) particles.deathEffect(player.x, player.y, player.color);
                        events.push({
                            type: 'kill',
                            killerId: '__meteorite',
                            victimId: player.id,
                            killerName: '☄️ Meteorite',
                            victimName: player.name
                        });
                    }
                }
            }
        }

        // Meteorite ↔ Planet (destroy meteorite)
        for (let i = meteorites.length - 1; i >= 0; i--) {
            const met = meteorites[i];
            if (!met.active) continue;
            for (const planet of planets) {
                if (Physics.circleCollision(
                    met.x, met.y, met.radius * 0.5,
                    planet.x, planet.y, planet.radius
                )) {
                    met.active = false;
                    if (particles) {
                        particles.explosion(met.x, met.y, '#ff6600', 25);
                    }
                    events.push({ type: 'meteorite_impact', x: met.x, y: met.y });
                    break;
                }
            }
        }

        // Clean up inactive projectiles and meteorites
        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (!projectiles[i].active) projectiles.splice(i, 1);
        }
        for (let i = meteorites.length - 1; i >= 0; i--) {
            if (!meteorites[i].active) meteorites.splice(i, 1);
        }

        return events;
    }
}
