/** Default styling values — the existing violet palette */
export const DEFAULTS = {
  point: {
    color: '#5b21b6',
    strokeColor: '#ffffff',
    radius: { baseZoom: 2, baseSize: 5, maxZoom: 10, maxSize: 8 },
    glowRadius: { baseZoom: 2, baseSize: 10, maxZoom: 10, maxSize: 16 },
  },
  line: {
    color: '#7c3aed',
    casingColor: '#4c1d95',
    width: { baseZoom: 2, baseSize: 2.5, maxZoom: 10, maxSize: 5 },
    casingWidth: { baseZoom: 2, baseSize: 4, maxZoom: 10, maxSize: 7 },
    opacity: 1,
    casingOpacity: 0.4,
  },
  polygon: {
    fillColor: '#8b5cf6',
    outlineColor: '#5b21b6',
    fillOpacity: 0.2,
    hoverFillOpacity: 0.35,
    outlineWidth: { baseZoom: 2, baseSize: 1.5, maxZoom: 10, maxSize: 3 },
    outlineOpacity: 0.7,
  },
  highlight: {
    fillColor: '#f97316',
    strokeColor: '#ea580c',
    glowColor: '#fb923c',
  },
} as const;
