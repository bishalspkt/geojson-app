import bbox from '@turf/bbox';
import { GeoJSON } from 'geojson';

export function addGeoJSONLayer(map: maplibregl.Map, geoJSON: GeoJSON, sourceName: string) {
    const layerName = `${sourceName}-layer`;
    // Check if source with the same name already exists
    if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
    }

    if(map.getSource(sourceName)) {
        map.removeSource(sourceName);
    }

    // Add a new source and layer
    map.addSource(sourceName, {
        type: 'geojson',
        data: geoJSON
    });

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresBoundingBox = bbox(geoJSON as any);
    map.fitBounds([[featuresBoundingBox[0], featuresBoundingBox[1]],[featuresBoundingBox[2], featuresBoundingBox[3]]], {
        padding: 100
    })
    
}
