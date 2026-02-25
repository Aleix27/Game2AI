// =============================================
// GameLoop.js — Fixed-step game loop
// =============================================

export class GameLoop {
    constructor(updateFn, renderFn, postUpdateFn = null) {
        this.update = updateFn;
        this.render = renderFn;
        this.postUpdate = postUpdateFn;
        this.running = false;
        this.rafId = null;
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = 1 / 60; // 60 Hz physics
        this.maxAccumulator = 0.1; // prevent spiral of death
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now() / 1000;
        this.accumulator = 0;
        this.tick = this.tick.bind(this);
        this.rafId = requestAnimationFrame(this.tick);
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    tick(timestamp) {
        if (!this.running) return;

        const now = timestamp / 1000;
        let dt = now - this.lastTime;
        this.lastTime = now;

        // Clamp delta
        if (dt > this.maxAccumulator) dt = this.maxAccumulator;
        this.accumulator += dt;

        // Fixed-step physics updates
        while (this.accumulator >= this.fixedDt) {
            this.update(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }

        // Post-update: clear per-frame state (like consumed input)
        if (this.postUpdate) this.postUpdate();

        // Interpolation alpha for rendering
        const alpha = this.accumulator / this.fixedDt;
        this.render(alpha);

        // FPS counter
        this.frameCount++;
        this.fpsTimer += dt;
        if (this.fpsTimer >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        this.rafId = requestAnimationFrame(this.tick);
    }
}
