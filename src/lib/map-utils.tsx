import bbox from '@turf/bbox';
import { Feature } from 'geojson';
import { filterGeojsonFeatures } from './geojson-utils';
import { GeoJSON } from 'geojson';

export function getBoundingBox(geoJson: GeoJSON): [[number, number], [number, number]] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresBoundingBox = bbox(geoJson as any);

    return [[featuresBoundingBox[0], featuresBoundingBox[1]], [featuresBoundingBox[2], featuresBoundingBox[3]]] 
}

export function addGeoJSONLayer(map: maplibregl.Map, geoJSON: GeoJSON, sourceName: string) {

    const pointFeatures = filterGeojsonFeatures(geoJSON, ["Point", "MultiPoint"]);
    const lineFeatures = filterGeojsonFeatures(geoJSON, ["LineString", "MultiLineString"]);
    const polygonFeatures = filterGeojsonFeatures(geoJSON, ["Polygon", "MultiPolygon"]);

    updateGeoJsonLayer(map, `${sourceName}-points`, pointFeatures);
    updateGeoJsonLayer(map, `${sourceName}-polygons`, polygonFeatures);
    updateGeoJsonLayer(map, `${sourceName}-lines`, lineFeatures);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresBoundingBox =getBoundingBox(geoJSON as any)
    map.fitBounds(featuresBoundingBox, {
        padding: 100
    })

}


function updateGeoJsonLayer(map: maplibregl.Map, sourceName: string, features: Feature[]) {
    const layerName = `${sourceName}-layer`;

    // Check if source with the same name already exists
    if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
    }

    if (map.getSource(sourceName)) {
        map.removeSource(sourceName);
    }

    if (features.length === 0) {
        return;
    }

    const featureType = features[0].geometry.type;

    // Add a new source and layer
    map.addSource(sourceName, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });

    switch (featureType) {
        case "Point":
        case "MultiPoint":
            map.loadImage('/map-assets/pin-marker.png', function(error, image) {
                if (error) throw error;
                if(!image) throw new Error("Image not loaded")
                map.addImage('pin', image);
                map.addLayer({
                    id: layerName,
                    type: 'symbol',
                    source: sourceName,
                    layout: {
                        'icon-image': 'pin',
                        'icon-offset': [0, -15], // Shift the pin 15px above
                    }
                });
            });
            break;
        case "LineString":
        case "MultiLineString":
            map.addLayer({
                id: layerName,
                type: 'line',
                source: sourceName,
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round',

                },
                paint: {
                    'line-color': '#5555bb',
                    'line-width': 4
                }
            });
            break;
        case "Polygon":
        case "MultiPolygon":
            map.addLayer({
                id: layerName,
                type: 'fill',
                source: sourceName,
                paint: {
                    'fill-color': '#927792',
                    'fill-outline-color': '#d27070',
                    'fill-opacity': 0.7,

                }
            });
            break;
        default:
            alert("Unknown feature type " + featureType)
    }
}