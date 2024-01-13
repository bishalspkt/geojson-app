import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { useState } from 'react'
import { GeoJSON } from 'geojson';
import { MapFocus } from './components/map-controls/types';



function App() {
  const [geoJson, setGeoJson] = useState<GeoJSON|undefined>(undefined);
  const [ mapFocus, setMapFocus ] = useState<MapFocus|undefined>(undefined);
  return <>
    <MapLabel/>
    <Map geojson={geoJson} mapFocus={mapFocus}/>
    <MapControls geoJson={geoJson} setGeoJSON={setGeoJson} setMapFocus={setMapFocus}/>
  </>
}

export default App
