// =============================================
// Physics.js — Vector math & gravity calculations
// =============================================

export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() { return new Vec2(this.x, this.y); }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy(v) { this.x = v.x; this.y = v.y; return this; }

    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    scale(s) { return new Vec2(this.x * s, this.y * s); }

    addMut(v) { this.x += v.x; this.y += v.y; return this; }
    subMut(v) { this.x -= v.x; this.y -= v.y; return this; }
    scaleMut(s) { this.x *= s; this.y *= s; return this; }

    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    lengthSq() { return this.x * this.x + this.y * this.y; }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vec2(0, 0);
        return new Vec2(this.x / len, this.y / len);
    }

    normalizeMut() {
        const len = this.length();
        if (len > 0) { this.x /= len; this.y /= len; }
        return this;
    }

    dot(v) { return this.x * v.x + this.y * v.y; }
    cross(v) { return this.x * v.y - this.y * v.x; }

    rotate(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
    }

    angle() { return Math.atan2(this.y, this.x); }

    distTo(v) { return this.sub(v).length(); }
    distSqTo(v) { return this.sub(v).lengthSq(); }

    lerp(v, t) {
        return new Vec2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }

    static fromAngle(angle, length = 1) {
        return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
    }
}

export const Physics = {
    GRAVITY_CONSTANT: 2200,
    MAX_VELOCITY: 800,
    SURFACE_OFFSET: 2,

    /**
     * Calculate gravitational acceleration on an entity from a planet
     */
    gravityAccel(entityPos, planet) {
        const diff = new Vec2(planet.x - entityPos.x, planet.y - entityPos.y);
        const distSq = diff.lengthSq();
        const dist = Math.sqrt(distSq);

        if (dist < planet.radius * 0.5) return new Vec2(0, 0);

        const force = (this.GRAVITY_CONSTANT * planet.mass) / distSq;
        return diff.normalize().scale(Math.min(force, 3500));
    },

    /**
     * Find the nearest planet to a position
     */
    nearestPlanet(pos, planets) {
        let nearest = null;
        let minDist = Infinity;
        for (const planet of planets) {
            const d = pos.distTo(new Vec2(planet.x, planet.y)) - planet.radius;
            if (d < minDist) { minDist = d; nearest = planet; }
        }
        return { planet: nearest, distance: minDist };
    },

    /**
     * Project a point onto a planet's surface
     */
    projectToSurface(pos, planet) {
        const dir = pos.sub(new Vec2(planet.x, planet.y)).normalize();
        return new Vec2(planet.x, planet.y).add(dir.scale(planet.radius + this.SURFACE_OFFSET));
    },

    /**
     * Get surface angle at a point on a planet
     */
    surfaceAngle(pos, planet) {
        return Math.atan2(pos.y - planet.y, pos.x - planet.x);
    },

    /**
     * Check circle-circle collision
     */
    circleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1, dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const sumR = r1 + r2;
        return distSq <= sumR * sumR;
    },

    /**
     * Check point inside circle
     */
    pointInCircle(px, py, cx, cy, r) {
        const dx = px - cx, dy = py - cy;
        return dx * dx + dy * dy <= r * r;
    },

    /**
     * Clamp velocity to max
     */
    clampVelocity(vel) {
        const len = vel.length();
        if (len > this.MAX_VELOCITY) {
            return vel.normalize().scale(this.MAX_VELOCITY);
        }
        return vel;
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Angle lerp (shortest path)
     */
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    },

    /**
     * Random float in range
     */
    rand(min, max) {
        return min + Math.random() * (max - min);
    },

    /**
     * Random integer in range (inclusive)
     */
    randInt(min, max) {
        return Math.floor(this.rand(min, max + 1));
    }
};
