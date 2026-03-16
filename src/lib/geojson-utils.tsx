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
    const stats = { numberOfFeatures: geoJson.features.length, numberOfPoints: 0, numberOfLines: 0, numberOfPolygons: 0, numberOfGeometryCollections: 0 };

    for (const feature of geoJson.features) {
        switch (feature.geometry.type) {
            case "Point":
            case "MultiPoint":
                stats.numberOfPoints++;
                break;
            case "LineString":
            case "MultiLineString":
                stats.numberOfLines++;
                break;
            case "Polygon":
            case "MultiPolygon":
                stats.numberOfPolygons++;
                break;
            case "GeometryCollection":
                stats.numberOfGeometryCollections++;
                break;
        }
    }

    return stats;
}