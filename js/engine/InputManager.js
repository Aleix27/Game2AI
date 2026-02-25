// =============================================
// InputManager.js — Input handling (rewritten from scratch)
// =============================================

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // Joystick state
        this.joystick = { active: false, x: 0, y: 0, force: 0, touchId: null };
        this.joystickRadius = 50;
        this.joystickDeadZone = 8;

        // Action states — these are CONTINUOUS (held) states, not one-shots
        this._shootActive = false;         // Is the player holding shoot?
        this._shootX = 0;                  // Screen coords of shoot target
        this._shootY = 0;
        this._aimX = 0;                    // Screen coords of aim
        this._aimY = 0;
        this._hasAim = false;
        this._jumpHeld = false;            // Is jump button/key held?
        this._jumpOneShot = false;         // One-shot keyboard jump

        // Track which touch IDs are for which purpose
        this._shootTouchId = null;

        // DOM refs
        this.joystickThumb = document.getElementById('joystick-thumb');
        this.jumpBtn = document.getElementById('btn-jump');
        this.controlsLayer = document.getElementById('controls-layer');

        // Keyboard
        this._keys = new Set();

        this._bindAll();
    }

    _bindAll() {
        // =====================
        // KEYBOARD
        // =====================
        window.addEventListener('keydown', (e) => {
            this._keys.add(e.code);
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this._jumpOneShot = true;
            }
        });
        window.addEventListener('keyup', (e) => this._keys.delete(e.code));

        // =====================
        // MOUSE (desktop fallback)
        // =====================
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            this._shootActive = true;
            this._shootX = e.clientX;
            this._shootY = e.clientY;
            this._aimX = e.clientX;
            this._aimY = e.clientY;
            this._hasAim = true;
        });
        window.addEventListener('mousemove', (e) => {
            this._aimX = e.clientX;
            this._aimY = e.clientY;
            this._hasAim = true;
            if (this._shootActive) {
                this._shootX = e.clientX;
                this._shootY = e.clientY;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this._shootActive = false;
            }
        });

        // =====================
        // JUMP BUTTON (touch + mouse)
        // =====================
        if (this.jumpBtn) {
            // Touch
            this.jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._jumpHeld = true;
            }, { passive: false });
            this.jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._jumpHeld = false;
            }, { passive: false });
            this.jumpBtn.addEventListener('touchcancel', (e) => {
                this._jumpHeld = false;
            }, { passive: false });
            // Mouse
            this.jumpBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._jumpHeld = true;
            });
            this.jumpBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._jumpHeld = false;
            });
            this.jumpBtn.addEventListener('mouseleave', () => {
                this._jumpHeld = false;
            });
        }

        // =====================
        // JOYSTICK (touch only)
        // =====================
        const jzn = document.getElementById('joystick-zone');
        if (jzn) {
            jzn.addEventListener('touchstart', (e) => this._joystickStart(e), { passive: false });
            jzn.addEventListener('touchmove', (e) => this._joystickMove(e), { passive: false });
            jzn.addEventListener('touchend', (e) => this._joystickEnd(e), { passive: false });
            jzn.addEventListener('touchcancel', (e) => this._joystickEnd(e), { passive: false });
        }

        // =====================
        // CANVAS TOUCH (shooting + aiming)
        // =====================
        this.canvas.addEventListener('touchstart', (e) => this._canvasTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this._canvasTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._canvasTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this._canvasTouchEnd(e), { passive: false });

        // Prevent scroll on the entire document during gameplay
        document.addEventListener('touchmove', (e) => {
            if (e.target === this.canvas || this.controlsLayer?.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // ── Canvas touch: shoot + aim ──
    _canvasTouchStart(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        for (const touch of e.changedTouches) {
            const lx = touch.clientX - rect.left;
            const ly = touch.clientY - rect.top;
            // Skip joystick corner (bottom-left 170×170)
            if (lx < 170 && ly > rect.height - 170) continue;
            // Skip jump button corner (bottom-right 150×150)
            if (lx > rect.width - 150 && ly > rect.height - 150) continue;

            // This touch is a shoot touch
            this._shootTouchId = touch.identifier;
            this._shootActive = true;
            this._shootX = touch.clientX;
            this._shootY = touch.clientY;
            this._aimX = touch.clientX;
            this._aimY = touch.clientY;
            this._hasAim = true;
        }
    }

    _canvasTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._shootTouchId) {
                this._shootX = touch.clientX;
                this._shootY = touch.clientY;
                this._aimX = touch.clientX;
                this._aimY = touch.clientY;
            }
        }
    }

    _canvasTouchEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._shootTouchId) {
                this._shootActive = false;
                this._shootTouchId = null;
            }
        }
    }

    // ── Joystick ──
    _joystickStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        this.joystick.active = true;
        this.joystick.touchId = touch.identifier;
        this._updateJoystick(touch.clientX, touch.clientY);
    }

    _joystickMove(e) {
        e.preventDefault();
        e.stopPropagation();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystick.touchId) {
                this._updateJoystick(touch.clientX, touch.clientY);
            }
        }
    }

    _joystickEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                this.joystick.force = 0;
                this.joystick.touchId = null;
                if (this.joystickThumb) this.joystickThumb.style.transform = 'translate(0, 0)';
            }
        }
    }

    _updateJoystick(clientX, clientY) {
        const base = document.getElementById('joystick-base');
        if (!base) return;
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.joystickRadius;
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        this.joystick.x = dx / maxDist;
        this.joystick.y = dy / maxDist;
        this.joystick.force = Math.min(dist / maxDist, 1);
        if (this.joystick.force < this.joystickDeadZone / maxDist) {
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.joystick.force = 0;
        }
        if (this.joystickThumb) {
            this.joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    // ── Public API ──
    getInput() {
        const input = {
            moveX: this.joystick.x,
            moveY: this.joystick.y,
            moveForce: this.joystick.force,
            shootTarget: this._shootActive ? { x: this._shootX, y: this._shootY } : null,
            aimTarget: this._hasAim ? { x: this._aimX, y: this._aimY } : null,
            jump: this._jumpHeld || this._jumpOneShot
        };

        // Keyboard movement overrides joystick
        if (this._keys.has('ArrowLeft') || this._keys.has('KeyA')) input.moveX = -1;
        if (this._keys.has('ArrowRight') || this._keys.has('KeyD')) input.moveX = 1;

        // Consume one-shot jump (keyboard only)
        this._jumpOneShot = false;

        return input;
    }

    show() { if (this.controlsLayer) this.controlsLayer.classList.add('active'); }
    hide() { if (this.controlsLayer) this.controlsLayer.classList.remove('active'); }
    resize() { /* noop */ }
}
