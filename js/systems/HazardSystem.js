// =============================================
// HazardSystem.js — Meteorite spawner with escalation
// =============================================

import { Meteorite } from '../entities/Meteorite.js';
import { Physics } from '../engine/Physics.js';

export class HazardSystem {
    constructor() {
        this.spawnTimer = 0;
        this.baseInterval = 4; // seconds between spawns
        this.minInterval = 1;
        this.escalationRate = 0.05; // interval decreases over time
        this.gameTime = 0;
        this.showerTimer = 0;
        this.showerInterval = 30; // meteor shower every 30s
        this.showerActive = false;
        this.showerDuration = 5;
        this.showerElapsed = 0;
        this.mapRadius = 700; // how far from center to spawn meteorites
    }

    /**
     * Update and spawn meteorites
     */
    update(dt, meteorites, planets) {
        this.gameTime += dt;
        this.spawnTimer -= dt;
        this.showerTimer += dt;

        // Calculate current spawn interval
        const interval = Math.max(
            this.minInterval,
            this.baseInterval - this.gameTime * this.escalationRate
        );

        // Meteor shower event
        if (this.showerTimer >= this.showerInterval) {
            this.showerActive = true;
            this.showerElapsed = 0;
            this.showerTimer = 0;
        }

        if (this.showerActive) {
            this.showerElapsed += dt;
            if (this.showerElapsed >= this.showerDuration) {
                this.showerActive = false;
            }
        }

        const effectiveInterval = this.showerActive ? 0.3 : interval;

        if (this.spawnTimer <= 0) {
            this.spawnTimer = effectiveInterval;
            this._spawnMeteorite(meteorites, planets);
        }
    }

    _spawnMeteorite(meteorites, planets) {
        if (meteorites.length > 15) return; // Limit active meteorites

        // Spawn from random edge outside the map
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = this.mapRadius + 100;
        const x = Math.cos(angle) * spawnDist;
        const y = Math.sin(angle) * spawnDist;

        // Aim roughly toward center with some randomness
        const targetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.8;
        const speed = 100 + Math.random() * 150;
        const vx = Math.cos(targetAngle) * speed;
        const vy = Math.sin(targetAngle) * speed;

        const radius = 10 + Math.random() * 15;
        meteorites.push(new Meteorite(x, y, vx, vy, radius));
    }

    /**
     * Check if meteor shower is active (for UI indicator)
     */
    isShowerActive() {
        return this.showerActive;
    }

    reset() {
        this.spawnTimer = this.baseInterval;
        this.gameTime = 0;
        this.showerTimer = 0;
        this.showerActive = false;
    }
}
