// =============================================
// Particle.js — Lightweight VFX particle
// =============================================

export class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxSize = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.alpha = 1;
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.age += dt;

        const progress = this.age / this.lifetime;
        this.alpha = 1 - progress;
        this.size = this.maxSize * (1 - progress * 0.5);

        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }
}

/**
 * Particle emitter helper
 */
export class ParticlePool {
    constructor(maxParticles = 500) {
        this.particles = [];
        this.maxParticles = maxParticles;
    }

    /**
     * Emit particles
     */
    emit(x, y, count, options = {}) {
        const {
            speed = 100,
            speedVar = 50,
            color = '#ffaa00',
            colors = null,
            size = 3,
            sizeVar = 1,
            lifetime = 0.5,
            lifetimeVar = 0.2,
            angle = 0,
            spread = Math.PI * 2,
            gravity = 0
        } = options;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                // Remove oldest
                const idx = this.particles.findIndex(p => !p.active);
                if (idx >= 0) this.particles.splice(idx, 1);
                else this.particles.shift();
            }

            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed + (Math.random() - 0.5) * speedVar;
            const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;
            const sz = size + (Math.random() - 0.5) * sizeVar;
            const lt = lifetime + (Math.random() - 0.5) * lifetimeVar;

            const p = new Particle(
                x, y,
                Math.cos(a) * s,
                Math.sin(a) * s,
                c, Math.max(0.5, sz), Math.max(0.1, lt)
            );
            p.gravity = gravity;
            this.particles.push(p);
        }
    }

    /**
     * Spawn explosion effect
     */
    explosion(x, y, color = '#ffaa00', count = 20) {
        this.emit(x, y, count, {
            speed: 150,
            speedVar: 100,
            colors: [color, '#ffdd44', '#ff6600', '#ffffff'],
            size: 4,
            sizeVar: 3,
            lifetime: 0.6,
            lifetimeVar: 0.3
        });
    }

    /**
     * Muzzle flash effect
     */
    muzzleFlash(x, y, angle) {
        this.emit(x, y, 8, {
            speed: 200,
            speedVar: 80,
            colors: ['#ffdd44', '#ffffff', '#ffaa00'],
            size: 3,
            sizeVar: 2,
            lifetime: 0.15,
            lifetimeVar: 0.05,
            angle: angle,
            spread: 0.5
        });
    }

    /**
     * Jump dust effect
     */
    jumpDust(x, y, surfaceAngle) {
        this.emit(x, y, 10, {
            speed: 60,
            speedVar: 30,
            colors: ['#aaaaaa', '#888888', '#666666'],
            size: 3,
            sizeVar: 2,
            lifetime: 0.4,
            lifetimeVar: 0.2,
            angle: surfaceAngle - Math.PI / 2,
            spread: Math.PI * 0.8
        });
    }

    /**
     * Meteorite trail
     */
    meteorTrail(x, y) {
        this.emit(x, y, 2, {
            speed: 20,
            speedVar: 15,
            colors: ['#ff4400', '#ff6600', '#ffaa00', '#ff2200'],
            size: 5,
            sizeVar: 3,
            lifetime: 0.4,
            lifetimeVar: 0.2
        });
    }

    /**
     * Death effect
     */
    deathEffect(x, y, playerColor) {
        this.explosion(x, y, playerColor, 30);
        this.emit(x, y, 15, {
            speed: 50,
            speedVar: 30,
            colors: ['#aaaaaa', '#888888'],
            size: 2,
            sizeVar: 1,
            lifetime: 1,
            lifetimeVar: 0.5
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.gravity) p.vy += p.gravity * dt;
            p.update(dt);
            if (!p.active) {
                this.particles.splice(i, 1);
            }
        }
    }

    getActive() {
        return this.particles;
    }
}
