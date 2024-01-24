import { useRef, useEffect, useState, ElementRef } from 'react';
import maplibregl, { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { addBlueDot, addGeoJSONLayer, getBoundingBox } from '../../lib/map-utils';
import layers from 'protomaps-themes-base';
import { GeoJSON } from 'geojson';
import { MapFocus } from '../map-controls/types';
import { filterGeojsonFeatures } from '../../lib/geojson-utils';

const mapLibreMapStyle: StyleSpecification = {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
        "protomaps-mvt": {
            type: "vector",
            tiles: ["https://tiles.geojson.app/20240107/{z}/{x}/{y}.mvt"],
            maxzoom: 15,
            attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
        }
    },
    //  one of light, dark, white, black, grayscale or debug.
    layers: layers("protomaps-mvt", "light")
}

interface MapProps {
    geojson?: GeoJSON; // Update the type of uploadedGeoJSON
    mapFocus?: MapFocus
}


export default function Map({ geojson, mapFocus }: MapProps) {
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
            center: [105, -5],
            zoom: 2.8
        });

        map.current.on('load', () => { setMapReady(true); });

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Update uploaded GeoJson Layer
    useEffect(() => {
        if (mapReady && geojson) {
            // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
            addGeoJSONLayer(map.current!!, geojson, 'uploaded-geojson');
        }
    }, [mapReady, geojson])

    useEffect(() => {
        if (map.current && mapFocus) {
            if ("idx" in mapFocus && "type" in mapFocus) {
                // Focus by MapFeatureTypeAndId
                if(!geojson) {
                    return;
                }
                const feature = filterGeojsonFeatures(geojson, mapFocus.type)[mapFocus.idx]
                if (feature) {
                    const bbox = getBoundingBox(feature);
                    map.current.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 5000 });
                }
            } else {
                // assume this is a GeolocationCoordinates
                map.current.flyTo({
                    center: [mapFocus.longitude, mapFocus.latitude],
                    zoom: 15,
                    maxDuration: 5000
                })

                addBlueDot(map.current, mapFocus);
            }


        }
    }, [mapFocus, geojson])

    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}