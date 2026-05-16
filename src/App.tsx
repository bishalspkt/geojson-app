import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { GeoJsonProvider } from './services'
import { MapInstanceProvider } from './services/map'
import { ContextMenu, PropertiesDialog, registerBuiltinActions } from './context-menu'
import { EmbedProvider, useEmbed } from './services/embed-context'
import { EmbedGeoJsonLoader } from './components/embed/geojson-loader'
import { EmbedBridge } from './components/embed/embed-bridge'
import SearchBar from './components/search/search-bar'

// Register built-in context menu actions once at app init
registerBuiltinActions();

function AppContent() {
  const embed = useEmbed();
  // Top bar (logo, search) is never shown in embed — preserves legacy embed UX.
  const showTopBar = !embed.enabled;
  // chrome=full ↔ legacy controls=true (show MapControls panel)
  // chrome=minimal ↔ legacy controls=false (hide MapControls panel)
  // chrome=none → also drops the context menu so it's a pure basemap canvas
  const showMapControls = !embed.enabled || embed.chrome === 'full';
  const showContextMenu = !embed.enabled || (embed.interactive && embed.chrome !== 'none');

  return (
    <GeoJsonProvider>
      <MapInstanceProvider>
        {showTopBar && <MapLabel />}
        {showTopBar && <SearchBar />}
        <Map />
        {showMapControls && <MapControls />}
        {showContextMenu && <ContextMenu />}
        <PropertiesDialog />
        {embed.enabled && <EmbedGeoJsonLoader />}
        {embed.enabled && <EmbedBridge />}
      </MapInstanceProvider>
    </GeoJsonProvider>
  )
}

function App() {
  return (
    <EmbedProvider>
      <AppContent />
    </EmbedProvider>
  )
}

export default App
