/**
 * Guards for untrusted input (story documents, `?geojson=` data, SDK calls).
 * Anything that reaches an HTML sink or a link target goes through here.
 */

/** The value when it is an absolute http(s) URL, else null. */
export function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const ANCHOR_RE = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;
const TAG_RE = /<[^>]*>/g;

/** Undo the few entities attribution strings commonly carry, so re-escaping doesn't double them. */
function decodeBasicEntities(text: string): string {
  return text
    .replace(/&copy;/gi, '©')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&');
}

const plain = (html: string) => escapeHtml(decodeBasicEntities(html.replace(TAG_RE, '')));

/**
 * Attribution strings are rendered as HTML by MapLibre's attribution control.
 * Keep only text and `<a href="http(s)://…">` links (opened in a new tab);
 * every other tag or attribute is dropped and all text is escaped.
 */
export function sanitizeAttribution(html: string | undefined | null): string | undefined {
  if (!html) return undefined;
  let out = '';
  let last = 0;
  for (const m of html.matchAll(ANCHOR_RE)) {
    out += plain(html.slice(last, m.index));
    const href = httpUrl(decodeBasicEntities(m[2]));
    const label = plain(m[3]);
    out += href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : label;
    last = m.index + m[0].length;
  }
  out += plain(html.slice(last));
  return out.trim() || undefined;
}
