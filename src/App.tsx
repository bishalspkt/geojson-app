import './App.css'
import { Map } from './components/map/'
import { MapControls, UploadGeoJSONButton } from './components/map-controls'
import { useState } from 'react'

function App() {
  const [geoJSON, setGeoJSON] = useState<Record<string, unknown>|undefined>(undefined);

  return <>
    <Map uploadedGeoJSON={geoJSON}/>
    <MapControls />
    <UploadGeoJSONButton setGeoJSON={setGeoJSON as (geojson: any) => void}/>
  </>
}

export default App
