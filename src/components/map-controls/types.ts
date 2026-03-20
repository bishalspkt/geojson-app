import React from "react";
import { GeoJSON } from "geojson";

export type MapFocus = MapFeatureTypeAndId | GeolocationCoordinates;

export type MapFeatureTypeAndId = {
    type: GeoJsonPrimaryFetureTypes,
    idx: number,
}

export type UploadGeoJSONButtonProps = {
    geoJson: GeoJSON | undefined;
    setGeoJSON: React.Dispatch<React.SetStateAction<GeoJSON | undefined>>
    setMapFocus: React.Dispatch<React.SetStateAction<MapFocus | undefined>>
}

export type PasteGeoJSONFormProps = {
    setGeoJSON: (geoJSON: GeoJSON) => void;
}

export type MeasurePoint = {
    lng: number;
    lat: number;
}

export type MapTheme = "light" | "dark" | "white" | "grayscale" | "black";
export type MapProjection = "mercator" | "globe";

export type MapSettings = {
    theme: MapTheme;
    projection: MapProjection;
}

export type PanelType = "upload" | "layers" | "measure" | "create" | "animate";
export type PanelStatus = "maximized" | "hidden";

export type PanelProps = {
    type: PanelType;
    children: React.ReactNode;
    onToggle: (panel: PanelType) => void;
    className?: string;
}

export type GeoJsonPrimaryFetureTypes = "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";

export type LayersPanelProps = {
    togglePanel: (panel: PanelType) => void;
    geoJson: GeoJSON | undefined;
    setMapFocus: React.Dispatch<React.SetStateAction<MapFocus | undefined>>
    selectedFeature: MapFeatureTypeAndId | null;
    setSelectedFeature: React.Dispatch<React.SetStateAction<MapFeatureTypeAndId | null>>;
}
