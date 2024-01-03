import './App.css'
import { Map } from './components/map/'
import { MapControls, UploadGeoJSONButton } from './components/map-controls'
import { useState } from 'react'

function App() {
  const [geoJSON, setGeoJSON] = useState({});

  return <>
    <Map uploadedGeoJSON={geoJSON}/>
    <MapControls />
    <UploadGeoJSONButton setGeoJSON={setGeoJSON}/>
  </>
}

export default App
