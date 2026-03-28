import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import { FeatureCollection, Feature } from 'geojson';
import { FeatureId, IdentifiedFeature } from '@/types';
import { MapFocus, MeasurePoint, MapSettings } from '@/types';

export interface GeoJsonState {
  collection: FeatureCollection | null;
  features: IdentifiedFeature[];
  selectedFeatureId: FeatureId | null;
  hiddenFeatureIds: Set<FeatureId>;
  mapFocus: MapFocus | null;
  isMeasuring: boolean;
  measurePoints: MeasurePoint[];
  mapSettings: MapSettings;
  fileName: string | null;
}

export type GeoJsonAction =
  | { type: 'LOAD_GEOJSON'; payload: FeatureCollection }
  | { type: 'CLEAR_GEOJSON' }
  | { type: 'ADD_FEATURE'; payload: Feature }
  | { type: 'REMOVE_FEATURE'; payload: FeatureId }
  | { type: 'UPDATE_FEATURE_PROPERTIES'; payload: { id: FeatureId; properties: Record<string, unknown> } }
  | { type: 'UPDATE_FEATURE_GEOMETRY'; payload: { id: FeatureId; geometry: Feature['geometry'] } }
  | { type: 'SELECT_FEATURE'; payload: FeatureId | null }
  | { type: 'TOGGLE_FEATURE_VISIBILITY'; payload: FeatureId }
  | { type: 'SET_FEATURES_VISIBILITY'; payload: { ids: FeatureId[]; visible: boolean } }
  | { type: 'SET_MAP_FOCUS'; payload: MapFocus | null }
  | { type: 'SET_MEASURING'; payload: boolean }
  | { type: 'ADD_MEASURE_POINT'; payload: MeasurePoint }
  | { type: 'CLEAR_MEASURE_POINTS' }
  | { type: 'SET_MAP_SETTINGS'; payload: MapSettings }
  | { type: 'SET_FILE_NAME'; payload: string | null };

let nextId = 0;

function generateFeatureId(): FeatureId {
  return `f-${nextId++}`;
}

export function resetIdCounter() {
  nextId = 0;
}

function assignFeatureIds(fc: FeatureCollection): IdentifiedFeature[] {
  resetIdCounter();
  return fc.features.map((f) => {
    const id = generateFeatureId();
    return {
      ...f,
      id,
      properties: { ...f.properties, _fid: id },
    } as IdentifiedFeature;
  });
}

function assignSingleFeatureId(f: Feature): IdentifiedFeature {
  const id = generateFeatureId();
  return {
    ...f,
    id,
    properties: { ...f.properties, _fid: id },
  } as IdentifiedFeature;
}

function rebuildCollection(features: IdentifiedFeature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

const DEFAULT_SETTINGS: MapSettings = {
  theme: 'light',
  projection: 'mercator',
};

const initialState: GeoJsonState = {
  collection: null,
  features: [],
  selectedFeatureId: null,
  hiddenFeatureIds: new Set(),
  mapFocus: null,
  isMeasuring: false,
  measurePoints: [],
  mapSettings: DEFAULT_SETTINGS,
  fileName: null,
};

function geojsonReducer(state: GeoJsonState, action: GeoJsonAction): GeoJsonState {
  switch (action.type) {
    case 'LOAD_GEOJSON': {
      const features = assignFeatureIds(action.payload);
      return {
        ...state,
        collection: rebuildCollection(features),
        features,
        selectedFeatureId: null,
        hiddenFeatureIds: new Set(),
      };
    }
    case 'CLEAR_GEOJSON':
      return {
        ...state,
        collection: null,
        features: [],
        selectedFeatureId: null,
        hiddenFeatureIds: new Set(),
        mapFocus: null,
        fileName: null,
      };
    case 'ADD_FEATURE': {
      const newFeature = assignSingleFeatureId(action.payload);
      const features = [...state.features, newFeature];
      return { ...state, features, collection: rebuildCollection(features) };
    }
    case 'REMOVE_FEATURE': {
      const features = state.features.filter((f) => f.id !== action.payload);
      const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
      hiddenFeatureIds.delete(action.payload);
      return {
        ...state,
        features,
        collection: rebuildCollection(features),
        hiddenFeatureIds,
        selectedFeatureId:
          state.selectedFeatureId === action.payload ? null : state.selectedFeatureId,
      };
    }
    case 'UPDATE_FEATURE_PROPERTIES': {
      const features = state.features.map((f) =>
        f.id === action.payload.id
          ? { ...f, properties: { ...f.properties, ...action.payload.properties } }
          : f,
      );
      return { ...state, features, collection: rebuildCollection(features) };
    }
    case 'UPDATE_FEATURE_GEOMETRY': {
      const features = state.features.map((f) =>
        f.id === action.payload.id ? { ...f, geometry: action.payload.geometry } : f,
      );
      return { ...state, features, collection: rebuildCollection(features) };
    }
    case 'SELECT_FEATURE':
      return { ...state, selectedFeatureId: action.payload };
    case 'TOGGLE_FEATURE_VISIBILITY': {
      const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
      if (hiddenFeatureIds.has(action.payload)) {
        hiddenFeatureIds.delete(action.payload);
      } else {
        hiddenFeatureIds.add(action.payload);
      }
      return { ...state, hiddenFeatureIds };
    }
    case 'SET_FEATURES_VISIBILITY': {
      const hiddenFeatureIds = new Set(state.hiddenFeatureIds);
      if (action.payload.visible) {
        action.payload.ids.forEach((id) => hiddenFeatureIds.delete(id));
      } else {
        action.payload.ids.forEach((id) => hiddenFeatureIds.add(id));
      }
      return { ...state, hiddenFeatureIds };
    }
    case 'SET_MAP_FOCUS':
      return { ...state, mapFocus: action.payload };
    case 'SET_MEASURING':
      return {
        ...state,
        isMeasuring: action.payload,
        measurePoints: action.payload ? state.measurePoints : [],
      };
    case 'ADD_MEASURE_POINT':
      return { ...state, measurePoints: [...state.measurePoints, action.payload] };
    case 'CLEAR_MEASURE_POINTS':
      return { ...state, measurePoints: [] };
    case 'SET_MAP_SETTINGS':
      return { ...state, mapSettings: action.payload };
    case 'SET_FILE_NAME':
      return { ...state, fileName: action.payload };
    default:
      return state;
  }
}

const GeoJsonContext = createContext<{
  state: GeoJsonState;
  dispatch: Dispatch<GeoJsonAction>;
} | null>(null);

export function GeoJsonProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(geojsonReducer, initialState);
  return (
    <GeoJsonContext.Provider value={{ state, dispatch }}>
      {children}
    </GeoJsonContext.Provider>
  );
}

export function useGeoJson() {
  const ctx = useContext(GeoJsonContext);
  if (!ctx) throw new Error('useGeoJson must be used within GeoJsonProvider');
  return ctx;
}
