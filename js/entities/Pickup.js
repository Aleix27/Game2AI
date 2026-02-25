// =============================================
// Pickup.js — Spawnable items on planets
// =============================================

export const PICKUP_TYPES = {
    HEALTH: {
        color: '#00ff88',
        icon: '+',
        name: 'Health Pack'
    },
    SNIPER: {
        color: '#ff3366',
        icon: '⌖',
        name: 'Railgun'
    },
    MACHINE_GUN: {
        color: '#00d4ff',
        icon: '»',
        name: 'Machine Gun'
    },
    SHOTGUN: {
        color: '#ff6b35',
        icon: '∴',
        name: 'Shotgun'
    }
};

export class Pickup {
    constructor(id, x, y, typeKey) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.typeKey = typeKey;
        this.type = PICKUP_TYPES[typeKey];
        this.radius = 15;
        this.active = true;

        // Pickups hover above the ground, so we store a base Y and bob it
        this.baseX = x;
        this.baseY = y;
        this.time = Math.random() * 10;
        this.surfaceAngle = 0; // Set by main loop later
    }

    update(dt) {
        this.time += dt * 3;
        // Hover effect away from planet center (calculated in main)
    }

    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            t: this.typeKey
        };
    }

    static fromSerialized(data) {
        return new Pickup(data.id, data.x, data.y, data.t);
    }
}
