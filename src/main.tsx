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

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN} options={posthogOptions}>
      <App embedConfig={embedConfig} />
    </PostHogProvider>
  </React.StrictMode>,
);
