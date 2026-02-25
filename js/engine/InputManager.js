// =============================================
// InputManager.js — Multi-touch input with virtual joystick
// =============================================

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.joystick = { active: false, x: 0, y: 0, angle: 0, force: 0, touchId: null };
        this.shootTarget = null; // {x, y} in screen coords when tapped
        this.jumpPressed = false;
        this.touches = new Map();

        // Joystick config
        this.joystickBaseX = 80;
        this.joystickBaseY = 0; // Set on resize
        this.joystickRadius = 50;
        this.joystickDeadZone = 8;

        // DOM elements
        this.joystickThumb = document.getElementById('joystick-thumb');
        this.jumpBtn = document.getElementById('btn-jump');
        this.controlsLayer = document.getElementById('controls-layer');

        this._bindEvents();
    }

    _bindEvents() {
        // Touch events on canvas (for shooting)
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });

        // Joystick touch events
        const jzn = document.getElementById('joystick-zone');
        if (jzn) {
            jzn.addEventListener('touchstart', (e) => this._onJoystickStart(e), { passive: false });
            jzn.addEventListener('touchmove', (e) => this._onJoystickMove(e), { passive: false });
            jzn.addEventListener('touchend', (e) => this._onJoystickEnd(e), { passive: false });
            jzn.addEventListener('touchcancel', (e) => this._onJoystickEnd(e), { passive: false });
        }

        // Jump button
        if (this.jumpBtn) {
            this.jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.jumpPressed = true;
            }, { passive: false });
            this.jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.jumpPressed = false;
            }, { passive: false });
        }

        // Prevent default on document to avoid scroll/zoom
        document.addEventListener('touchmove', (e) => {
            if (e.target === this.canvas || this.controlsLayer?.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });

        // Keyboard fallback (for desktop testing)
        this._keys = new Set();
        window.addEventListener('keydown', (e) => this._keys.add(e.code));
        window.addEventListener('keyup', (e) => this._keys.delete(e.code));

        // Mouse fallback
        this.canvas.addEventListener('mousedown', (e) => {
            this.shootTarget = { x: e.clientX, y: e.clientY };
        });
    }

    _onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            // Ignore touches on left quarter (joystick zone) and bottom-right (jump button)
            const rect = this.canvas.getBoundingClientRect();
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;

            // Check if it's in joystick zone or jump zone
            if (tx < 170 && ty > rect.height - 170) continue; // joystick area
            if (tx > rect.width - 110 && ty > rect.height - 110) continue; // jump area

            this.shootTarget = { x: touch.clientX, y: touch.clientY };
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
    }

    _onTouchEnd(e) {
        e.preventDefault();
    }

    _onJoystickStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        this.joystick.active = true;
        this.joystick.touchId = touch.identifier;
        this._updateJoystick(touch.clientX, touch.clientY);
    }

    _onJoystickMove(e) {
        e.preventDefault();
        e.stopPropagation();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystick.touchId) {
                this._updateJoystick(touch.clientX, touch.clientY);
            }
        }
    }

    _onJoystickEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                this.joystick.force = 0;
                this.joystick.touchId = null;
                if (this.joystickThumb) {
                    this.joystickThumb.style.transform = 'translate(0, 0)';
                }
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

        this.joystick.x = dx / maxDist; // -1 to 1
        this.joystick.y = dy / maxDist; // -1 to 1
        this.joystick.force = Math.min(dist / maxDist, 1);
        this.joystick.angle = Math.atan2(dy, dx);

        // Dead zone
        if (this.joystick.force < this.joystickDeadZone / maxDist) {
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.joystick.force = 0;
        }

        // Visual feedback
        if (this.joystickThumb) {
            this.joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    /**
     * Get current input state (called each frame by host/client)
     */
    getInput() {
        const input = {
            moveX: this.joystick.x,
            moveY: this.joystick.y,
            moveForce: this.joystick.force,
            shootTarget: this.shootTarget,
            jump: this.jumpPressed
        };

        // Keyboard fallback
        if (this._keys.has('ArrowLeft') || this._keys.has('KeyA')) input.moveX = -1;
        if (this._keys.has('ArrowRight') || this._keys.has('KeyD')) input.moveX = 1;
        if (this._keys.has('Space') || this._keys.has('ArrowUp') || this._keys.has('KeyW')) input.jump = true;

        // Consume shoot target (one-shot)
        this.shootTarget = null;
        this.jumpPressed = false;

        return input;
    }

    show() {
        if (this.controlsLayer) {
            this.controlsLayer.classList.remove('hidden');
            this.controlsLayer.classList.add('active');
        }
    }

    hide() {
        if (this.controlsLayer) {
            this.controlsLayer.classList.add('hidden');
            this.controlsLayer.classList.remove('active');
        }
    }

    resize() {
        this.joystickBaseY = window.innerHeight - 80;
    }
}
