import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { GeoJsonProvider } from './services'
import { MapInstanceProvider } from './services/map'
import { ContextMenu, registerBuiltinActions } from './context-menu'
import { EmbedProvider, useEmbed } from './services/embed-context'
import PoweredBy from './components/embed/powered-by'
import { EmbedGeoJsonLoader } from './components/embed/geojson-loader'

// Register built-in context menu actions once at app init
registerBuiltinActions();

function AppContent() {
  const embed = useEmbed();

  return (
    <GeoJsonProvider>
      <MapInstanceProvider>
        {!embed.enabled && <MapLabel />}
        <Map />
        {(!embed.enabled || embed.controls) && <MapControls />}
        {!embed.enabled && <ContextMenu />}
        {embed.enabled && <EmbedGeoJsonLoader />}
        {embed.enabled && <PoweredBy />}
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
