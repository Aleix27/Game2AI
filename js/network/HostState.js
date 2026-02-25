// =============================================
// HostState.js — Host game state management
// =============================================

export class HostState {
    constructor(networkManager) {
        this.net = networkManager;
        this.broadcastRate = 1 / 60; // 60 Hz state broadcast for maximum fluidity
        this.broadcastTimer = 0;
        this.inputBuffer = new Map(); // peerId -> latest input
    }

    /**
     * Set up input receiving from clients
     */
    init() {
        this.net.onData = (peerId, data) => {
            if (data.type === 'input') {
                this.inputBuffer.set(peerId, data.input);
            } else if (data.type === 'ping') {
                this.net.send(peerId, { type: 'pong', t: data.t });
            }
        };
    }

    /**
     * Get buffered input for a peer
     */
    getInput(peerId) {
        return this.inputBuffer.get(peerId) || null;
    }

    /**
     * Broadcast game state to all clients
     */
    broadcastState(dt, gameState) {
        this.broadcastTimer -= dt;
        if (this.broadcastTimer > 0) return;
        this.broadcastTimer = this.broadcastRate;

        this.net.broadcast({
            type: 'state',
            state: gameState
        });
    }

    /**
     * Broadcast a game event (kill, spawn, etc.)
     */
    broadcastEvent(event) {
        this.net.broadcast({
            type: 'event',
            event: event
        });
    }

    /**
     * Send lobby update
     */
    broadcastLobby(lobbyData) {
        this.net.broadcast({
            type: 'lobby',
            data: lobbyData
        });
    }

    /**
     * Send game start signal
     */
    broadcastStart(startData) {
        this.net.broadcast({
            type: 'start',
            data: startData
        });
    }

    /**
     * Send match end signal
     */
    broadcastEnd(rankings) {
        this.net.broadcast({
            type: 'end',
            rankings: rankings
        });
    }
}
