import React from 'react';
import ReactDOM from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';
import App from '@/app/App';
import { registerBuiltinExtensions } from '@/extensions';
import { parseEmbedParams } from '@/integrations/embed/params';
import { useSettingsStore } from '@/state/settings-store';
import './index.css';

// Bootstrap order matters: parse the URL config and seed the settings store
// BEFORE the first render so the map initializes with the right theme.
const embedConfig = parseEmbedParams();
if (embedConfig.enabled) {
  useSettingsStore.getState().setSettings({
    theme: embedConfig.theme,
    projection: embedConfig.projection,
  });
}

registerBuiltinExtensions();

// Analytics only runs when a token is configured (production). Local dev and
// forks get a clean console; usePostHog() still works via the provider.
const posthogToken: string | undefined = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

const app = <App embedConfig={embedConfig} />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {posthogToken ? (
      <PostHogProvider apiKey={posthogToken} options={posthogOptions}>
        {app}
      </PostHogProvider>
    ) : (
      <PostHogProvider
        apiKey="dev-disabled"
        options={{ ...posthogOptions, opt_out_capturing_by_default: true, autocapture: false }}
      >
        {app}
      </PostHogProvider>
    )}
  </React.StrictMode>,
);
