// =============================================
// Ranking.js — End-of-match scoreboard
// =============================================

export class Ranking {
    constructor() {
        this.listEl = document.getElementById('ranking-list');
        this.onRematch = null;
        this.onMenu = null;

        document.getElementById('btn-rematch').addEventListener('click', () => {
            if (this.onRematch) this.onRematch();
        });

        document.getElementById('btn-menu').addEventListener('click', () => {
            if (this.onMenu) this.onMenu();
        });
    }

    /**
     * Show rankings with animated reveal
     */
    show(players) {
        this.listEl.innerHTML = '';

        // Sort by kills (desc), then deaths (asc)
        const sorted = [...players].sort((a, b) => {
            if (b.kills !== a.kills) return b.kills - a.kills;
            return a.deaths - b.deaths;
        });

        const medals = ['🥇', '🥈', '🥉', '4th'];

        sorted.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.className = 'ranking-entry';
            entry.style.animationDelay = `${index * 0.2}s`;

            const pos = document.createElement('span');
            pos.className = 'rank-pos';
            pos.textContent = medals[index] || `${index + 1}`;
            pos.style.color = player.color;

            const name = document.createElement('span');
            name.className = 'rank-name';
            name.textContent = player.name;
            name.style.color = player.color;

            const stats = document.createElement('div');
            stats.className = 'rank-stats';

            const accuracy = player.shotsFired > 0
                ? Math.round((player.shotsHit / player.shotsFired) * 100)
                : 0;

            stats.innerHTML = `
                <div class="rank-stat">
                    <span class="rank-stat-val">${player.kills}</span>
                    <span class="rank-stat-label">KILLS</span>
                </div>
                <div class="rank-stat">
                    <span class="rank-stat-val">${player.deaths}</span>
                    <span class="rank-stat-label">DEATHS</span>
                </div>
                <div class="rank-stat">
                    <span class="rank-stat-val">${accuracy}%</span>
                    <span class="rank-stat-label">ACC</span>
                </div>
                <div class="rank-stat">
                    <span class="rank-stat-val">${player.damageDealt || 0}</span>
                    <span class="rank-stat-label">DMG</span>
                </div>
            `;

            entry.appendChild(pos);
            entry.appendChild(name);
            entry.appendChild(stats);
            this.listEl.appendChild(entry);
        });
    }
}
