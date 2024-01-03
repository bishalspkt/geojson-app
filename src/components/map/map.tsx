import { useRef, useEffect, useState, ElementRef } from 'react';
import maplibregl from 'maplibre-gl';
import bbox from '@turf/bbox';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';

interface MapProps {
    uploadedGeoJSON?: Record<string, unknown>; // Update the type of uploadedGeoJSON
}

function addUploadedGeoJSONLayer(map: maplibregl.Map, uploadedGeoJSON: Record<string, unknown>, sourceName = "uploaded-geojson") {
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
        data: uploadedGeoJSON
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

    const featuresBoundingBox = bbox(uploadedGeoJSON as any);
    map.fitBounds([[featuresBoundingBox[0], featuresBoundingBox[1]],[featuresBoundingBox[2], featuresBoundingBox[3]]], {
        padding: 100
    })
    
}

export default function Map({ uploadedGeoJSON }: MapProps) {
    const mapContainer = useRef<ElementRef<"div">>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [lng] = useState(0);
    const [lat] = useState(0);
    const [zoom] = useState(2);

    useEffect(() => {
        if (!map.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current!,
                style: `https://demotiles.maplibre.org/style.json`,
                center: [lng, lat],
                zoom: zoom
            });
        }

        map.current.on('load', () => {
            setMapReady(true);
        })

        if(mapReady && uploadedGeoJSON) {
            addUploadedGeoJSONLayer(map.current, uploadedGeoJSON);
        }

    }, [lng, lat, zoom, uploadedGeoJSON, mapReady]);




    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}