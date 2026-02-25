// =============================================
// NetworkManager.js — PeerJS WebRTC host/join 
// =============================================

export class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> DataConnection
        this.isHost = false;
        this.roomCode = '';
        this.localId = '';
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onData = null;
        this.onConnected = null;
        this.onError = null;
        this.maxPlayers = 4;
        this.connected = false;
    }

    /**
     * Generate a random 4-char room code
     */
    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    /**
     * Create a hosted game. Returns room code.
     */
    async host() {
        this.isHost = true;
        this.roomCode = this._generateCode();
        const peerId = 'ipvp-' + this.roomCode;

        return new Promise((resolve, reject) => {
            this.peer = new Peer(peerId, {
                debug: 0,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.localId = id;
                this.connected = true;
                console.log('[NET] Host ready:', this.roomCode);
                resolve(this.roomCode);
            });

            this.peer.on('connection', (conn) => {
                this._handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('[NET] Host error:', err);
                if (err.type === 'unavailable-id') {
                    // Room code already taken, regenerate
                    this.peer.destroy();
                    this.roomCode = this._generateCode();
                    this.host().then(resolve).catch(reject);
                } else {
                    if (this.onError) this.onError(err);
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log('[NET] Host disconnected, reconnecting...');
                this.peer.reconnect();
            });
        });
    }

    /**
     * Join a game by room code
     */
    async join(roomCode) {
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase();
        const hostId = 'ipvp-' + this.roomCode;

        return new Promise((resolve, reject) => {
            this.peer = new Peer(undefined, {
                debug: 0,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.localId = id;
                console.log('[NET] Client ready, connecting to', hostId);

                const conn = this.peer.connect(hostId, { reliable: true });

                conn.on('open', () => {
                    this.connected = true;
                    this.connections.set(hostId, conn);
                    this._setupDataHandlers(conn);
                    console.log('[NET] Connected to host');
                    if (this.onConnected) this.onConnected();
                    resolve(conn);
                });

                conn.on('error', (err) => {
                    console.error('[NET] Connection error:', err);
                    if (this.onError) this.onError(err);
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('[NET] Client error:', err);
                if (this.onError) this.onError(err);
                reject(err);
            });

            // Timeout
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    _handleConnection(conn) {
        if (this.connections.size >= this.maxPlayers - 1) {
            conn.close();
            return;
        }

        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this._setupDataHandlers(conn);
            console.log('[NET] Player connected:', conn.peer);
            if (this.onPlayerJoin) this.onPlayerJoin(conn.peer);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            console.log('[NET] Player left:', conn.peer);
            if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('[NET] Connection error:', conn.peer, err);
            this.connections.delete(conn.peer);
        });
    }

    _setupDataHandlers(conn) {
        conn.on('data', (data) => {
            if (this.onData) this.onData(conn.peer, data);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
        });
    }

    /**
     * Send data to a specific peer
     */
    send(peerId, data) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    /**
     * Broadcast data to all connected peers
     */
    broadcast(data) {
        for (const [id, conn] of this.connections) {
            if (conn.open) {
                conn.send(data);
            }
        }
    }

    /**
     * Send data to host (client only)
     */
    sendToHost(data) {
        if (this.isHost) return;
        for (const [id, conn] of this.connections) {
            if (conn.open) {
                conn.send(data);
                return;
            }
        }
    }

    /**
     * Get list of connected peer IDs
     */
    getConnectedPeers() {
        return Array.from(this.connections.keys());
    }

    /**
     * Get player count (including self)
     */
    getPlayerCount() {
        return this.connections.size + 1;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        for (const [id, conn] of this.connections) {
            conn.close();
        }
        this.connections.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connected = false;
        this.isHost = false;
        this.roomCode = '';
    }
}
