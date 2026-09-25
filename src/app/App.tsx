import { lazy, Suspense, useEffect } from 'react';
import './app.css';
import Map from '@/features/map/Map';
import Brand from '@/features/map/Brand';
import HoverTooltip from '@/features/map/HoverTooltip';
import MapControls from '@/features/controls/MapControls';
import SearchBar from '@/features/search/SearchBar';
import ContextMenu from '@/features/context-menu/ContextMenu';
import Toaster from '@/features/toast/Toaster';
import { featureMedia } from '@/features/media/media';
import { ErrorBoundary } from '@/components/error-boundary';
import { setPanelWithPolicy } from '@/features/controls/panel-policy';
import { isDarkTheme } from '@/core/basemap/theme';
import { useStoryStore } from '@/state/story-store';
import { useTimeStore } from '@/state/time-store';
import { useCompareStore } from '@/state/compare-store';
import { useMapStore } from '@/state/map-store';
import { useUiStore } from '@/state/ui-store';
import { useSettingsStore } from '@/state/settings-store';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { EmbedProvider } from '@/integrations/embed/context';
import { useEmbed } from '@/integrations/embed/embed-context';
import type { EmbedConfig } from '@/integrations/embed/params';
import { loadFromUrlParams } from '@/integrations/url/loader';
import { startAnalytics } from '@/lib/analytics';
import { isMobileViewport } from '@/lib/use-media-query';

// Features most sessions never touch load on first use.
const Timeline = lazy(() => import('@/features/timeline/Timeline'));
const CompareOverlay = lazy(() => import('@/features/compare/CompareOverlay'));
const MediaCard = lazy(() => import('@/features/media/MediaCard'));
const PropertiesDialog = lazy(() => import('@/features/context-menu/PropertiesDialog'));

/** A lazily loaded widget: renders nothing while loading or if it fails. */
function Lazy({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ErrorBoundary name={name}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/** UI chrome follows the basemap: dark/midnight maps get dark panels. */
function useChromeTheme() {
  const dark = useSettingsStore((s) => isDarkTheme(s.theme));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1020' : '#e8edf5');
  }, [dark]);
}

function AppContent() {
  const embed = useEmbed();
  useChromeTheme();

  // Top bar (logo, search) is never shown in embeds — keeps the canvas clean.
  const showTopBar = !embed.enabled;
  // chrome=full shows the control bar; minimal/none hide it.
  const showControls = !embed.enabled || embed.chrome === 'full';
  // chrome=none drops the context menu and hover cards (pure map canvas).
  const showPointerUi = !embed.enabled || (embed.interactive && embed.chrome !== 'none');
  // The timeline is chrome: hosts without chrome drive time through the SDK.
  const timelineOn = useTimeStore((s) => s.enabled);
  const showTimeline = timelineOn && showControls;
  const compareActive = useCompareStore((s) => s.active);
  const mapReady = useMapStore((s) => s.ready);
  const showCompare = compareActive && mapReady;
  const showMedia = useLayersStore((s) => {
    const hit = s.selection ? findFeature(s.layers, s.selection.featureId) : null;
    return featureMedia(hit?.feature.properties as Record<string, unknown> | null) !== null;
  });
  const showProperties = useUiStore((s) => s.propertiesFeatureId !== null);

  // A story that starts loading opens its reader (when there's chrome to show it in).
  useEffect(
    () =>
      useStoryStore.subscribe(
        (s) => s.status,
        (status) => {
          if ((status === 'loading' || status === 'ready') && showControls) setPanelWithPolicy('story');
        },
      ),
    [showControls],
  );

  // One-shot startup: URL-loaded data, the embed bridge, the first panel, analytics.
  useEffect(() => {
    loadFromUrlParams(embed);
    if (!embed.storyUrl) {
      if (embed.enabled && embed.chrome === 'full') useUiStore.getState().setActivePanel('layers');
      else if (!embed.enabled && !embed.geojsonUrl && !isMobileViewport()) useUiStore.getState().setActivePanel('upload');
    }
    startAnalytics({ embed: embed.enabled });
    if (!embed.enabled) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('@/integrations/embed/bridge').then(({ startEmbedBridge }) => {
      if (!cancelled) stop = startEmbedBridge();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
    // The embed config is parsed once per page load and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Map />
      {showTopBar && <Brand />}
      {showTopBar && <SearchBar />}
      {showCompare && (
        <Lazy name="compare">
          <CompareOverlay />
        </Lazy>
      )}
      {showTimeline && (
        <Lazy name="timeline">
          <Timeline />
        </Lazy>
      )}
      {showMedia && (
        <Lazy name="media card">
          <MediaCard />
        </Lazy>
      )}
      {showProperties && (
        <Lazy name="properties">
          <PropertiesDialog />
        </Lazy>
      )}
      {showControls && <MapControls />}
      {showPointerUi && <HoverTooltip />}
      {showPointerUi && <ContextMenu />}
      <Toaster />
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
