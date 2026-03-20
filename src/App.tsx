import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { useCallback, useState } from 'react'
import { GeoJSON } from 'geojson';
import { MapFocus, MapFeatureTypeAndId, MapSettings, MeasurePoint } from './components/map-controls/types';

const DEFAULT_SETTINGS: MapSettings = {
  theme: "light",
  projection: "mercator",
};

function App() {
  const [geoJson, setGeoJson] = useState<GeoJSON | undefined>(undefined);
  const [mapFocus, setMapFocus] = useState<MapFocus | undefined>(undefined);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureTypeAndId | null>(null);
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_SETTINGS);

  const handleMeasureClick = useCallback((point: MeasurePoint) => {
    setMeasurePoints(prev => [...prev, point]);
  }, []);

  const handleClearMeasure = useCallback(() => {
    setMeasurePoints([]);
  }, []);

  const handleToggleMeasure = useCallback((active: boolean) => {
    setIsMeasuring(active);
    if (!active) {
      setMeasurePoints([]);
    }
  }, []);

  return <>
    <MapLabel settings={mapSettings} onSettingsChange={setMapSettings} />
    <Map
      geojson={geoJson}
      mapFocus={mapFocus}
      isMeasuring={isMeasuring}
      measurePoints={measurePoints}
      onMeasureClick={handleMeasureClick}
      selectedFeature={selectedFeature}
      settings={mapSettings}
    />
    <MapControls
      geoJson={geoJson}
      setGeoJSON={setGeoJson}
      setMapFocus={setMapFocus}
      measurePoints={measurePoints}
      onClearMeasure={handleClearMeasure}
      isMeasuring={isMeasuring}
      onToggleMeasure={handleToggleMeasure}
      selectedFeature={selectedFeature}
      setSelectedFeature={setSelectedFeature}
    />
  </>
}

export default App
