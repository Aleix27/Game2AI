// =============================================
// GravitySystem.js — Multi-body gravity simulation (rewritten)
// =============================================

import { Vec2, Physics } from '../engine/Physics.js';

export class GravitySystem {
    constructor() {
        this.surfaceThreshold = 8;
        this.surfaceFriction = 0.85;
    }

    /**
     * Apply gravity from all planets to all entities
     */
    update(entities, planets, dt) {
        for (const entity of entities) {
            if (!entity.alive && entity.alive !== undefined) continue;
            if (!entity.active && entity.active !== undefined) continue;

            this.applyGravity(entity, planets, dt);
        }
    }

    /**
     * Apply gravity and handle surface interaction for a single entity
     */
    applyGravity(entity, planets, dt) {
        const pos = new Vec2(entity.x, entity.y);
        let totalAccel = new Vec2(0, 0);

        // Find nearest planet for grounding
        const { planet: nearest, distance: nearestDist } = Physics.nearestPlanet(pos, planets);

        // Apply gravity from all planets within range
        for (const planet of planets) {
            const dist = pos.distTo(new Vec2(planet.x, planet.y));
            if (dist < planet.gravityRange) {
                const accel = Physics.gravityAccel(pos, planet);
                totalAccel.addMut(accel);
            }
        }

        if (entity.isGrounded !== undefined) {
            // Player-specific ground logic
            this._handlePlayerGravity(entity, nearest, nearestDist, totalAccel, planets, dt);
        } else {
            // Simple entity (projectile, meteorite)
            entity.vx += totalAccel.x * dt;
            entity.vy += totalAccel.y * dt;
        }
    }

    _handlePlayerGravity(player, nearestPlanet, dist, accel, planets, dt) {
        if (!nearestPlanet) return;

        // ───────────────────────────────────────
        // CAN WE LAND? Only if jumpGraceTimer has expired
        // ───────────────────────────────────────
        const canLand = player.jumpGraceTimer <= 0;
        const onSurface = dist <= this.surfaceThreshold;

        if (onSurface && !player.isGrounded && canLand) {
            // Landing
            player.isGrounded = true;
            player.groundedPlanetIndex = -1;
            player.vx *= 0.3;
            player.vy *= 0.3;
        }

        if (player.isGrounded) {
            // ───────────────────────────────────────
            // GROUNDED: stick to surface, allow walking
            // ───────────────────────────────────────
            const surfPoint = Physics.projectToSurface(
                new Vec2(player.x, player.y),
                nearestPlanet
            );
            player.x = surfPoint.x;
            player.y = surfPoint.y;
            player.surfaceAngle = Physics.surfaceAngle(
                new Vec2(player.x, player.y),
                nearestPlanet
            );

            // Surface movement
            let currentMoveSpeed = player.moveSpeed;
            let currentFriction = this.surfaceFriction;

            // --- BIOME EFFECTS ---
            if (nearestPlanet.themeKey === 'ice') {
                currentFriction = 0.98; // Slippery
            } else if (nearestPlanet.themeKey === 'desert') {
                currentMoveSpeed = player.moveSpeed * 0.6; // Sand slows you down
            } else if (nearestPlanet.themeKey === 'lava') {
                // Take burn damage over time (5 dmg per second)
                if (Math.random() < dt * 5) {
                    player.takeDamage(1, 'lava');
                }
            } else if (nearestPlanet.themeKey === 'forest') {
                // Heal slowly (5 hp per second)
                if (player.health < player.maxHealth && Math.random() < dt * 5) {
                    player.health++;
                }
            }

            if (Math.abs(player.moveX) > 0.1) {
                const moveDir = player.moveX > 0 ? 1 : -1;
                const angularSpeed = (currentMoveSpeed / nearestPlanet.radius) * dt;
                player.surfaceAngle += angularSpeed * moveDir;

                const newPos = nearestPlanet.getSurfacePoint(player.surfaceAngle);
                player.x = newPos.x;
                player.y = newPos.y;
                player.facingLeft = moveDir < 0;
            }

            // Dampen velocity on surface
            player.vx *= currentFriction;
            player.vy *= currentFriction;
        } else {
            // ───────────────────────────────────────
            // IN AIR: apply gravity & move
            // ───────────────────────────────────────
            player.vx += accel.x * dt;
            player.vy += accel.y * dt;
            player.x += player.vx * dt;
            player.y += player.vy * dt;

            // Air control
            if (Math.abs(player.moveX) > 0.1) {
                player.vx += player.moveX * player.airControl * dt;
                player.facingLeft = player.moveX < 0;
            }

            // Update surface angle to face nearest planet
            player.surfaceAngle = Physics.surfaceAngle(
                new Vec2(player.x, player.y),
                nearestPlanet
            );

            // Clamp velocity
            const vel = Physics.clampVelocity(new Vec2(player.vx, player.vy));
            player.vx = vel.x;
            player.vy = vel.y;

            // If fully inside a planet and grace is over, push out + ground
            if (canLand && nearestPlanet.isInside(player.x, player.y)) {
                const surfPoint = Physics.projectToSurface(
                    new Vec2(player.x, player.y),
                    nearestPlanet
                );
                player.x = surfPoint.x;
                player.y = surfPoint.y;
                player.isGrounded = true;
                player.vx *= 0.2;
                player.vy *= 0.2;
            }
        }
    }

    /**
     * Handle player jump
     */
    jump(player, nearestPlanet) {
        if (!player.isGrounded) {
            // console.log("Jump failed: not grounded");
            return false;
        }
        if (!player.canJump) {
            // console.log("Jump failed: cannot jump");
            return false;
        }

        console.log(`[JUMP] Player ${player.id} jumping from planet. Start pos: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}`);

        // Jump direction: away from planet surface
        const jumpDir = new Vec2(
            player.x - nearestPlanet.x,
            player.y - nearestPlanet.y
        ).normalize();

        // Biome effect: Crystal planets give super jumps (low gravity style)
        const jumpMultiplier = nearestPlanet.themeKey === 'crystal' ? 1.5 : 1.0;

        // Set velocity directly (not additive) for reliable liftoff
        player.vx = jumpDir.x * player.jumpForce * jumpMultiplier;
        player.vy = jumpDir.y * player.jumpForce * jumpMultiplier;
        player.isGrounded = false;

        // CRITICAL: Grace period prevents immediate re-grounding
        // The player CANNOT land for 0.35 seconds after jumping
        player.jumpGraceTimer = 0.35;

        // Immediately move player outward to clear surface threshold
        player.x += jumpDir.x * (this.surfaceThreshold + 4);
        player.y += jumpDir.y * (this.surfaceThreshold + 4);

        console.log(`[JUMP] Success. New pos: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, Vel: ${player.vx.toFixed(1)}, ${player.vy.toFixed(1)}`);

        return true;
    }
}
