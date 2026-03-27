import React, { createContext, useContext, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const MapInstanceContext = createContext<React.MutableRefObject<maplibregl.Map | null> | null>(null);

export function MapInstanceProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  return (
    <MapInstanceContext.Provider value={mapRef}>
      {children}
    </MapInstanceContext.Provider>
  );
}

export function useMapInstance(): React.MutableRefObject<maplibregl.Map | null> {
  const ctx = useContext(MapInstanceContext);
  if (!ctx) throw new Error('useMapInstance must be used within MapInstanceProvider');
  return ctx;
}
