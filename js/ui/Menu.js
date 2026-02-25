// =============================================
// Menu.js — Main menu & lobby UI
// =============================================

export class Menu {
    constructor() {
        this.menuScreen = document.getElementById('menu-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.lobbyTitle = document.getElementById('lobby-title');
        this.roomCodeEl = document.getElementById('room-code');
        this.joinInputArea = document.getElementById('join-input-area');
        this.joinCodeInput = document.getElementById('join-code-input');
        this.btnConnect = document.getElementById('btn-connect');
        this.btnStart = document.getElementById('btn-start');
        this.btnLeave = document.getElementById('btn-leave');
        this.playerListEl = document.getElementById('player-list');
        this.lobbyStatus = document.getElementById('lobby-status');

        this.onHost = null;
        this.onJoin = null;
        this.onStart = null;
        this.onLeave = null;

        this._bindEvents();
    }

    _bindEvents() {
        document.getElementById('btn-host').addEventListener('click', () => {
            if (this.onHost) this.onHost();
        });

        document.getElementById('btn-join').addEventListener('click', () => {
            this._showJoinInput();
        });

        this.btnConnect.addEventListener('click', () => {
            const code = this.joinCodeInput.value.trim().toUpperCase();
            if (code.length === 4 && this.onJoin) {
                this.onJoin(code);
            }
        });

        this.joinCodeInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.btnConnect.click();
        });

        this.btnStart.addEventListener('click', () => {
            if (this.onStart) this.onStart();
        });

        this.btnLeave.addEventListener('click', () => {
            if (this.onLeave) this.onLeave();
        });
    }

    _showJoinInput() {
        this.showScreen('lobby');
        this.lobbyTitle.textContent = 'JOIN GAME';
        this.joinInputArea.classList.remove('hidden');
        this.roomCodeEl.parentElement.classList.add('hidden');
        this.btnStart.classList.add('hidden');
        this.lobbyStatus.textContent = 'Enter the room code to join...';
        this.joinCodeInput.focus();
    }

    showScreen(name) {
        this.menuScreen.classList.remove('active');
        this.lobbyScreen.classList.remove('active');
        document.getElementById('countdown-overlay').classList.remove('active');
        document.getElementById('hud').classList.remove('active');
        document.getElementById('ranking-screen').classList.remove('active');

        switch (name) {
            case 'menu':
                this.menuScreen.classList.add('active');
                break;
            case 'lobby':
                this.lobbyScreen.classList.add('active');
                break;
            case 'countdown':
                document.getElementById('countdown-overlay').classList.add('active');
                break;
            case 'hud':
                document.getElementById('hud').classList.add('active');
                break;
            case 'ranking':
                document.getElementById('ranking-screen').classList.add('active');
                break;
        }
    }

    showHostLobby(roomCode) {
        this.showScreen('lobby');
        this.lobbyTitle.textContent = 'GAME LOBBY';
        this.roomCodeEl.textContent = roomCode;
        this.roomCodeEl.parentElement.classList.remove('hidden');
        this.joinInputArea.classList.add('hidden');
        this.btnStart.classList.remove('hidden');
        this.lobbyStatus.textContent = 'Waiting for players to join...';
    }

    showClientLobby(roomCode) {
        this.showScreen('lobby');
        this.lobbyTitle.textContent = 'GAME LOBBY';
        this.roomCodeEl.textContent = roomCode;
        this.roomCodeEl.parentElement.classList.remove('hidden');
        this.joinInputArea.classList.add('hidden');
        this.btnStart.classList.add('hidden');
        this.lobbyStatus.textContent = 'Waiting for host to start...';
    }

    updatePlayerList(players) {
        this.playerListEl.innerHTML = '';
        const colors = ['#00d4ff', '#ff6b35', '#00ff88', '#ff3366'];

        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.className = 'player-slot' + (players[i] ? ' connected' : '');

            const dot = document.createElement('div');
            dot.className = 'player-dot';
            dot.style.background = colors[i];

            const name = document.createElement('span');
            name.className = 'player-slot-name';
            name.textContent = players[i]?.name || `Slot ${i + 1}`;
            name.style.color = players[i] ? colors[i] : 'rgba(150,160,200,0.3)';

            const status = document.createElement('span');
            status.className = 'player-slot-status';
            status.textContent = players[i] ? '● Connected' : 'Empty';

            slot.appendChild(dot);
            slot.appendChild(name);
            slot.appendChild(status);
            this.playerListEl.appendChild(slot);
        }
    }

    setStatus(text) {
        this.lobbyStatus.textContent = text;
    }
}
