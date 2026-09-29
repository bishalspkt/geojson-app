import type { SVGProps } from 'react';

/**
 * Hand-drawn glyphs for the demo datasets, on lucide's 24px grid and stroke
 * conventions so they sit naturally beside the other panel icons.
 */
function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** A seismogram: quiet trace, a burst of shaking, then aftershock wiggles. */
export function SeismogramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M2 12h3.5l1.5-2.5 1.5 5L10 4l2.5 16 2-11 1.5 5 1-2h5.5" />
    </Glyph>
  );
}

/** The meteorological tropical-cyclone symbol: an eye with two spiral arms. */
export function CycloneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M9 12c0-5 3.5-8.5 9.5-8.5" />
      <path d="M15 12c0 5-3.5 8.5-9.5 8.5" />
    </Glyph>
  );
}

/** A globe cracked into plates along jagged boundaries. */
export function PlatesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.8 9.5 7 11l2.5-3 3 2.5 3-1.5 5.7.8" />
      <path d="M9.5 8 8 3.2" />
      <path d="m12.5 10.5-.5 4.5 3.5 2 1 3.6" />
      <path d="M12 15l-4.5 1.5-2 3" />
    </Glyph>
  );
}

/** A flame inside a burn-scar perimeter. */
export function FirePerimeterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M12 6.5c.6 2 3.5 3.3 3.5 6.8a3.5 3.5 0 0 1-7 0c0-1.6.8-2.6 1.6-3.3.3 1 .9 1.6 1.6 1.6-.3-2.1-.4-3.6.3-5.1Z" />
      <path d="M4.5 17.5C2.5 14 3 8 6 5.5s8-3.5 11.5-1S22 11 20.5 15.5 14 21.5 9.5 21" strokeDasharray="2.5 3" />
    </Glyph>
  );
}
