import bbox from '@turf/bbox';

export function addGeoJSONLayer(map: maplibregl.Map, geoJSON: Record<string, unknown>, sourceName: string) {
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
            'fill-color': '#888888',
            'fill-outline-color': 'red',
            'fill-opacity': 0.4
        }
    });

    const featuresBoundingBox = bbox(geoJSON as any);
    map.fitBounds([[featuresBoundingBox[0], featuresBoundingBox[1]],[featuresBoundingBox[2], featuresBoundingBox[3]]], {
        padding: 100
    })
    
}
