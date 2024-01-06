import './App.css'
import { Map } from './components/map/'
import { MapControls } from './components/map-controls'
import { useState } from 'react'

function App() {
  const [geoJSON, setGeoJSON] = useState<Record<string, unknown>|undefined>(undefined);

  return <>
    <Map uploadedGeoJSON={geoJSON}/>
    <MapControls setGeoJSON={setGeoJSON as (geojson: Record<string, unknown>) => void} />
  </>
}

export default App
