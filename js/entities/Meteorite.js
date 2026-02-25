// =============================================
// Meteorite.js — Hazard entity with fire trail
// =============================================

export class Meteorite {
    constructor(x, y, vx, vy, radius = 15) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 4;
        this.active = true;
        this.lifetime = 10;
        this.age = 0;
        this.damage = 50;

        // Generate irregular shape (variation factors)
        this.shape = [];
        const points = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < points; i++) {
            this.shape.push(0.7 + Math.random() * 0.5);
        }
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;
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
            r: this.radius,
            rot: Math.round(this.rotation * 100) / 100,
            sh: this.shape
        };
    }

    static fromSerialized(data) {
        const m = new Meteorite(data.x, data.y, data.vx, data.vy, data.r);
        m.rotation = data.rot;
        m.shape = data.sh;
        return m;
    }
}
