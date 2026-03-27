import './App.css'
import { Map, MapLabel } from './components/map/'
import { MapControls } from './components/map-controls'
import { useCallback, useEffect, useState } from 'react'
import { GeoJSON } from 'geojson';
import { GeoJsonPrimaryFetureTypes, MapFocus, MapFeatureTypeAndId, MapSettings, MeasurePoint } from './components/map-controls/types';

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
  const [hiddenFeatures, setHiddenFeatures] = useState<Set<string>>(new Set());

  // Clear visibility state when GeoJSON data changes (new import or reset)
  useEffect(() => {
    setHiddenFeatures(new Set());
  }, [geoJson]);

  const handleToggleFeature = useCallback((type: GeoJsonPrimaryFetureTypes, idx: number) => {
    const key = `${type}-${idx}`;
    setHiddenFeatures(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSetFeatureVisibility = useCallback((keys: string[], visible: boolean) => {
    setHiddenFeatures(prev => {
      const next = new Set(prev);
      if (visible) {
        keys.forEach(k => next.delete(k));
      } else {
        keys.forEach(k => next.add(k));
      }
      return next;
    });
  }, []);

  const handleResetMap = useCallback(() => {
    setGeoJson(undefined);
    setHiddenFeatures(new Set());
    setSelectedFeature(null);
    setMapFocus(undefined);
  }, []);

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
      setSelectedFeature={setSelectedFeature}
      settings={mapSettings}
      hiddenFeatures={hiddenFeatures}
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
      hiddenFeatures={hiddenFeatures}
      onToggleFeature={handleToggleFeature}
      onSetFeatureVisibility={handleSetFeatureVisibility}
      onResetMap={handleResetMap}
    />
  </>
}

export default App
