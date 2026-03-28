import { Dispatch } from 'react';
import { Feature, FeatureCollection } from 'geojson';
import { GeoJsonAction } from './geojson-store';
import { FeatureId, MapFocus, MeasurePoint, MapSettings } from '@/types';

export function createGeoJsonActions(dispatch: Dispatch<GeoJsonAction>) {
  return {
    loadGeoJson(fc: FeatureCollection) {
      dispatch({ type: 'LOAD_GEOJSON', payload: fc });
    },
    clearGeoJson() {
      dispatch({ type: 'CLEAR_GEOJSON' });
    },
    addFeature(feature: Feature) {
      dispatch({ type: 'ADD_FEATURE', payload: feature });
    },
    removeFeature(id: FeatureId) {
      dispatch({ type: 'REMOVE_FEATURE', payload: id });
    },
    updateFeatureProperties(id: FeatureId, properties: Record<string, unknown>) {
      dispatch({ type: 'UPDATE_FEATURE_PROPERTIES', payload: { id, properties } });
    },
    updateFeatureGeometry(id: FeatureId, geometry: Feature['geometry']) {
      dispatch({ type: 'UPDATE_FEATURE_GEOMETRY', payload: { id, geometry } });
    },
    selectFeature(id: FeatureId | null) {
      dispatch({ type: 'SELECT_FEATURE', payload: id });
    },
    toggleFeatureVisibility(id: FeatureId) {
      dispatch({ type: 'TOGGLE_FEATURE_VISIBILITY', payload: id });
    },
    setFeaturesVisibility(ids: FeatureId[], visible: boolean) {
      dispatch({ type: 'SET_FEATURES_VISIBILITY', payload: { ids, visible } });
    },
    setMapFocus(focus: MapFocus | null) {
      dispatch({ type: 'SET_MAP_FOCUS', payload: focus });
    },
    setMeasuring(active: boolean) {
      dispatch({ type: 'SET_MEASURING', payload: active });
    },
    addMeasurePoint(point: MeasurePoint) {
      dispatch({ type: 'ADD_MEASURE_POINT', payload: point });
    },
    clearMeasurePoints() {
      dispatch({ type: 'CLEAR_MEASURE_POINTS' });
    },
    setMapSettings(settings: MapSettings) {
      dispatch({ type: 'SET_MAP_SETTINGS', payload: settings });
    },
    setFileName(name: string | null) {
      dispatch({ type: 'SET_FILE_NAME', payload: name });
    },
  };
}

export type GeoJsonActions = ReturnType<typeof createGeoJsonActions>;
