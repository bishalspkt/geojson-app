/**
 * Deterministic starfield background for globe projection, as a CSS url() data URI.
 * Seeded PRNG so the sky is identical across sessions.
 */
export function generateStarfieldBackground(): string {
  const W = 1200,
    H = 1200,
    NUM = 350;
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  let circles = '';
  for (let i = 0; i < NUM; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = rand() * 1.1 + 0.3;
    const opacity = rand() * 0.5 + 0.2;
    circles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="white" opacity="${opacity.toFixed(2)}"/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${circles}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
