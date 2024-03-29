import { GeoJSON } from "geojson";

export type MapFocus = MapFeatureTypeAndId | GeolocationCoordinates;

export type MapFeatureTypeAndId = {
    type: GeoJsonPrimaryFetureTypes,
    idx: number,
}

export type UploadGeoJSONButtonProps = {
    geoJson: GeoJSON | undefined;
    setGeoJSON: React.Dispatch<React.SetStateAction<GeoJSON | undefined>> // Update the type of geoJSON
    setMapFocus: React.Dispatch<React.SetStateAction<MapFocus | undefined>> // Update the type of geoJSON
}

export type PasteGeoJSONFormProps = {
    setGeoJSON: (geoJSON: GeoJSON) => void;
}


export type PanelType = "upload" | "layers" | "create";
export type PanelStatus = "maximized" | "hidden";

export type PanelProps = {
    type: PanelType;
    children: JSX.Element | JSX.Element[];
    onToggle: (panel: PanelType) => void;
    className?: string;
}

export type GeoJsonPrimaryFetureTypes = "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";

export type LayersPanelProps = {
    togglePanel: (panel: PanelType) => void;
    geoJson: GeoJSON | undefined;
    setMapFocus: React.Dispatch<React.SetStateAction<MapFocus | undefined>> // Update the type of geoJSON

}
