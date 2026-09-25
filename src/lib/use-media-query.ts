import { useSyncExternalStore } from 'react';

/** One stable subscribe function per query, so useSyncExternalStore doesn't resubscribe every render. */
const subscribers = new Map<string, (onChange: () => void) => () => void>();
function subscribeTo(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

/** Live `matchMedia` result. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phone layout: bottom tab bar and bottom-sheet panels (Tailwind's `sm` breakpoint). */
export const MOBILE_QUERY = '(max-width: 639px)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}
