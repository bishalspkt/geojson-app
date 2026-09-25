/**
 * Product analytics, kept off the critical path: PostHog loads once the map
 * has finished its first render, and events fired before then are queued. Nothing
 * loads unless a PostHog token is configured at build time, so local dev and
 * forks send nothing. Google Analytics loads only in the main app — never
 * inside embeds on third-party pages.
 *
 *   track('story_opened', { url })   // event names: <noun>_<verb>
 */

import { afterMapIdle } from './after-map-idle';

type Props = Record<string, unknown>;
interface Client {
  capture(event: string, props?: Props): void;
}

const POSTHOG_TOKEN: string | undefined = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST: string | undefined = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const GA_ID: string | undefined = import.meta.env.VITE_PUBLIC_GA_ID ?? (import.meta.env.PROD ? 'G-KVWM508D61' : undefined);

const MAX_QUEUE = 50;
let client: Client | null = null;
let queue: [string, Props | undefined][] = [];
let started = false;

export function track(event: string, props?: Props): void {
  if (client) client.capture(event, props);
  else if (POSTHOG_TOKEN && queue.length < MAX_QUEUE) queue.push([event, props]);
}


function loadGoogleAnalytics(id: string) {
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js reads the `arguments` object, not an array.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** Start analytics once the app has rendered. Idempotent. */
export function startAnalytics({ embed }: { embed: boolean }): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // After the first complete map render, so analytics never competes with it for bandwidth.
  afterMapIdle(() => {
    if (GA_ID && !embed) loadGoogleAnalytics(GA_ID);
    if (!POSTHOG_TOKEN) return;
    import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(POSTHOG_TOKEN, { api_host: POSTHOG_HOST, defaults: '2026-01-30' });
        client = posthog;
        for (const [event, props] of queue) posthog.capture(event, props);
        queue = [];
      })
      .catch(() => {
        queue = []; // blocked by an extension or offline — analytics is best-effort
      });
  });
}
