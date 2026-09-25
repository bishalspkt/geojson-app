import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { registerBuiltinExtensions } from '@/extensions';
import { parseEmbedParams } from '@/integrations/embed/params';
import { useSettingsStore } from '@/state/settings-store';
// Self-hosted variable fonts (only the unicode ranges a page uses are downloaded).
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import './index.css';

// Bootstrap order matters: parse the URL config and seed the settings store
// BEFORE the first render so the map initialises with the right theme.
const embedConfig = parseEmbedParams();
if (embedConfig.enabled) {
  useSettingsStore.getState().setSettings({
    theme: embedConfig.theme,
    projection: embedConfig.projection,
  });
}

registerBuiltinExtensions();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App embedConfig={embedConfig} />
  </React.StrictMode>,
);
