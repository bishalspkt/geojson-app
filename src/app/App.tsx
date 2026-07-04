import { useEffect } from 'react';
import './app.css';
import Map from '@/features/map/Map';
import MapLabel from '@/features/map/MapLabel';
import MapControls from '@/features/controls/MapControls';
import SearchBar from '@/features/search/SearchBar';
import ContextMenu from '@/features/context-menu/ContextMenu';
import PropertiesDialog from '@/features/context-menu/PropertiesDialog';
import { EmbedProvider } from '@/integrations/embed/context';
import { useEmbed } from '@/integrations/embed/embed-context';
import { EmbedConfig } from '@/integrations/embed/params';
import { startEmbedBridge } from '@/integrations/embed/bridge';
import { loadFromUrlParams } from '@/integrations/url/loader';
import { useUiStore } from '@/state/ui-store';

function AppContent() {
  const embed = useEmbed();

  // Top bar (logo, search) is never shown in embed — keeps the canvas clean.
  const showTopBar = !embed.enabled;
  // chrome=full shows the control bar; minimal/none hide it.
  const showMapControls = !embed.enabled || embed.chrome === 'full';
  // chrome=none drops the context menu entirely (pure basemap canvas).
  const showContextMenu = !embed.enabled || (embed.interactive && embed.chrome !== 'none');

  // One-shot startup: URL-loaded data, the embed bridge, and the initial panel.
  useEffect(() => {
    loadFromUrlParams(embed);

    const isMobile = window.innerWidth < 640;
    if (embed.enabled && embed.chrome === 'full') {
      useUiStore.getState().setActivePanel('layers');
    } else if (!embed.enabled && !isMobile) {
      useUiStore.getState().setActivePanel('upload');
    }

    if (embed.enabled) {
      return startEmbedBridge();
    }
    // The embed config is parsed once per page load and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {showTopBar && <MapLabel />}
      {showTopBar && <SearchBar />}
      <Map />
      {showMapControls && <MapControls />}
      {showContextMenu && <ContextMenu />}
      <PropertiesDialog />
    </>
  );
}

export default function App({ embedConfig }: { embedConfig: EmbedConfig }) {
  return (
    <EmbedProvider config={embedConfig}>
      <AppContent />
    </EmbedProvider>
  );
}
