// =============================================
// Camera.js — Dynamic follow/zoom camera with shake
// =============================================

import { Physics } from './Physics.js';

export class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetX = 0;
        this.targetY = 0;
        this.targetZoom = 1;
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.minZoom = 0.3;
        this.maxZoom = 1.5;
        this.lerpSpeed = 3;
        this.zoomLerpSpeed = 2;
        this.padding = 200;

        // Shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    /**
     * Focus camera on the centroid of given positions with auto-zoom
     */
    follow(positions, dt) {
        if (!positions || positions.length === 0) return;

        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let cx = 0, cy = 0;

        for (const p of positions) {
            cx += p.x; cy += p.y;
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        cx /= positions.length;
        cy /= positions.length;

        this.targetX = cx;
        this.targetY = cy;

        // Auto-zoom to fit all positions
        const spanX = maxX - minX + this.padding * 2;
        const spanY = maxY - minY + this.padding * 2;
        const zoomX = this.width / spanX;
        const zoomY = this.height / spanY;
        this.targetZoom = Math.min(zoomX, zoomY);
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom));

        // Smooth lerp
        this.x = Physics.lerp(this.x, this.targetX, this.lerpSpeed * dt);
        this.y = Physics.lerp(this.y, this.targetY, this.lerpSpeed * dt);
        this.zoom = Physics.lerp(this.zoom, this.targetZoom, this.zoomLerpSpeed * dt);

        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = this.shakeTimer / this.shakeDuration;
            const intensity = this.shakeIntensity * progress;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    /**
     * Trigger camera shake
     */
    shake(intensity = 5, duration = 0.3) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * Apply camera transform to canvas context
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(
            -this.x + this.shakeOffsetX,
            -this.y + this.shakeOffsetY
        );
    }

    /**
     * Restore canvas context
     */
    restoreTransform(ctx) {
        ctx.restore();
    }

    /**
     * Convert screen coords to world coords
     */
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.width / 2) / this.zoom + this.x,
            y: (sy - this.height / 2) / this.zoom + this.y
        };
    }

    /**
     * Convert world coords to screen coords
     */
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + this.width / 2,
            y: (wy - this.y) * this.zoom + this.height / 2
        };
    }
}
