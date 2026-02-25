// =============================================
// ClientState.js — Client input sending + state interpolation
// =============================================

export class ClientState {
    constructor(networkManager) {
        this.net = networkManager;
        this.sendRate = 1 / 30; // Send input 30 times/sec
        this.sendTimer = 0;
        this.latestState = null;
        this.previousState = null;
        this.stateTimestamp = 0;
        this.interpolationDelay = 0.05; // 50ms interpolation buffer
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
                    this.previousState = this.latestState;
                    this.latestState = data.state;
                    this.stateTimestamp = performance.now();
                    if (this.onStateReceived) this.onStateReceived(data.state);
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
     * Get interpolated state
     */
    getInterpolatedState() {
        return this.latestState;
    }
}
