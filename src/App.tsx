import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { GeoJsonProvider } from './services'
import { MapInstanceProvider } from './services/map'
import { ContextMenu, PropertiesDialog, registerBuiltinActions } from './context-menu'
import { EmbedProvider, useEmbed } from './services/embed-context'
import { EmbedGeoJsonLoader } from './components/embed/geojson-loader'
import SearchBar from './components/search/search-bar'

// Register built-in context menu actions once at app init
registerBuiltinActions();

function AppContent() {
  const embed = useEmbed();

  return (
    <GeoJsonProvider>
      <MapInstanceProvider>
        {!embed.enabled && <MapLabel />}
        {!embed.enabled && <SearchBar />}
        <Map />
        {(!embed.enabled || embed.controls) && <MapControls />}
        {(!embed.enabled || (embed.interactive)) && <ContextMenu />}
        <PropertiesDialog />
        {embed.enabled && <EmbedGeoJsonLoader />}
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
