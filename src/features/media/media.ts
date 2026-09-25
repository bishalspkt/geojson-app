/**
 * Media properties on features: a feature can carry a preview image, a
 * playable clip and a source link. Only https URLs are used.
 *
 *   image   — preview image (shown in the hover card and the media card)
 *   video   — a playable video file (webm/mp4), shown in the media card
 *   url     — the source page (opened in a new tab)
 *   credit  — author / rights holder;  license — licence text
 *   captured — when it was taken;  approximate — true when placed by name, not a geotag
 */
export interface FeatureMedia {
  image: string | null;
  video: string | null;
  url: string | null;
  credit: string | null;
  license: string | null;
  captured: string | null;
  approximate: boolean;
}

const https = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\//i.test(v) ? v : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The feature's media, or null when it has none to show. */
export function featureMedia(props: Record<string, unknown> | null | undefined): FeatureMedia | null {
  if (!props) return null;
  const image = https(props.image);
  const video = https(props.video);
  if (!image && !video) return null;
  return {
    image,
    video,
    url: https(props.url),
    credit: text(props.credit),
    license: text(props.license),
    captured: text(props.captured),
    approximate: props.approximate === true,
  };
}

/** Property keys the media convention owns (kept out of generic property lists). */
export const MEDIA_KEYS = ['image', 'video', 'url', 'credit', 'license', 'captured', 'approximate'];
