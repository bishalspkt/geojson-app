import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { useState } from 'react'
import { GeoJSON } from 'geojson';


function App() {
  const [geoJson, setGeoJson] = useState<GeoJSON|undefined>(undefined);

  return <>
    <MapLabel/>
    <Map geojson={geoJson}/>
    <MapControls geoJson={geoJson} setGeoJSON={setGeoJson} />
  </>
}

export default App
