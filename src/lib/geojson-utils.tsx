import { Feature, GeoJSON } from "geojson";

type GeoJsonPrimaryFeatureTypes = "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon";

type GeoJsonFeatureCountStats = {
    numberOfFeatures: number;
    numberOfPoints: number;
    numberOfLines: number;
    numberOfPolygons: number;
    numberOfGeometryCollections: number;
}

export function filterGeojsonFeatures(geoJson: GeoJSON|undefined, type: GeoJsonPrimaryFeatureTypes[]|string[]|string): Feature[] {
    if (!geoJson || geoJson.type !== "FeatureCollection") {
        return [];
    }

    if(!Array.isArray(type)) {
        const p: GeoJsonPrimaryFeatureTypes[] = ["Point", "MultiPoint"];
        const l: GeoJsonPrimaryFeatureTypes[] = ["LineString", "MultiLineString"];
        const poly: GeoJsonPrimaryFeatureTypes[] = ["Polygon", "MultiPolygon"];

        if(p.includes(type as GeoJsonPrimaryFeatureTypes)) {
            type = p;
        } else if (l.includes(type as GeoJsonPrimaryFeatureTypes)) {
            type = l;
        } else if (poly.includes(type as GeoJsonPrimaryFeatureTypes)) {
            type = poly;
        }
    }

    return geoJson.features.filter(feature => (type as string[]).includes(feature.geometry.type));
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
