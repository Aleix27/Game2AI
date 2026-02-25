// =============================================
// Renderer.js — Canvas 2D rendering pipeline
// =============================================

import { SVGAssets } from '../assets/SVGAssets.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.svgCache = new Map(); // Cache rendered SVGs as images
        this.starField = this._generateStarField(300);
        this.nebulaPhase = 0;
        this.resize();
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    clear() {
        this.ctx.fillStyle = '#06060f';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // ---- Background ----
    drawBackground(camera, dt) {
        const ctx = this.ctx;
        this.nebulaPhase += dt * 0.1;

        // Deep space gradient
        const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width
        );
        grad.addColorStop(0, '#0d0d2b');
        grad.addColorStop(0.5, '#080818');
        grad.addColorStop(1, '#040410');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Nebula glow
        ctx.globalAlpha = 0.08;
        const nebX = this.width * 0.3 + Math.sin(this.nebulaPhase) * 30;
        const nebY = this.height * 0.4 + Math.cos(this.nebulaPhase * 0.7) * 20;
        const nebGrad = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 300);
        nebGrad.addColorStop(0, '#6b21a8');
        nebGrad.addColorStop(0.5, '#1e1b4b');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = 1;

        // Stars (parallax)
        ctx.save();
        for (const star of this.starField) {
            const px = ((star.x - camera.x * star.depth * 0.1) % this.width + this.width) % this.width;
            const py = ((star.y - camera.y * star.depth * 0.1) % this.height + this.height) % this.height;
            const twinkle = 0.5 + 0.5 * Math.sin(performance.now() * 0.003 * star.speed + star.phase);
            ctx.globalAlpha = star.brightness * twinkle;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(px, py, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _generateStarField(count) {
        const stars = [];
        const colors = ['#ffffff', '#cce5ff', '#ffeedd', '#ddeeff', '#ffe8d0'];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 2000,
                size: Math.random() * 1.8 + 0.3,
                brightness: Math.random() * 0.6 + 0.4,
                depth: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 0.5,
                phase: Math.random() * Math.PI * 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        return stars;
    }

    // ---- Planet ----
    drawPlanet(planet) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(planet.x, planet.y);

        // Atmosphere glow
        const atmosGrad = ctx.createRadialGradient(0, 0, planet.radius * 0.8, 0, 0, planet.radius * 1.6);
        atmosGrad.addColorStop(0, 'transparent');
        atmosGrad.addColorStop(0.7, planet.theme.atmosColor + '15');
        atmosGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = atmosGrad;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        const bodyGrad = ctx.createRadialGradient(
            -planet.radius * 0.3, -planet.radius * 0.3, planet.radius * 0.1,
            0, 0, planet.radius
        );
        bodyGrad.addColorStop(0, planet.theme.lightColor);
        bodyGrad.addColorStop(0.6, planet.theme.baseColor);
        bodyGrad.addColorStop(1, planet.theme.darkColor);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
        ctx.fill();

        // Surface details (craters/lines)
        this._drawPlanetDetails(planet);

        // Rim light
        ctx.strokeStyle = planet.theme.atmosColor + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    _drawPlanetDetails(planet) {
        const ctx = this.ctx;
        const r = planet.radius;

        ctx.globalAlpha = 0.15;
        // Draw some circular features
        for (let i = 0; i < planet.details.length; i++) {
            const d = planet.details[i];
            ctx.fillStyle = planet.theme.detailColor;
            ctx.beginPath();
            ctx.arc(d.x * r, d.y * r, d.r * r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ---- Player ----
    drawPlayer(player, time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.surfaceAngle + Math.PI / 2);

        // Scale based on facing direction
        if (player.facingLeft) {
            ctx.scale(-1, 1);
        }

        const size = player.radius * 2.5;
        const halfSize = size / 2;

        // Bob animation when walking
        let bobY = 0;
        if (player.isGrounded && Math.abs(player.moveX) > 0.1) {
            bobY = Math.sin(time * 12) * 2;
        }

        // Shadow under player
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, halfSize - 2, halfSize * 0.6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        const pColor = player.color;
        const bodyGrad = ctx.createLinearGradient(-halfSize * 0.3, -halfSize, halfSize * 0.3, halfSize * 0.5);
        bodyGrad.addColorStop(0, this._lighten(pColor, 30));
        bodyGrad.addColorStop(1, pColor);

        // Suit body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-8, -6 + bobY, 16, 18, 4);
        ctx.fill();

        // Helmet (visor)
        const helmetGrad = ctx.createLinearGradient(-6, -18 + bobY, 6, -6 + bobY);
        helmetGrad.addColorStop(0, '#aaddff');
        helmetGrad.addColorStop(0.4, '#4488cc');
        helmetGrad.addColorStop(1, '#224466');
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.arc(0, -12 + bobY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = helmetGrad;
        ctx.beginPath();
        ctx.arc(0, -12 + bobY, 7, 0, Math.PI * 2);
        ctx.fill();

        // Visor shine
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-2, -14 + bobY, 2, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Backpack
        ctx.fillStyle = this._darken(pColor, 30);
        ctx.fillRect(-12, -4 + bobY, 4, 12);

        // Legs
        const legPhase = player.isGrounded && Math.abs(player.moveX) > 0.1 ? time * 10 : 0;
        ctx.fillStyle = this._darken(pColor, 20);
        // Left leg
        ctx.save();
        ctx.translate(-4, 12 + bobY);
        ctx.rotate(Math.sin(legPhase) * 0.4);
        ctx.fillRect(-3, 0, 5, 8);
        // Boot
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, 6, 6, 3);
        ctx.restore();
        // Right leg
        ctx.save();
        ctx.translate(4, 12 + bobY);
        ctx.rotate(Math.sin(legPhase + Math.PI) * 0.4);
        ctx.fillStyle = this._darken(pColor, 20);
        ctx.fillRect(-2, 0, 5, 8);
        ctx.fillStyle = '#444';
        ctx.fillRect(-2, 6, 6, 3);
        ctx.restore();

        // Arm with gun
        ctx.save();
        ctx.translate(8, -1 + bobY);
        const gunAngle = player.aimAngle !== undefined ? player.aimAngle : 0.2;
        ctx.rotate(gunAngle);
        // Arm
        ctx.fillStyle = pColor;
        ctx.fillRect(0, -2, 10, 4);
        // Gun
        ctx.fillStyle = '#555';
        ctx.fillRect(8, -3, 12, 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(18, -2, 4, 4);
        // Gun barrel
        ctx.fillStyle = '#777';
        ctx.fillRect(20, -1, 5, 2);
        ctx.restore();

        // Jetpack flame (when jumping/in air)
        if (!player.isGrounded) {
            ctx.save();
            ctx.translate(-10, 8 + bobY);
            const flicker = Math.random();
            const flameLen = 8 + flicker * 8;
            const flameGrad = ctx.createLinearGradient(0, 0, 0, flameLen);
            flameGrad.addColorStop(0, '#ffaa00');
            flameGrad.addColorStop(0.3, '#ff6600');
            flameGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.lineTo(3, 0);
            ctx.lineTo(1 + flicker * 2, flameLen);
            ctx.lineTo(-1 - flicker * 2, flameLen);
            ctx.fill();
            ctx.restore();
        }

        // Damage flash
        if (player.damageFlash > 0) {
            ctx.globalAlpha = player.damageFlash;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, halfSize + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Health bar above player
        if (player.health < player.maxHealth && player.health > 0) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.surfaceAngle + Math.PI / 2);
            const barW = 30, barH = 4;
            const barY = -28;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            const hpPct = player.health / player.maxHealth;
            const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffaa00' : '#ff3366';
            ctx.fillStyle = hpColor;
            ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);
            ctx.restore();
        }

        // Player name tag
        ctx.save();
        ctx.fillStyle = player.color;
        ctx.font = 'bold 10px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - 35 * (player.surfaceAngle !== undefined ? 1 : 1));
        ctx.restore();
    }

    // ---- Projectile ----
    drawProjectile(proj) {
        const ctx = this.ctx;
        ctx.save();

        // Trail
        ctx.globalAlpha = 0.4;
        const trailGrad = ctx.createLinearGradient(
            proj.x - proj.vx * 0.05, proj.y - proj.vy * 0.05,
            proj.x, proj.y
        );
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, proj.color || '#ffdd44');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(proj.x - proj.vx * 0.05, proj.y - proj.vy * 0.05);
        ctx.lineTo(proj.x, proj.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Pellet glow
        const glowGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 6);
        glowGrad.addColorStop(0, '#ffffaa');
        glowGrad.addColorStop(0.5, proj.color || '#ffdd44');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ---- Meteorite ----
    drawMeteorite(met) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(met.x, met.y);
        ctx.rotate(met.rotation);

        // Glow
        const glowGrad = ctx.createRadialGradient(0, 0, met.radius * 0.5, 0, 0, met.radius * 2.5);
        glowGrad.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, met.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rock body (irregular shape)
        const bodyGrad = ctx.createRadialGradient(-met.radius * 0.2, -met.radius * 0.2, 0, 0, 0, met.radius);
        bodyGrad.addColorStop(0, '#8B7355');
        bodyGrad.addColorStop(0.5, '#5C4033');
        bodyGrad.addColorStop(1, '#3B2C1E');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        for (let i = 0; i < met.shape.length; i++) {
            const angle = (Math.PI * 2 / met.shape.length) * i;
            const r = met.radius * met.shape[i];
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Hot surface glow
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    // ---- Pickup ----
    drawPickup(pickup) {
        const ctx = this.ctx;
        ctx.save();

        // Bobbing effect
        const bob = Math.sin(pickup.time) * 5;
        ctx.translate(pickup.x, pickup.y + bob);

        // Glow
        const glowRadius = pickup.radius * 2;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        grad.addColorStop(0, pickup.type.color + '44');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Hexagon background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = pickup.type.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = Math.cos(angle) * pickup.radius;
            const py = Math.sin(angle) * pickup.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Icon
        ctx.fillStyle = pickup.type.color;
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pickup.type.icon, 0, 0);

        ctx.restore();
    }

    // ---- Particle ----
    drawParticle(p) {
        const ctx = this.ctx;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ---- Helpers ----
    _lighten(hex, percent) {
        const rgb = this._hexToRgb(hex);
        if (!rgb) return hex;
        return `rgb(${Math.min(255, rgb.r + percent)}, ${Math.min(255, rgb.g + percent)}, ${Math.min(255, rgb.b + percent)})`;
    }

    _darken(hex, percent) {
        const rgb = this._hexToRgb(hex);
        if (!rgb) return hex;
        return `rgb(${Math.max(0, rgb.r - percent)}, ${Math.max(0, rgb.g - percent)}, ${Math.max(0, rgb.b - percent)})`;
    }

    _hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return null;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}
