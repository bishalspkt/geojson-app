import bbox from '@turf/bbox';
import { Feature } from 'geojson';
import { filterGeojsonFeatures } from './geojson-utils';

export function addGeoJSONLayer(map: maplibregl.Map, geoJSON: GeoJSON, sourceName: string) {

    const pointFeatures = filterGeojsonFeatures(geoJSON, "Point");
    // const lineFeatures = filterGeojsonFeatures(geoJSON, "LineString");
    const polygonFeatures = filterGeojsonFeatures(geoJSON, "Polygon");

    pointFeatures.length > 0 && updateGeoJsonLayer(map, `${sourceName}-points`, pointFeatures);
    polygonFeatures.length > 0 && updateGeoJsonLayer(map, `${sourceName}-polygons`, polygonFeatures);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresBoundingBox = bbox(geoJSON as any);
    map.fitBounds([[featuresBoundingBox[0], featuresBoundingBox[1]], [featuresBoundingBox[2], featuresBoundingBox[3]]], {
        padding: 100
    })

}


function updateGeoJsonLayer(map: maplibregl.Map, sourceName: string, features: Feature[]) {
    const layerName = `${sourceName}-layer`;

    const featureType = features[0].geometry.type;

    // Check if source with the same name already exists
    if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
    }

    if (map.getSource(sourceName)) {
        map.removeSource(sourceName);
    }

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
            map.loadImage('/map-assets/pin-marker.png', function(error, image) {
                if (error) throw error;
                map.addImage('pin', image!!);
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
        case "Polygon":
            map.addLayer({
                id: layerName,
                type: 'fill',
                source: sourceName,
                paint: {
                    'fill-color': '#555555',
                    'fill-outline-color': '#bbbbbb',
                    'fill-opacity': 0.8
                }
            });
            break;
        default:
            alert("Unknown feature type " + featureType)
    }
}