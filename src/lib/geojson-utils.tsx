import { GeoJSON } from "geojson";

type GeoJsonFeatureCountStats = {
    numberOfFeatures: number;
    numberOfPoints: number;
    numberOfLines: number;
    numberOfPolygons: number;
}

export function getGeoJsonFeatureCountStats(geoJson: GeoJSON|undefined): GeoJsonFeatureCountStats {
    if (!geoJson || geoJson.type !== "FeatureCollection") {
        return {
            numberOfFeatures: 0,
            numberOfPoints: 0,
            numberOfLines: 0,
            numberOfPolygons: 0
        }
    }
    const numberOfFeatures = geoJson.features.length;
    const numberOfPoints = geoJson.features.reduce((acc, feature) => {
        if(feature.geometry.type === "Point") {
            return acc + 1;
        }
        return acc;
    }, 0);
    const numberOfLines = geoJson.features.reduce((acc, feature) => {
        if(feature.geometry.type === "LineString") {
            return acc + 1;
        }
        return acc;
    }, 0);
    const numberOfPolygons = geoJson.features.reduce((acc, feature) => {
        if(feature.geometry.type === "Polygon") {
            return acc + 1;
        }
        return acc;
    }, 0);

    return {
        numberOfFeatures,
        numberOfPoints,
        numberOfLines,
        numberOfPolygons
    }
}