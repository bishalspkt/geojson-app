import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { GeoJsonProvider } from './services'
import { MapInstanceProvider } from './services/map'
import { ContextMenu, registerBuiltinActions } from './context-menu'

// Register built-in context menu actions once at app init
registerBuiltinActions();

function App() {
  return (
    <GeoJsonProvider>
      <MapInstanceProvider>
        <MapLabel />
        <Map />
        <MapControls />
        <ContextMenu />
      </MapInstanceProvider>
    </GeoJsonProvider>
  )
}

export default App
