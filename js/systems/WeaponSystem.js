// =============================================
// WeaponSystem.js — Shotgun firing mechanics
// =============================================

import { Vec2 } from '../engine/Physics.js';
import { Projectile } from '../entities/Projectile.js';

export class WeaponSystem {
    constructor() {
        this.pelletCount = 7;
        this.spreadAngle = Math.PI / 4; // 45 degrees total spread (wider)
        this.pelletSpeed = 1200; // much faster bullets to combat gravity
        this.muzzleOffset = 30; // slightly further out
    }

    fire(player, targetX, targetY, particles) {
        if (!player.canShoot()) return [];

        const weapon = player.currentWeapon || 'SHOTGUN';

        let pelletCount = this.pelletCount;
        let spreadAngle = this.spreadAngle;
        let pelletSpeed = this.pelletSpeed;
        let pColor = player.color;
        let damage = 15;
        let radius = 2;
        let lifetime = 1.5;
        let recoilForce = 150;

        // Apply weapon specifics
        if (weapon === 'SNIPER') {
            pelletCount = 1;
            spreadAngle = 0;
            pelletSpeed = 2200;
            player.shootCooldownMax = 1.0; // Slow fire
            damage = 70;
            radius = 4;
            lifetime = 2.0;
            pColor = '#ff3366'; // Reddish
            recoilForce = 400; // Big recoil
        } else if (weapon === 'MACHINE_GUN') {
            pelletCount = 1;
            spreadAngle = Math.PI / 12; // Small spread
            pelletSpeed = 1000;
            player.shootCooldownMax = 0.12; // Very fast
            damage = 10;
            radius = 2;
            pColor = '#00d4ff';
            recoilForce = 30; // Small recoil
        } else {
            // SHOTGUN (default)
            player.shootCooldownMax = 0.35;
        }

        player.shootCooldown = player.shootCooldownMax;
        player.shotsFired++;

        // Calculate aim direction
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const baseAngle = Math.atan2(dy, dx);

        // Muzzle position
        const muzzleX = player.x + Math.cos(baseAngle) * this.muzzleOffset;
        const muzzleY = player.y + Math.sin(baseAngle) * this.muzzleOffset;

        // Create pellets with spread
        const projectiles = [];
        const halfSpread = spreadAngle / 2;

        for (let i = 0; i < pelletCount; i++) {
            const t = pelletCount > 1 ? i / (pelletCount - 1) : 0.5;
            const angle = baseAngle - halfSpread + spreadAngle * t;

            // Add slight random variation
            const finalAngle = angle + (Math.random() - 0.5) * 0.05;
            const speed = pelletSpeed + (Math.random() - 0.5) * 50;

            const vx = Math.cos(finalAngle) * speed;
            const vy = Math.sin(finalAngle) * speed;

            const proj = new Projectile(muzzleX, muzzleY, vx, vy, player.id, pColor);
            proj.damage = damage;
            proj.radius = radius;
            proj.lifetime = lifetime;
            projectiles.push(proj);
        }

        // Muzzle flash particles
        if (particles) {
            particles.muzzleFlash(muzzleX, muzzleY, baseAngle);
        }

        // Apply recoil to the player
        player.vx -= Math.cos(baseAngle) * recoilForce;
        player.vy -= Math.sin(baseAngle) * recoilForce;

        return projectiles;
    }
}
