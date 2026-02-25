// =============================================
// SVGAssets.js — All inline SVG sprite definitions
// =============================================

// SVGs are pre-rendered to offscreen canvases for performance
export class SVGAssets {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get or create a cached image from SVG string
     */
    getImage(key, svgString, width, height) {
        if (this.cache.has(key)) return this.cache.get(key);

        const img = new Image();
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.width = width;
        img.height = height;
        this.cache.set(key, img);

        img.onload = () => URL.revokeObjectURL(url);
        return img;
    }
}

// Planet ring decoration SVG
export function createPlanetRingSVG(color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30">
        <ellipse cx="50" cy="15" rx="48" ry="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.4"/>
        <ellipse cx="50" cy="15" rx="42" ry="9" fill="none" stroke="${color}" stroke-width="1" opacity="0.2"/>
    </svg>`;
}

// Explosion burst SVG
export function createExplosionSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
            <radialGradient id="eg">
                <stop offset="0%" style="stop-color:#ffffff"/>
                <stop offset="30%" style="stop-color:#ffdd44"/>
                <stop offset="70%" style="stop-color:#ff6600"/>
                <stop offset="100%" style="stop-color:transparent"/>
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#eg)"/>
    </svg>`;
}

// Star sparkle SVG
export function createStarSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#ffffff" opacity="0.8"/>
    </svg>`;
}
