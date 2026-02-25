// =============================================
// HUD.js — In-game heads-up display
// =============================================

export class HUD {
    constructor() {
        this.timerEl = document.getElementById('match-timer');
        this.playerInfoEl = document.getElementById('hud-player-info');
        this.killFeedEl = document.getElementById('kill-feed');
        this.killFeedEntries = [];
        this.maxKillFeed = 5;
    }

    /**
     * Update match timer display
     */
    updateTimer(secondsLeft) {
        const mins = Math.floor(secondsLeft / 60);
        const secs = Math.floor(secondsLeft % 60);
        this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Flash when low time
        if (secondsLeft <= 10) {
            this.timerEl.style.color = '#ff3366';
            this.timerEl.style.animation = 'pulse 0.5s ease-in-out infinite';
        } else {
            this.timerEl.style.color = '';
            this.timerEl.style.animation = '';
        }
    }

    /**
     * Update player info cards
     */
    updatePlayers(players) {
        this.playerInfoEl.innerHTML = '';

        for (const player of players) {
            const card = document.createElement('div');
            card.className = 'hud-card';
            card.style.borderColor = player.color + '40';

            const name = document.createElement('div');
            name.className = 'hud-name';
            name.textContent = player.name;
            name.style.color = player.color;

            const hpBar = document.createElement('div');
            hpBar.className = 'hud-hp-bar';
            const hpFill = document.createElement('div');
            hpFill.className = 'hud-hp-fill';
            const hpPct = player.alive ? (player.health / player.maxHealth * 100) : 0;
            hpFill.style.width = hpPct + '%';
            hpFill.style.background = hpPct > 50 ? '#00ff88' : hpPct > 25 ? '#ffaa00' : '#ff3366';
            hpBar.appendChild(hpFill);

            const kills = document.createElement('div');
            kills.className = 'hud-kills';
            kills.textContent = `☠ ${player.kills}`;

            card.appendChild(name);
            card.appendChild(hpBar);
            card.appendChild(kills);
            this.playerInfoEl.appendChild(card);
        }
    }

    /**
     * Add kill feed entry
     */
    addKillFeed(killerName, victimName, killerColor = '#fff') {
        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        entry.innerHTML = `<span style="color:${killerColor}">${killerName}</span> ☠ ${victimName}`;

        this.killFeedEl.appendChild(entry);
        this.killFeedEntries.push(entry);

        // Remove old entries
        while (this.killFeedEntries.length > this.maxKillFeed) {
            const old = this.killFeedEntries.shift();
            old.remove();
        }

        // Auto-remove after 4 seconds
        setTimeout(() => {
            entry.style.opacity = '0';
            entry.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                entry.remove();
                const idx = this.killFeedEntries.indexOf(entry);
                if (idx >= 0) this.killFeedEntries.splice(idx, 1);
            }, 500);
        }, 4000);
    }

    /**
     * Show meteor shower warning
     */
    showWarning(text) {
        const warn = document.createElement('div');
        warn.className = 'kill-entry';
        warn.style.background = 'rgba(255, 100, 0, 0.4)';
        warn.style.color = '#ffaa00';
        warn.textContent = `⚠️ ${text}`;
        this.killFeedEl.appendChild(warn);

        setTimeout(() => {
            warn.style.opacity = '0';
            warn.style.transition = 'opacity 0.5s';
            setTimeout(() => warn.remove(), 500);
        }, 3000);
    }

    clear() {
        this.killFeedEl.innerHTML = '';
        this.killFeedEntries = [];
        this.playerInfoEl.innerHTML = '';
    }
}
