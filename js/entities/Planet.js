// =============================================
// Planet.js — Celestial body with gravity and surface
// =============================================

export const PLANET_THEMES = {
    lava: {
        baseColor: '#8B2500',
        lightColor: '#CD4F39',
        darkColor: '#4A1300',
        atmosColor: '#FF4500',
        detailColor: '#FF6B35',
        name: 'Volcanic'
    },
    ice: {
        baseColor: '#4682B4',
        lightColor: '#87CEEB',
        darkColor: '#1C3A5F',
        atmosColor: '#00BFFF',
        detailColor: '#B0E0E6',
        name: 'Frozen'
    },
    forest: {
        baseColor: '#2E6B3A',
        lightColor: '#5BA870',
        darkColor: '#1A3D22',
        atmosColor: '#00FF7F',
        detailColor: '#90EE90',
        name: 'Terra'
    },
    crystal: {
        baseColor: '#6A0DAD',
        lightColor: '#9B59B6',
        darkColor: '#3B0764',
        atmosColor: '#BF40BF',
        detailColor: '#DA70D6',
        name: 'Crystal'
    },
    desert: {
        baseColor: '#B8860B',
        lightColor: '#DAA520',
        darkColor: '#7A5B00',
        atmosColor: '#FFD700',
        detailColor: '#F5DEB3',
        name: 'Arid'
    }
};

const THEME_KEYS = Object.keys(PLANET_THEMES);

export class Planet {
    constructor(x, y, radius, themeKey = null) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.mass = radius * 1.5; // Bigger planets = stronger gravity

        // Theme
        const key = themeKey || THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
        this.themeKey = key;
        this.theme = PLANET_THEMES[key];

        // Generate random surface details
        this.details = [];
        const numDetails = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < numDetails; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 0.7;
            this.details.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: Math.random() * 0.15 + 0.05
            });
        }

        // Gravity range
        this.gravityRange = radius * 5;
    }

    /**
     * Check if a position is on the surface
     */
    isOnSurface(x, y, threshold = 5) {
        const dist = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return Math.abs(dist - this.radius) < threshold;
    }

    /**
     * Check if inside planet
     */
    isInside(x, y) {
        const dist = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return dist < this.radius;
    }

    /**
     * Get surface position at a given angle
     */
    getSurfacePoint(angle) {
        return {
            x: this.x + Math.cos(angle) * (this.radius + 2),
            y: this.y + Math.sin(angle) * (this.radius + 2)
        };
    }

    /**
     * Serialize for network
     */
    serialize() {
        return {
            x: this.x, y: this.y,
            radius: this.radius,
            themeKey: this.themeKey,
            mass: this.mass
        };
    }

    static deserialize(data) {
        const p = new Planet(data.x, data.y, data.radius, data.themeKey);
        p.mass = data.mass;
        return p;
    }
}

/**
 * Generate a map of planets
 */
export function generateMap(playerCount) {
    const planets = [];
    const themes = [...THEME_KEYS];

    // Core planets (Binary system)
    planets.push(new Planet(-150, 0, 140, 'lava'));
    planets.push(new Planet(150, 0, 140, 'ice'));

    // Inner ring
    const innerRadius = 500;
    const numInner = 4;
    for (let i = 0; i < numInner; i++) {
        const angle = (Math.PI * 2 / numInner) * i + Math.random() * 0.5;
        const x = Math.cos(angle) * innerRadius;
        const y = Math.sin(angle) * innerRadius;
        planets.push(new Planet(x, y, 70 + Math.random() * 20, themes[(i + 2) % themes.length]));
    }

    // Outer ring
    const outerRadius = 900;
    const numOuter = Math.max(playerCount + 2, 6);
    for (let i = 0; i < numOuter; i++) {
        const angle = (Math.PI * 2 / numOuter) * i + Math.random() * 0.3;
        const x = Math.cos(angle) * outerRadius;
        const y = Math.sin(angle) * outerRadius;
        planets.push(new Planet(x, y, 50 + Math.random() * 30, themes[i % themes.length]));
    }

    // Dotted small moons
    for (let i = 0; i < 7; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 800;
        const radius = 25 + Math.random() * 15;
        planets.push(new Planet(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            radius,
            themes[Math.floor(Math.random() * themes.length)]
        ));
    }

    return planets;
}
