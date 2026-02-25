// =============================================
// main.js — Game entry point & state machine
// =============================================

import { GameLoop } from './engine/GameLoop.js';
import { Renderer } from './engine/Renderer.js';
import { Camera } from './engine/Camera.js';
import { InputManager } from './engine/InputManager.js';
import { Vec2, Physics } from './engine/Physics.js';

import { Planet, generateMap } from './entities/Planet.js';
import { Player } from './entities/Player.js';
import { Projectile } from './entities/Projectile.js';
import { Meteorite } from './entities/Meteorite.js';
import { Pickup } from './entities/Pickup.js';
import { ParticlePool } from './entities/Particle.js';

import { GravitySystem } from './systems/GravitySystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { HazardSystem } from './systems/HazardSystem.js';

import { NetworkManager } from './network/NetworkManager.js';
import { HostState } from './network/HostState.js';
import { ClientState } from './network/ClientState.js';

import { Menu } from './ui/Menu.js';
import { HUD } from './ui/HUD.js';
import { Ranking } from './ui/Ranking.js';

// ---- Game States ----
const State = {
    MENU: 'menu',
    LOBBY: 'lobby',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    RANKING: 'ranking'
};

class Game {
    constructor() {
        // Canvas
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.camera = new Camera(this.renderer.width, this.renderer.height);
        this.input = new InputManager(this.canvas);

        // Systems
        this.gravity = new GravitySystem();
        this.collision = new CollisionSystem();
        this.weapons = new WeaponSystem();
        this.hazards = new HazardSystem();

        // Entities
        this.planets = [];
        this.players = [];
        this.projectiles = [];
        this.meteorites = [];
        this.pickups = [];
        this.particles = new ParticlePool(600);
        this.pickupSpawnTimer = 0;

        // Network
        this.net = new NetworkManager();
        this.hostState = null;
        this.clientState = null;

        // UI
        this.menu = new Menu();
        this.hud = new HUD();
        this.ranking = new Ranking();

        // Game state
        this.state = State.MENU;
        this.matchTime = 180; // 3 minutes
        this.matchTimer = this.matchTime;
        this.killTarget = 10;
        this.countdownTimer = 3;
        this.gameTime = 0;
        this.localPlayerIndex = 0;
        this.peerPlayerMap = new Map(); // peerId -> playerIndex

        // Lobby info
        this.lobbyPlayers = [];

        // Game loop
        this.loop = new GameLoop(
            (dt) => this.update(dt),
            (alpha) => this.render(alpha),
            () => this.postUpdate()
        );

        this._bindUI();
        this._bindResize();

        // Cached input for the current frame (sampled once, used across fixed ticks)
        this._frameInput = null;

        this.loop.start();
    }

    // ---- UI Bindings ----
    _bindUI() {
        this.menu.onHost = () => this._hostGame();
        this.menu.onJoin = (code) => this._joinGame(code);
        this.menu.onStart = () => this._startGame();
        this.menu.onLeave = () => this._leaveGame();

        this.ranking.onRematch = () => {
            if (this.net.isHost) {
                this._startGame();
            }
        };
        this.ranking.onMenu = () => this._leaveGame();

        this.net.onError = (err) => {
            console.error('Network error:', err);
            let msg = 'Connection error.';
            if (err.type === 'peer-unavailable') msg = 'Room not found. Check the code.';
            if (err.type === 'network') msg = 'Network unreachable. Check your internet.';
            if (err.type === 'browser-incompatible') msg = 'Browser not supported.';
            this.menu.setStatus(msg, true);
        };
    }

    _bindResize() {
        const onResize = () => {
            this.renderer.resize();
            this.camera.resize(this.renderer.width, this.renderer.height);
            this.input.resize();
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', () => setTimeout(onResize, 100));
        onResize();
    }

    // ---- Host Game ----
    async _hostGame() {
        this.menu.setStatus('Creating game...');
        try {
            const code = await this.net.host();
            this.hostState = new HostState(this.net);
            this.hostState.init();

            this.localPlayerIndex = 0;
            this.lobbyPlayers = [{ name: 'Host', index: 0 }];

            this.menu.showHostLobby(code);
            this._updateLobbyUI();
            this.state = State.LOBBY;

            // Handle player joins
            this.net.onPlayerJoin = (peerId) => {
                const idx = this.lobbyPlayers.length;
                if (idx >= 4) return;
                this.peerPlayerMap.set(peerId, idx);
                this.lobbyPlayers.push({ name: `Player ${idx + 1}`, index: idx, peerId });
                this._updateLobbyUI();

                // Send lobby state to all clients
                this.hostState.broadcastLobby({
                    players: this.lobbyPlayers,
                    roomCode: this.net.roomCode
                });
            };

            this.net.onPlayerLeave = (peerId) => {
                const idx = this.peerPlayerMap.get(peerId);
                this.peerPlayerMap.delete(peerId);
                this.lobbyPlayers = this.lobbyPlayers.filter(p => p.peerId !== peerId);
                this._updateLobbyUI();
                this.hostState.broadcastLobby({
                    players: this.lobbyPlayers,
                    roomCode: this.net.roomCode
                });
            };
        } catch (err) {
            console.error('Failed to host:', err);
            this.menu.setStatus('Failed to create game. Try again.');
        }
    }

    // ---- Join Game ----
    async _joinGame(code) {
        this.menu.setStatus('Connecting...');
        try {
            await this.net.join(code);
            this.clientState = new ClientState(this.net);
            this.clientState.init();

            // Handle lobby updates from host
            this.clientState.onLobbyUpdate = (data) => {
                this.lobbyPlayers = data.players;
                // Find our index
                const myPeer = this.net.localId;
                for (const p of data.players) {
                    if (p.peerId === myPeer) {
                        this.localPlayerIndex = p.index;
                    }
                }
                this._updateLobbyUI();
            };

            // Handle game start
            this.clientState.onGameStart = (data) => {
                this._initMatch(data);
            };

            // Handle state updates
            this.clientState.onStateReceived = (state) => {
                this._applyNetworkState(state);
            };

            // Handle events
            this.clientState.onEventReceived = (event) => {
                this._handleGameEvent(event);
            };

            // Handle match end
            this.clientState.onGameEnd = (rankings) => {
                this._showRankings(rankings);
            };

            this.menu.showClientLobby(code);
            this.state = State.LOBBY;
        } catch (err) {
            console.error('Failed to join:', err);
            this.menu.setStatus('Failed to connect. Check the code and try again.');
        }
    }

    _updateLobbyUI() {
        const playerData = [];
        for (let i = 0; i < 4; i++) {
            const p = this.lobbyPlayers[i];
            playerData[i] = p ? { name: p.name } : null;
        }
        this.menu.updatePlayerList(playerData);
        this.menu.setStatus(`${this.lobbyPlayers.length}/4 players connected`);
    }

    // ---- Start Game ----
    _startGame() {
        if (!this.net.isHost) return;
        if (this.lobbyPlayers.length < 2) {
            this.menu.setStatus('Need at least 2 players!');
            return;
        }

        // Generate map
        this.planets = generateMap(this.lobbyPlayers.length);

        // Create players at spawn points
        this.players = [];
        const spawnPlanets = this.planets.slice(1); // Skip central planet

        for (let i = 0; i < this.lobbyPlayers.length; i++) {
            const player = new Player(
                this.lobbyPlayers[i].peerId || 'host',
                i
            );
            player.name = this.lobbyPlayers[i].name;
            const spawnPlanet = spawnPlanets[i % spawnPlanets.length];
            const spawnAngle = -Math.PI / 2; // Top of planet
            player.spawn(spawnPlanet, spawnAngle);
            this.players.push(player);
        }

        // Build start data
        const startData = {
            planets: this.planets.map(p => p.serialize()),
            players: this.players.map(p => p.serialize()),
            matchTime: this.matchTime
        };

        // Broadcast start
        this.hostState.broadcastStart(startData);

        // Init locally
        this._initMatch(startData);
    }

    _initMatch(data) {
        // Setup planets
        this.planets = data.planets.map(pd => Planet.deserialize(pd));

        // Setup players
        this.players = data.players.map(pd => Player.fromSerialized(pd));

        // Reset state
        this.projectiles = [];
        this.meteorites = [];
        this.particles = new ParticlePool(600);
        this.matchTimer = data.matchTime || this.matchTime;
        this.gameTime = 0;
        this.hazards.reset();
        this.hud.clear();

        // Countdown
        this.state = State.COUNTDOWN;
        this.countdownTimer = 3;
        this.menu.showScreen('countdown');
    }

    // ---- Leave Game ----
    _leaveGame() {
        this.net.disconnect();
        this.hostState = null;
        this.clientState = null;
        this.state = State.MENU;
        this.menu.showScreen('menu');
        this.input.hide();
        this.lobbyPlayers = [];
        this.peerPlayerMap.clear();
    }

    // ---- Update ----
    update(dt) {
        switch (this.state) {
            case State.MENU:
            case State.LOBBY:
                // Just animate background
                break;

            case State.COUNTDOWN:
                this.countdownTimer -= dt;
                document.getElementById('countdown-number').textContent =
                    Math.ceil(this.countdownTimer);
                if (this.countdownTimer <= 0) {
                    this.state = State.PLAYING;
                    this.menu.showScreen('hud');
                    this.input.show();
                }
                break;

            case State.PLAYING:
                // Sample input ONCE per frame (before fixed-step ticks)
                // This prevents one-shot events from being lost on multi-tick frames
                if (!this._frameInput) {
                    this._frameInput = this.input.getInput();
                }
                if (this.net.isHost) {
                    this._updateHost(dt);
                } else {
                    this._updateClient(dt);
                }
                // Mark input as consumed after this tick
                // (the loop may call update again, but we keep the input for all ticks)
                break;

            case State.RANKING:
                break;
        }
    }

    /**
     * Called AFTER all fixed-step ticks for a frame. Clears frame input.
     */
    postUpdate() {
        this._frameInput = null;
    }

    _updateHost(dt) {
        this.gameTime += dt;
        this.matchTimer -= dt;

        // Use cached frame input (sampled once per frame, not per tick)
        const localInput = this._frameInput || { moveX: 0, moveY: 0, jump: false, shootTarget: null };
        this._processInput(this.players[0], localInput, dt);
        // Clear one-shot events after first tick processes them
        // Note: shootTarget and jump are continuous now based on InputManager

        // Process remote inputs
        for (const [peerId, playerIdx] of this.peerPlayerMap) {
            const input = this.hostState.getInput(peerId);
            if (input && this.players[playerIdx]) {
                this._processInput(this.players[playerIdx], input, dt);
            }
        }

        // Update gravity for players FIRST (before timers, so jumpGraceTimer is still active)
        this.gravity.update(this.players.filter(p => p.alive), this.planets, dt);

        // THEN update timers (cooldowns, invulnerability, jumpGraceTimer, etc.)
        for (const player of this.players) {
            player.updateTimers(dt);
        }

        // Update gravity for projectiles
        for (const proj of this.projectiles) {
            if (!proj.active) continue;
            for (const planet of this.planets) {
                const pos = new Vec2(proj.x, proj.y);
                const dist = pos.distTo(new Vec2(planet.x, planet.y));
                if (dist < planet.gravityRange) {
                    const accel = Physics.gravityAccel(pos, planet);
                    proj.vx += accel.x * dt;
                    proj.vy += accel.y * dt;
                }
            }
            proj.update(dt);
        }

        // Update meteorites with gravity
        for (const met of this.meteorites) {
            if (!met.active) continue;
            for (const planet of this.planets) {
                const pos = new Vec2(met.x, met.y);
                const dist = pos.distTo(new Vec2(planet.x, planet.y));
                if (dist < planet.gravityRange) {
                    const accel = Physics.gravityAccel(pos, planet);
                    met.vx += accel.x * dt * 0.5;
                    met.vy += accel.y * dt * 0.5;
                }
            }
            met.update(dt);
        }

        // Update pickups (bobbing)
        for (const pickup of this.pickups) {
            pickup.update(dt);
        }

        // Spawn pickups periodically (host only)
        this.pickupSpawnTimer -= dt;
        if (this.pickupSpawnTimer <= 0) {
            this.pickupSpawnTimer = 10; // Every 10 seconds
            if (this.pickups.filter(p => p.active).length < 5) {
                const planet = this.planets[Math.floor(Math.random() * this.planets.length)];
                const angle = Math.random() * Math.PI * 2;
                const pos = planet.getSurfacePoint(angle);
                const types = Object.keys(Pickup.PICKUP_TYPES || {}); // Fallback if not static
                const type = ['HEALTH', 'MACHINE_GUN', 'SNIPER'][Math.floor(Math.random() * 3)];
                const id = 'pickup_' + Date.now() + '_' + Math.random();
                // Adjust position to be slightly above planet
                const dir = new Vec2(pos.x - planet.x, pos.y - planet.y).normalize();
                const spawnX = planet.x + dir.x * (planet.radius + 30);
                const spawnY = planet.y + dir.y * (planet.radius + 30);
                this.pickups.push(new Pickup(id, spawnX, spawnY, type));
            }
        }

        // Pickup collisions
        for (const player of this.players) {
            if (!player.alive) continue;
            for (const pickup of this.pickups) {
                if (!pickup.active) continue;
                const dist = Math.sqrt((player.x - pickup.x) ** 2 + (player.y - pickup.y) ** 2);
                if (dist < player.radius + pickup.radius) {
                    pickup.active = false;
                    this._handlePickupEffect(player, pickup);
                    this.hostState.broadcastEvent({ type: 'pickup', playerId: player.id, pickupId: pickup.id, pickupType: pickup.typeKey });
                }
            }
        }

        // Cleanup inactive pickups
        this.pickups = this.pickups.filter(p => p.active);

        // Hazard system (spawn meteorites)
        this.hazards.update(dt, this.meteorites, this.planets);

        // Collision detection
        const events = this.collision.update(
            this.players, this.projectiles, this.meteorites,
            this.planets, this.particles
        );

        // Handle events
        for (const event of events) {
            this._handleGameEvent(event);
            this.hostState.broadcastEvent(event);
        }

        // Respawn dead players
        for (const player of this.players) {
            // Infinite void death check (if player flies too far into infinity)
            if (player.alive) {
                const distFromCenter = Math.sqrt(player.x * player.x + player.y * player.y);
                if (distFromCenter > 2000) { // Void boundary
                    player.takeDamage(9999, 'void');
                    this.hud.addKillFeed('The Void', player.name, '#555555');
                }
            }

            if (!player.alive && player.respawnTimer <= 0) {
                const spawnPlanet = this.planets[1 + (player.index % (this.planets.length - 1))];
                const angle = Math.random() * Math.PI * 2;
                player.spawn(spawnPlanet, angle);
            }
        }

        // Meteorite trail particles
        for (const met of this.meteorites) {
            if (met.active) {
                this.particles.meteorTrail(met.x, met.y);
            }
        }

        // Update particles
        this.particles.update(dt);

        // Update HUD
        this.hud.updateTimer(this.matchTimer);
        this.hud.updatePlayers(this.players);

        // Meteor shower warning
        if (this.hazards.isShowerActive()) {
            if (this.gameTime % 5 < dt) {
                this.hud.showWarning('METEOR SHOWER!');
            }
        }

        // Broadcast state
        this.hostState.broadcastState(dt, this._serializeGameState());

        // Check win conditions
        this._checkWinConditions();

        // Camera follows local player + nearby action
        this._updateCamera(dt);
    }

    _updateClient(dt) {
        this.gameTime += dt;

        // Send local input (use cached frame input)
        const localInput = this._frameInput || { moveX: 0, moveY: 0, jump: false, shootTarget: null };
        if (localInput.shootTarget) {
            // Convert screen coords to world coords for the shoot target
            const world = this.camera.screenToWorld(localInput.shootTarget.x, localInput.shootTarget.y);
            localInput.shootTarget = world;
        }
        this.clientState.sendInput(dt, localInput);

        // Update particles locally
        this.particles.update(dt);

        // Meteorite trails (local visual only)
        for (const met of this.meteorites) {
            if (met.active) {
                this.particles.meteorTrail(met.x, met.y);
            }
        }

        // Update HUD
        this.hud.updateTimer(this.matchTimer);
        this.hud.updatePlayers(this.players);

        // Update camera
        this._updateCamera(dt);
    }

    _processInput(player, input, dt) {
        if (!player || !player.alive) return;

        // Movement
        player.moveX = input.moveX || 0;

        // Jump
        if (input.jump) {
            const { planet } = Physics.nearestPlanet(
                new Vec2(player.x, player.y), this.planets
            );
            if (planet && this.gravity.jump(player, planet)) {
                this.particles.jumpDust(player.x, player.y, player.surfaceAngle);
            }
        }

        // Continuous aim tracking (update arm direction toward mouse/touch)
        if (input.aimTarget && this.net.isHost && player.index === 0) {
            // Host local: convert screen to world
            const world = this.camera.screenToWorld(input.aimTarget.x, input.aimTarget.y);
            this._updateAim(player, world.x, world.y);
        } else if (input.aimTarget) {
            // Client input already in world coords
            this._updateAim(player, input.aimTarget.x, input.aimTarget.y);
        }

        // Shoot
        if (input.shootTarget) {
            let targetX, targetY;
            if (this.net.isHost && player.index === 0) {
                // Host local input: convert screen to world
                const world = this.camera.screenToWorld(input.shootTarget.x, input.shootTarget.y);
                targetX = world.x;
                targetY = world.y;
            } else {
                // Client input already in world coords
                targetX = input.shootTarget.x;
                targetY = input.shootTarget.y;
            }

            // Update aim angle before firing
            this._updateAim(player, targetX, targetY);

            const newProjs = this.weapons.fire(player, targetX, targetY, this.particles);
            this.projectiles.push(...newProjs);
        }
    }

    /**
     * Update player aim direction (for arm rendering)
     */
    _updateAim(player, worldX, worldY) {
        const dx = worldX - player.x;
        const dy = worldY - player.y;
        const worldAngle = Math.atan2(dy, dx);
        // Convert to player's local frame (renderer rotates by surfaceAngle + PI/2)
        player.aimAngle = worldAngle - player.surfaceAngle - Math.PI / 2;
        // Flip facing based on aim
        if (Math.cos(player.aimAngle) < 0 && !player.facingLeft) player.facingLeft = true;
        if (Math.cos(player.aimAngle) > 0 && player.facingLeft) player.facingLeft = false;
    }

    _serializeGameState() {
        return {
            players: this.players.map(p => p.serialize()),
            projectiles: this.projectiles.map(p => p.serialize()),
            meteorites: this.meteorites.map(m => m.serialize()),
            timer: Math.round(this.matchTimer * 10) / 10,
            time: Math.round(this.gameTime * 10) / 10
        };
    }

    _applyNetworkState(state) {
        // Update players
        if (state.players) {
            for (const pd of state.players) {
                let player = this.players.find(p => p.id === pd.id);
                if (player) {
                    player.applyState(pd);
                } else {
                    this.players.push(Player.fromSerialized(pd));
                }
            }
        }

        // Update projectiles
        if (state.projectiles) {
            this.projectiles = state.projectiles.map(pd => Projectile.fromSerialized(pd));
        }

        // Update meteorites
        if (state.meteorites) {
            this.meteorites = state.meteorites.map(md => Meteorite.fromSerialized(md));
        }

        // Update timer
        if (state.timer !== undefined) {
            this.matchTimer = state.timer;
        }
    }

    _handlePickupEffect(player, pickup) {
        if (pickup.typeKey === 'HEALTH') {
            player.health = Math.min(player.maxHealth, player.health + 40);
            this.particles.explosion(pickup.x, pickup.y, '#00ff88', 15);
        } else {
            // Weapon pickups
            player.currentWeapon = pickup.typeKey;
            this.particles.explosion(pickup.x, pickup.y, pickup.type.color, 15);
            console.log(`${player.name} picked up ${pickup.typeKey}`);
        }
    }

    _handleGameEvent(event) {
        switch (event.type) {
            case 'kill':
                const killer = this.players.find(p => p.id === event.killerId);
                this.hud.addKillFeed(
                    event.killerName || 'Unknown',
                    event.victimName || 'Unknown',
                    killer?.color || '#fff'
                );
                this.camera.shake(8, 0.4);
                break;
            case 'hit':
                this.particles.impact(event.x, event.y, event.color || '#ffffff');
                break;
            case 'pickup':
                const p = this.players.find(pl => pl.id === event.playerId);
                if (p) p.currentWeapon = event.pickupType;
                // Find and hide pickup if exists locally
                const pickup = this.pickups.find(pk => pk.id === event.pickupId);
                if (pickup) pickup.active = false;
                this.particles.explosion(event.x || 0, event.y || 0, '#ffffff', 10);
                break;
            case 'meteorite_impact':
                this.camera.shake(5, 0.3);
                if (event.x !== undefined) {
                    this.particles.explosion(event.x, event.y, '#ff6600', 20);
                }
                break;
        }
    }

    _checkWinConditions() {
        // Check kill target
        for (const player of this.players) {
            if (player.kills >= this.killTarget) {
                this._endMatch();
                return;
            }
        }

        // Check time
        if (this.matchTimer <= 0) {
            this._endMatch();
        }
    }

    _endMatch() {
        const rankings = this.players.map(p => ({
            name: p.name,
            color: p.color,
            kills: p.kills,
            deaths: p.deaths,
            shotsFired: p.shotsFired,
            shotsHit: p.shotsHit,
            damageDealt: p.damageDealt
        }));

        if (this.net.isHost) {
            this.hostState.broadcastEnd(rankings);
        }

        this._showRankings(rankings);
    }

    _showRankings(rankings) {
        this.state = State.RANKING;
        this.input.hide();
        this.menu.showScreen('ranking');
        this.ranking.show(rankings);
    }

    _updateCamera(dt) {
        // Collect alive player positions
        const positions = this.players
            .filter(p => p.alive)
            .map(p => ({ x: p.x, y: p.y }));

        if (positions.length === 0 && this.planets.length > 0) {
            positions.push({ x: this.planets[0].x, y: this.planets[0].y });
        }

        this.camera.follow(positions, dt);
    }

    // ---- Render ----
    render(alpha) {
        const ctx = this.renderer.ctx;
        this.renderer.clear();

        // Background (always drawn)
        this.renderer.drawBackground(this.camera, 1 / 60);

        if (this.state === State.PLAYING || this.state === State.COUNTDOWN || this.state === State.RANKING) {
            // Apply camera transform
            this.camera.applyTransform(ctx);

            // Draw planets
            for (const planet of this.planets) {
                this.renderer.drawPlanet(planet);
            }

            // Draw pickups
            for (const pickup of this.pickups) {
                if (pickup.active) {
                    this.renderer.drawPickup(pickup);
                }
            }

            // Draw projectiles
            for (const proj of this.projectiles) {
                if (proj.active !== false) {
                    this.renderer.drawProjectile(proj);
                }
            }

            // Draw meteorites
            for (const met of this.meteorites) {
                if (met.active !== false) {
                    this.renderer.drawMeteorite(met);
                }
            }

            // Draw particles
            for (const p of this.particles.getActive()) {
                this.renderer.drawParticle(p);
            }

            // Draw players
            for (const player of this.players) {
                if (player.alive) {
                    this.renderer.drawPlayer(player, this.gameTime);
                }
            }

            // Restore camera transform
            this.camera.restoreTransform(ctx);
        }
    }
}

// ---- Bootstrap ----
window.addEventListener('DOMContentLoaded', () => {
    // Force landscape hint
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => { });
    }

    // Start game
    window.game = new Game();
});
