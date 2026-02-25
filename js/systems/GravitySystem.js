// =============================================
// GravitySystem.js — Multi-body gravity simulation
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
            this._handlePlayerGravity(entity, nearest, nearestDist, totalAccel, dt);
        } else {
            // Simple entity (projectile, meteorite)
            entity.vx += totalAccel.x * dt;
            entity.vy += totalAccel.y * dt;
        }
    }

    _handlePlayerGravity(player, nearestPlanet, dist, accel, dt) {
        if (!nearestPlanet) return;

        const onSurface = dist <= this.surfaceThreshold;

        if (onSurface && !player.isGrounded) {
            // Landing
            player.isGrounded = true;
            player.groundedPlanetIndex = -1; // Will be set by game
            // Kill velocity
            player.vx *= 0.3;
            player.vy *= 0.3;
        }

        if (player.isGrounded) {
            // Stick to surface
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
            if (Math.abs(player.moveX) > 0.1) {
                const moveDir = player.moveX > 0 ? 1 : -1;
                const angularSpeed = (player.moveSpeed / nearestPlanet.radius) * dt;
                player.surfaceAngle += angularSpeed * moveDir;

                const newPos = nearestPlanet.getSurfacePoint(player.surfaceAngle);
                player.x = newPos.x;
                player.y = newPos.y;
                player.facingLeft = moveDir < 0;
            }

            // Dampen velocity on surface
            player.vx *= this.surfaceFriction;
            player.vy *= this.surfaceFriction;
        } else {
            // In air — apply gravity
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

            // Check if entered planet
            if (nearestPlanet.isInside(player.x, player.y)) {
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
        if (!player.isGrounded || !player.canJump || player.jumpCooldown > 0) return false;

        // Jump direction: away from planet surface
        const jumpDir = new Vec2(
            player.x - nearestPlanet.x,
            player.y - nearestPlanet.y
        ).normalize();

        player.vx += jumpDir.x * player.jumpForce;
        player.vy += jumpDir.y * player.jumpForce;
        player.isGrounded = false;
        player.jumpCooldown = 0.3;

        return true;
    }
}
