/**
 * Natural camera flights. MapLibre's flyTo moves along a zoom-out / zoom-in
 * arc whose length S (in "screenfuls") it derives from the distance and zoom
 * change; a fixed duration makes long flights rush and short ones crawl.
 * `flightDurationMs` reproduces S so every flight travels at the same
 * perceived speed, within bounds.
 */

const RHO = 1.42; // MapLibre's default flyTo curve

const mercX = (lng: number) => (lng + 180) / 360;
const mercY = (lat: number) => {
  const s = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

export interface FlightEnds {
  from: { lng: number; lat: number; zoom: number };
  to: { lng: number; lat: number; zoom: number };
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
}

/** MapLibre's flyTo path length S (screenfuls travelled along the zoom arc). */
export function flightPathLength({ from, to, width, height }: FlightEnds): number {
  const worldSize = 512 * 2 ** from.zoom;
  let dx = mercX(to.lng) - mercX(from.lng);
  if (dx > 0.5) dx -= 1;
  if (dx < -0.5) dx += 1;
  const u1 = Math.hypot(dx, mercY(to.lat) - mercY(from.lat)) * worldSize;
  const w0 = Math.max(width, height);
  const w1 = w0 / 2 ** (to.zoom - from.zoom);
  const rho2 = RHO * RHO;
  const r = (descent: boolean) => {
    const b = (w1 * w1 - w0 * w0 + (descent ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (descent ? w1 : w0) * rho2 * u1);
    return Math.log(Math.sqrt(b * b + 1) - b);
  };
  let S = (r(true) - r(false)) / RHO;
  if (Math.abs(u1) < 1e-6 || !Number.isFinite(S)) S = Math.abs(Math.log(w1 / w0)) / RHO;
  return Number.isFinite(S) ? S : 0;
}

/**
 * Duration for a flight at a calm, constant perceived speed (`speed`
 * screenfuls per second), never shorter than `minMs` nor longer than `maxMs`.
 */
export function flightDurationMs(ends: FlightEnds, { speed = 0.85, minMs = 1800, maxMs = 6500 } = {}): number {
  const S = flightPathLength(ends);
  return Math.round(Math.min(maxMs, Math.max(minMs, (1000 * S) / speed)));
}

/** Slow-in, slow-out: flights start and land gently. */
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
