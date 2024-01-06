import { useRef, useEffect, useState, ElementRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { addGeoJSONLayer } from '../../lib/map-utils';

interface MapProps {
    uploadedGeoJSON?: Record<string, unknown>; // Update the type of uploadedGeoJSON
}


export default function Map({ uploadedGeoJSON }: MapProps) {
    const mapContainer = useRef<ElementRef<"div">>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Initialize MapLibre Map
    useEffect(() => {
        if (map.current) {
            return
        }
        map.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: `https://demotiles.maplibre.org/style.json`,
            center: [0, 0],
            zoom: 2
        });

        map.current.on('load', () => {
            setMapReady(true);
        })
    }, []);

    // Update uploaded GeoJson Layer
    useEffect(() => {
        if(mapReady && uploadedGeoJSON) {
            addGeoJSONLayer(map.current!!, uploadedGeoJSON, 'uploaded-geojson');
        }
    }, [mapReady, uploadedGeoJSON])

    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}