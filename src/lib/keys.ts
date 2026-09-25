/**
 * Global keyboard shortcuts (Space = play, ←/→ = chapters, Backspace = undo
 * a measure point) must not fire while the key means something where focus is.
 */

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const CONTROLS = `${TYPING}, button, a[href], [role="button"], [role="slider"], [role="tab"], [role="radio"], [role="menuitem"], [role="option"]`;

/** True when the key belongs to where focus is: a field, a control, or (for arrows) the map, which pans. */
export function keyBelongsToFocus(e: KeyboardEvent, { controls = false, map = false } = {}): boolean {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return true;
  const el = e.target instanceof Element ? e.target : null;
  if (!el) return false;
  if (el.closest(controls ? CONTROLS : TYPING)) return true;
  return map && el.closest('.maplibregl-map') !== null;
}
