// =============================================
// Player.js — Astronaut character entity
// =============================================

import { Vec2 } from '../engine/Physics.js';

const PLAYER_COLORS = ['#00d4ff', '#ff6b35', '#00ff88', '#ff3366'];
const PLAYER_NAMES_DEFAULT = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export class Player {
    constructor(id, playerIndex) {
        this.id = id;
        this.index = playerIndex;
        this.name = PLAYER_NAMES_DEFAULT[playerIndex] || `Player ${playerIndex + 1}`;
        this.color = PLAYER_COLORS[playerIndex] || '#ffffff';

        // Position & physics
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;

        // Surface state
        this.isGrounded = false;
        this.groundedPlanetIndex = -1;
        this.surfaceAngle = 0;
        this.moveX = 0;
        this.facingLeft = false;
        this.aimAngle = 0;

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.kills = 0;
        this.deaths = 0;
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.damageDealt = 0;

        // Timers
        this.shootCooldown = 0;
        this.shootCooldownMax = 0.6; // seconds between shots
        this.damageFlash = 0;
        this.respawnTimer = 0;
        this.respawnTime = 3; // seconds
        this.invulnerable = 0; // seconds of invulnerability after spawn

        // Jump
        this.jumpForce = 300;
        this.canJump = true;
        this.jumpCooldown = 0;

        // Movement
        this.moveSpeed = 200; // surface movement speed (degrees/sec basically)
        this.airControl = 80; // air movement force
    }

    /**
     * Spawn at a position on a planet surface
     */
    spawn(planet, angle) {
        const surfPos = planet.getSurfacePoint(angle);
        this.x = surfPos.x;
        this.y = surfPos.y;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.surfaceAngle = angle;
        this.health = this.maxHealth;
        this.alive = true;
        this.damageFlash = 0;
        this.invulnerable = 2; // 2 seconds invulnerability
        this.respawnTimer = 0;
    }

    /**
     * Take damage
     */
    takeDamage(amount, attackerId) {
        if (!this.alive || this.invulnerable > 0) return false;
        this.health -= amount;
        this.damageFlash = 0.5;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            this.deaths++;
            this.respawnTimer = this.respawnTime;
            return true; // died
        }
        return false;
    }

    /**
     * Update timers
     */
    updateTimers(dt) {
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.damageFlash > 0) this.damageFlash -= dt * 3;
        if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (!this.alive && this.respawnTimer > 0) this.respawnTimer -= dt;
    }

    /**
     * Can this player shoot?
     */
    canShoot() {
        return this.alive && this.shootCooldown <= 0;
    }

    /**
     * Serialize for network
     */
    serialize() {
        return {
            id: this.id,
            idx: this.index,
            n: this.name,
            c: this.color,
            x: Math.round(this.x * 10) / 10,
            y: Math.round(this.y * 10) / 10,
            vx: Math.round(this.vx * 10) / 10,
            vy: Math.round(this.vy * 10) / 10,
            gr: this.isGrounded,
            sa: Math.round(this.surfaceAngle * 100) / 100,
            mx: Math.round(this.moveX * 100) / 100,
            fl: this.facingLeft,
            hp: this.health,
            al: this.alive,
            k: this.kills,
            d: this.deaths,
            df: Math.round(this.damageFlash * 100) / 100,
            rt: Math.round(this.respawnTimer * 100) / 100,
            iv: this.invulnerable > 0
        };
    }

    /**
     * Deserialize from network data (update existing player)
     */
    applyState(data) {
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.isGrounded = data.gr;
        this.surfaceAngle = data.sa;
        this.moveX = data.mx;
        this.facingLeft = data.fl;
        this.health = data.hp;
        this.alive = data.al;
        this.kills = data.k;
        this.deaths = data.d;
        this.damageFlash = data.df;
        this.respawnTimer = data.rt;
        this.invulnerable = data.iv ? 1 : 0;
    }

    static fromSerialized(data) {
        const p = new Player(data.id, data.idx);
        p.name = data.n;
        p.color = data.c;
        p.applyState(data);
        return p;
    }
}
