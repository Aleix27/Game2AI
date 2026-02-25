// =============================================
// WeaponSystem.js — Shotgun firing mechanics
// =============================================

import { Vec2 } from '../engine/Physics.js';
import { Projectile } from '../entities/Projectile.js';

export class WeaponSystem {
    constructor() {
        this.pelletCount = 5;
        this.spreadAngle = Math.PI / 6; // 30 degrees total spread
        this.pelletSpeed = 500;
        this.muzzleOffset = 25; // distance from player center
    }

    /**
     * Fire shotgun from player toward a target point
     * Returns array of new projectiles
     */
    fire(player, targetX, targetY, particles) {
        if (!player.canShoot()) return [];

        player.shootCooldown = player.shootCooldownMax;
        player.shotsFired++;

        // Calculate aim direction
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const baseAngle = Math.atan2(dy, dx);

        // Set player aim angle (relative to surface)
        player.aimAngle = baseAngle - player.surfaceAngle - Math.PI / 2;
        if (dx < 0 && !player.facingLeft) player.facingLeft = true;
        if (dx > 0 && player.facingLeft) player.facingLeft = false;

        // Muzzle position
        const muzzleX = player.x + Math.cos(baseAngle) * this.muzzleOffset;
        const muzzleY = player.y + Math.sin(baseAngle) * this.muzzleOffset;

        // Create pellets with spread
        const projectiles = [];
        const halfSpread = this.spreadAngle / 2;

        for (let i = 0; i < this.pelletCount; i++) {
            const t = this.pelletCount > 1 ? i / (this.pelletCount - 1) : 0.5;
            const angle = baseAngle - halfSpread + this.spreadAngle * t;

            // Add slight random variation
            const finalAngle = angle + (Math.random() - 0.5) * 0.05;
            const speed = this.pelletSpeed + (Math.random() - 0.5) * 50;

            const vx = Math.cos(finalAngle) * speed;
            const vy = Math.sin(finalAngle) * speed;

            projectiles.push(new Projectile(
                muzzleX, muzzleY,
                vx, vy,
                player.id,
                player.color
            ));
        }

        // Muzzle flash particles
        if (particles) {
            particles.muzzleFlash(muzzleX, muzzleY, baseAngle);
        }

        return projectiles;
    }
}
