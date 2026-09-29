/**
 * The geojson.app mark: a terrain tile with a route across it (point, line and
 * polygon on one tile). The peaks are pyramids iso-projected onto the tile
 * plane, P(u, v, h) = (32 + 22(u − v), 20.5 + 12.5(u + v) − h), so their bases
 * run parallel to the tile edges. This is the small cut without the app-icon
 * background, drawn to sit on `bg-brand`. The full-colour icons live in `public/`
 * (favicon.svg, icon-*.png, web-app-manifest-*.png).
 */
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="8 8.5 48 48" className={className} aria-hidden focusable="false">
      <path d="M10 33v7l22 12.5V45.5z" fill="#6a4ae6" />
      <path d="M54 33v7L32 52.5V45.5z" fill="#24106e" />
      <path d="M32 20.5 54 33 32 45.5 10 33z" fill="#8468ff" />
      <path d="M40.1 17.6 32.2 29.6 40.1 34.1z" fill="#e2dbff" />
      <path d="M40.1 17.6 40.1 34.1 48.1 29.6z" fill="#a996ff" />
      <path d="M27.2 12.5 16.2 31.5 27.2 37.8z" fill="#fff" />
      <path d="M27.2 12.5 27.2 37.8 38.2 31.5z" fill="#c9bcff" />
      <path
        d="M12.2 32.5 26.5 41.1 39.3 40.1 50.7 33.6"
        fill="none"
        stroke="#5eead4"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
