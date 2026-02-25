// =============================================
// ClientState.js — Client input sending + state interpolation (rewritten)
// =============================================

import { Physics } from '../engine/Physics.js';

export class ClientState {
    constructor(networkManager) {
        this.net = networkManager;
        this.sendRate = 1 / 30; // Send input 30 times/sec
        this.sendTimer = 0;

        // State interpolation buffer
        this._stateBuffer = [];   // [{state, timestamp}, ...]
        this._interpDelay = 100;  // ms delay for interpolation

        this.onStateReceived = null;
        this.onEventReceived = null;
        this.onLobbyUpdate = null;
        this.onGameStart = null;
        this.onGameEnd = null;
        this.ping = 0;
    }

    /**
     * Set up state receiving from host
     */
    init() {
        this.net.onData = (peerId, data) => {
            switch (data.type) {
                case 'state':
                    // Push into interpolation buffer
                    this._stateBuffer.push({
                        state: data.state,
                        timestamp: performance.now()
                    });
                    // Keep only last 10 states
                    if (this._stateBuffer.length > 10) {
                        this._stateBuffer.shift();
                    }
                    // Still call onStateReceived for immediate updates
                    // but use interpolated data
                    if (this.onStateReceived) {
                        const interpolated = this.getInterpolatedState();
                        if (interpolated) {
                            this.onStateReceived(interpolated);
                        }
                    }
                    break;
                case 'event':
                    if (this.onEventReceived) this.onEventReceived(data.event);
                    break;
                case 'lobby':
                    if (this.onLobbyUpdate) this.onLobbyUpdate(data.data);
                    break;
                case 'start':
                    if (this.onGameStart) this.onGameStart(data.data);
                    break;
                case 'end':
                    if (this.onGameEnd) this.onGameEnd(data.rankings);
                    break;
                case 'pong':
                    this.ping = performance.now() - data.t;
                    break;
            }
        };

        // Periodic ping
        setInterval(() => {
            this.net.sendToHost({ type: 'ping', t: performance.now() });
        }, 2000);
    }

    /**
     * Send local input to host
     */
    sendInput(dt, input) {
        this.sendTimer -= dt;
        if (this.sendTimer > 0) return;
        this.sendTimer = this.sendRate;

        this.net.sendToHost({
            type: 'input',
            input: input
        });
    }

    /**
     * Get interpolated state between the two most recent snapshots
     */
    getInterpolatedState() {
        if (this._stateBuffer.length < 2) {
            return this._stateBuffer.length > 0 ? this._stateBuffer[this._stateBuffer.length - 1].state : null;
        }

        const now = performance.now();
        const renderTime = now - this._interpDelay;

        // Find two states to interpolate between
        let from = null;
        let to = null;

        for (let i = 0; i < this._stateBuffer.length - 1; i++) {
            if (this._stateBuffer[i].timestamp <= renderTime &&
                this._stateBuffer[i + 1].timestamp >= renderTime) {
                from = this._stateBuffer[i];
                to = this._stateBuffer[i + 1];
                break;
            }
        }

        // If we don't have a bracketing pair, just use the latest
        if (!from || !to) {
            return this._stateBuffer[this._stateBuffer.length - 1].state;
        }

        // Calculate interpolation factor
        const range = to.timestamp - from.timestamp;
        const t = range > 0 ? (renderTime - from.timestamp) / range : 0;
        const clampedT = Math.max(0, Math.min(1, t));

        // Interpolate player positions
        const interpolated = JSON.parse(JSON.stringify(to.state));

        if (interpolated.players && from.state.players) {
            for (let i = 0; i < interpolated.players.length; i++) {
                const fp = from.state.players.find(p => p.id === interpolated.players[i].id);
                if (fp) {
                    interpolated.players[i].x = Physics.lerp(fp.x, interpolated.players[i].x, clampedT);
                    interpolated.players[i].y = Physics.lerp(fp.y, interpolated.players[i].y, clampedT);
                    interpolated.players[i].sa = Physics.lerpAngle(fp.sa, interpolated.players[i].sa, clampedT);
                }
            }
        }

        return interpolated;
    }
}
