import { Feature, GeoJSON } from "geojson";
import { GeoJsonPrimaryFetureTypes } from "../components/map-controls/types";

type GeoJsonFeatureCountStats = {
    numberOfFeatures: number;
    numberOfPoints: number;
    numberOfLines: number;
    numberOfPolygons: number;
    numberOfGeometryCollections: number;
}

export function filterGeojsonFeatures(geoJson: GeoJSON|undefined, type: GeoJsonPrimaryFetureTypes[]|GeoJsonPrimaryFetureTypes): Feature[] {
    if (!geoJson || geoJson.type !== "FeatureCollection") {
        return [];
    }

    if(!Array.isArray(type)) {
        const p: GeoJsonPrimaryFetureTypes[] = ["Point", "MultiPoint"];
        const l: GeoJsonPrimaryFetureTypes[] = ["LineString", "MultiLineString"];
        const poly: GeoJsonPrimaryFetureTypes[] = ["Polygon", "MultiPolygon"];

        if(p.includes(type)) {
            type = p;
        } else if (l.includes(type)) {
            type = l;
        } else if (poly.includes(type)) {
            type = poly;
        }
    }

    return geoJson.features.filter(feature =>  type.includes(feature.geometry.type as GeoJsonPrimaryFetureTypes));
}

export function getGeoJsonFeatureCountStats(geoJson: GeoJSON|undefined): GeoJsonFeatureCountStats {
    if (!geoJson || geoJson.type !== "FeatureCollection") {
        return {
            numberOfFeatures: 0,
            numberOfPoints: 0,
            numberOfLines: 0,
            numberOfPolygons: 0,
            numberOfGeometryCollections: 0
        }
    }
    const numberOfFeatures = geoJson.features.length;
    const numberOfPoints = geoJson.features.reduce((acc, feature) => {
        if(["Point", "MultiPoint"].includes(feature.geometry.type)) {
            return acc + 1;
        }
        return acc;
    }, 0);
    const numberOfLines = geoJson.features.reduce((acc, feature) => {
        if(["LineString", "MultiLineString"].includes(feature.geometry.type)) {
            return acc + 1;
        }
        return acc;
    }, 0);
    const numberOfPolygons = geoJson.features.reduce((acc, feature) => {
        if(["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
            return acc + 1;
        }
        return acc;
    }, 0);

    const numberOfGeometryCollections = geoJson.features.reduce((acc, feature) => {
        if(feature.geometry.type === "GeometryCollection") {
            return acc + 1;
        }
        return acc;
    }, 0);

    return {
        numberOfFeatures,
        numberOfPoints,
        numberOfLines,
        numberOfPolygons,
        numberOfGeometryCollections
    }
}