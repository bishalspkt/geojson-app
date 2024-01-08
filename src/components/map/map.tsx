import { useRef, useEffect, useState, ElementRef } from 'react';
import maplibregl, { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { addGeoJSONLayer } from '../../lib/map-utils';
import layers from 'protomaps-themes-base';

const mapLibreMapStyle: StyleSpecification = {
    version: 8,
    glyphs:'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
        "protomaps-mvt": {
            type: "vector",
            tiles: ["https://tiles.geojson.app/20240107/{z}/{x}/{y}.mvt"],
            attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
        }
    },
    layers: layers("protomaps-mvt","light")
}

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
            style: mapLibreMapStyle,
            center: [0, 0],
            zoom: 2
        });

        map.current.on('load', () => { setMapReady(true); });

        return () => {
            map.current?.remove();
            map.current = null;
        }
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