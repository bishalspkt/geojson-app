import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { useState } from 'react'

function App() {
  const [geoJSON, setGeoJSON] = useState<Record<string, unknown>|undefined>(undefined);

  return <>
    <Map uploadedGeoJSON={geoJSON}/>
    <MapLabel/>
    <MapControls setGeoJSON={setGeoJSON} />
  </>
}

export default App
