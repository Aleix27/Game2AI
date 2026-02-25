// =============================================
// Projectile.js — Gravity-affected shotgun pellet
// =============================================

export class Projectile {
    constructor(x, y, vx, vy, ownerId, color = '#ffdd44') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ownerId = ownerId;
        this.color = color;
        this.radius = 3;
        this.damage = 20;
        this.lifetime = 3; // seconds
        this.age = 0;
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.age += dt;
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }

    serialize() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
            vx: Math.round(this.vx),
            vy: Math.round(this.vy),
            o: this.ownerId,
            c: this.color,
            a: Math.round(this.age * 100) / 100
        };
    }

    static fromSerialized(data) {
        const p = new Projectile(data.x, data.y, data.vx, data.vy, data.o, data.c);
        p.age = data.a;
        return p;
    }
}
