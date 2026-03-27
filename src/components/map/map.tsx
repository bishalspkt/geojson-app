import { useRef, useEffect, useState, ElementRef, useCallback } from 'react';
import maplibregl, { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { addBlueDot, addGeoJSONLayer, applyVisibilityFilters, getBoundingBox, initHighlightLayers, removeGeoJSONLayers, updateHighlight } from '../../lib/map-utils';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { GeoJSON } from 'geojson';
import { GeoJsonPrimaryFetureTypes, MapFocus, MapFeatureTypeAndId, MapSettings, MapTheme, MeasurePoint } from '../map-controls/types';
import { filterGeojsonFeatures } from '../../lib/geojson-utils';

/**
 * Post-process Protomaps base layers to improve boundary and label visibility.
 */
function customizeBaseLayers(baseLayers: LayerSpecification[], theme: MapTheme): LayerSpecification[] {
    const isDark = theme === "dark" || theme === "black";
    const boundaryColor = isDark ? "#9ca3af" : "#6b7280";
    const subBoundaryColor = isDark ? "#6b7280" : "#9ca3af";
    const cityColor = isDark ? "#d1d5db" : "#374151";
    const haloColor = isDark ? "#1f2937" : "#ffffff";
    const countryColor = isDark ? "#9ca3af" : "#4b5563";
    const regionColor = isDark ? "#6b7280" : "#6b7280";

    return baseLayers.map((layer) => {
        if (layer.id === "boundaries_country" && layer.type === "line") {
            return {
                ...layer,
                paint: {
                    ...layer.paint,
                    "line-color": boundaryColor,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 4, 1.5, 8, 2],
                    "line-opacity": 0.8,
                },
            };
        }

        if (layer.id === "boundaries" && layer.type === "line") {
            return {
                ...layer,
                paint: {
                    ...layer.paint,
                    "line-color": subBoundaryColor,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 6, 0.8, 10, 1.2],
                    "line-opacity": 0.6,
                },
            };
        }

        if (layer.id === "places_locality" && layer.type === "symbol") {
            return {
                ...layer,
                layout: {
                    ...layer.layout,
                    "text-size": ["interpolate", ["linear"], ["zoom"],
                        2, ["step", ["get", "population_rank"], 9, 12, 13],
                        4, ["step", ["get", "population_rank"], 10, 10, 15],
                        6, ["step", ["get", "population_rank"], 11, 8, 17],
                        8, ["step", ["get", "population_rank"], 12, 6, 19],
                        12, ["step", ["get", "population_rank"], 13, 4, 22],
                    ],
                },
                paint: { ...layer.paint, "text-color": cityColor, "text-halo-color": haloColor, "text-halo-width": 1.5 },
            };
        }

        if (layer.id === "places_country" && layer.type === "symbol") {
            return {
                ...layer,
                paint: { ...layer.paint, "text-color": countryColor, "text-halo-color": haloColor, "text-halo-width": 2 },
            };
        }

        if (layer.id === "places_region" && layer.type === "symbol") {
            return {
                ...layer,
                paint: { ...layer.paint, "text-color": regionColor, "text-halo-color": haloColor, "text-halo-width": 1.5 },
            };
        }

        return layer;
    });
}

function buildStyle(theme: MapTheme): StyleSpecification {
    const flavor = namedFlavor(theme);
    const baseLayers = customizeBaseLayers(
        layers("protomaps", flavor, { lang: "en" }) as LayerSpecification[],
        theme,
    );

    return {
        version: 8,
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
        sources: {
            "protomaps": {
                type: "vector",
                url: "https://tiles.geojson.app/20260308.json",
                attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
            }
        },
        layers: baseLayers,
    };
}

const MEASURE_SOURCE = 'measure-source';
const MEASURE_LINE_LAYER = 'measure-line-layer';
const MEASURE_POINTS_LAYER = 'measure-points-layer';

interface MapProps {
    geojson?: GeoJSON;
    mapFocus?: MapFocus;
    isMeasuring: boolean;
    measurePoints: MeasurePoint[];
    onMeasureClick: (point: MeasurePoint) => void;
    selectedFeature: MapFeatureTypeAndId | null;
    setSelectedFeature: React.Dispatch<React.SetStateAction<MapFeatureTypeAndId | null>>;
    settings: MapSettings;
    hiddenFeatures: Set<string>;
}

function updateMeasureLayers(mapInstance: maplibregl.Map, points: MeasurePoint[]) {
    const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
    };

    if (points.length > 0) {
        points.forEach((pt, i) => {
            geojsonData.features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
                properties: { index: i },
            });
        });

        if (points.length >= 2) {
            geojsonData.features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(p => [p.lng, p.lat]),
                },
                properties: {},
            });
        }
    }

    const source = mapInstance.getSource(MEASURE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
        source.setData(geojsonData);
    }
}

function addOverlayLayers(m: maplibregl.Map) {
    if (!m.getSource(MEASURE_SOURCE)) {
        m.addSource(MEASURE_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    if (!m.getLayer(MEASURE_LINE_LAYER)) {
        m.addLayer({
            id: MEASURE_LINE_LAYER,
            type: 'line',
            source: MEASURE_SOURCE,
            filter: ['==', '$type', 'LineString'],
            paint: { 'line-color': '#d97706', 'line-width': 2.5, 'line-dasharray': [3, 2] },
        });
    }
    if (!m.getLayer(MEASURE_POINTS_LAYER)) {
        m.addLayer({
            id: MEASURE_POINTS_LAYER,
            type: 'circle',
            source: MEASURE_SOURCE,
            filter: ['==', '$type', 'Point'],
            paint: { 'circle-radius': 5, 'circle-color': '#1e3a5f', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        });
    }
    initHighlightLayers(m);
}

export default function Map({ geojson, mapFocus, isMeasuring, measurePoints, onMeasureClick, selectedFeature, setSelectedFeature, settings, hiddenFeatures }: MapProps) {
    const mapContainer = useRef<ElementRef<"div">>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const prevThemeRef = useRef(settings.theme);
    const prevGeojsonRef = useRef<GeoJSON | undefined>(undefined);

    // Refs for current values so style.load callback always has fresh data
    const geojsonRef = useRef(geojson);
    geojsonRef.current = geojson;
    const measurePointsRef = useRef(measurePoints);
    measurePointsRef.current = measurePoints;
    const selectedFeatureRef = useRef(selectedFeature);
    selectedFeatureRef.current = selectedFeature;
    const projectionRef = useRef(settings.projection);
    projectionRef.current = settings.projection;
    const hiddenFeaturesRef = useRef(hiddenFeatures);
    hiddenFeaturesRef.current = hiddenFeatures;

    const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
        onMeasureClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    }, [onMeasureClick]);

    // Initialize MapLibre Map
    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: buildStyle(settings.theme),
            center: [105, -5],
            zoom: 2.8,
        });

        map.current.on('load', () => {
            if (!map.current) return;
            addOverlayLayers(map.current);
            setMapReady(true);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Handle theme changes — swap the entire style
    useEffect(() => {
        if (!map.current || !mapReady) return;
        if (settings.theme === prevThemeRef.current) return;
        prevThemeRef.current = settings.theme;

        const m = map.current;
        const center = m.getCenter();
        const zoom = m.getZoom();
        const bearing = m.getBearing();
        const pitch = m.getPitch();

        m.setStyle(buildStyle(settings.theme));

        m.once('style.load', () => {
            m.jumpTo({ center, zoom, bearing, pitch });
            m.setProjection({ type: projectionRef.current });
            addOverlayLayers(m);

            // Re-add geojson data if present (no fitBounds — purely visual re-add)
            if (geojsonRef.current) {
                addGeoJSONLayer(m, geojsonRef.current, 'uploaded-geojson');
                applyVisibilityFilters(m, 'uploaded-geojson', hiddenFeaturesRef.current);
            }

            // Re-apply measure points
            updateMeasureLayers(m, measurePointsRef.current);

            // Re-apply highlight
            updateHighlight(m, geojsonRef.current, selectedFeatureRef.current);
        });
    }, [settings.theme, mapReady]);

    // Handle projection changes
    useEffect(() => {
        if (!map.current || !mapReady) return;
        map.current.setProjection({ type: settings.projection });
    }, [settings.projection, mapReady]);

    // Toggle measure click handler
    useEffect(() => {
        if (!map.current) return;
        const m = map.current;

        if (isMeasuring) {
            m.getCanvas().style.cursor = 'crosshair';
            m.on('click', handleMapClick);
        } else {
            m.getCanvas().style.cursor = '';
            m.off('click', handleMapClick);
        }

        return () => {
            m.off('click', handleMapClick);
            m.getCanvas().style.cursor = '';
        };
    }, [isMeasuring, handleMapClick]);

    // Update measure visualization
    useEffect(() => {
        if (map.current && mapReady) {
            updateMeasureLayers(map.current, measurePoints);
        }
    }, [measurePoints, mapReady]);

    // Update uploaded GeoJson Layer
    useEffect(() => {
        if (!mapReady || !map.current) return;
        const m = map.current;
        if (!geojson) {
            removeGeoJSONLayers(m, 'uploaded-geojson');
            prevGeojsonRef.current = undefined;
            return;
        }
        const isNewData = geojson !== prevGeojsonRef.current;
        prevGeojsonRef.current = geojson;
        addGeoJSONLayer(m, geojson, 'uploaded-geojson');
        applyVisibilityFilters(m, 'uploaded-geojson', hiddenFeaturesRef.current);
        if (isNewData) {
            m.fitBounds(getBoundingBox(geojson), { padding: 100 });
        }
    }, [mapReady, geojson])

    // Handle hover + click on GeoJSON features
    useEffect(() => {
        if (!map.current || !mapReady || !geojson) return;
        const m = map.current;

        const GEOJSON_FEATURE_LAYERS: { layerId: string; source: string; type: GeoJsonPrimaryFetureTypes }[] = [
            { layerId: 'uploaded-geojson-polygons-layer', source: 'uploaded-geojson-polygons', type: 'Polygon' },
            { layerId: 'uploaded-geojson-lines-layer', source: 'uploaded-geojson-lines', type: 'LineString' },
            { layerId: 'uploaded-geojson-points-layer', source: 'uploaded-geojson-points', type: 'Point' },
        ];

        let hoveredSource: string | null = null;
        let hoveredId: string | number | null = null;

        const clearHover = () => {
            if (hoveredSource && hoveredId != null) {
                m.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: false });
            }
            hoveredSource = null;
            hoveredId = null;
        };

        const clickHandlers: [string, (e: maplibregl.MapLayerMouseEvent) => void][] = [];
        const enterHandlers: [string, (e: maplibregl.MapLayerMouseEvent) => void][] = [];
        const leaveHandlers: [string, () => void][] = [];

        for (const { layerId, source, type } of GEOJSON_FEATURE_LAYERS) {
            if (!m.getLayer(layerId)) continue;

            // Click handler
            const onClick = (e: maplibregl.MapLayerMouseEvent) => {
                if (isMeasuring) return;
                const feature = e.features?.[0];
                if (!feature || feature.properties?._featureIndex == null) return;
                const idx = feature.properties._featureIndex as number;
                setSelectedFeature(prev => {
                    if (prev?.type === type && prev?.idx === idx) return null;
                    return { type, idx };
                });
            };
            m.on('click', layerId, onClick);
            clickHandlers.push([layerId, onClick]);

            // Hover enter
            const onEnter = (e: maplibregl.MapLayerMouseEvent) => {
                if (isMeasuring) return;
                m.getCanvas().style.cursor = 'pointer';
                const feature = e.features?.[0];
                if (!feature || feature.id == null) return;
                clearHover();
                hoveredSource = source;
                hoveredId = feature.id;
                m.setFeatureState({ source, id: feature.id }, { hover: true });
            };
            m.on('mouseenter', layerId, onEnter);
            enterHandlers.push([layerId, onEnter]);

            // Hover leave
            const onLeave = () => {
                if (!isMeasuring) m.getCanvas().style.cursor = '';
                clearHover();
            };
            m.on('mouseleave', layerId, onLeave);
            leaveHandlers.push([layerId, onLeave]);
        }

        return () => {
            clearHover();
            for (const [id, fn] of clickHandlers) m.off('click', id, fn);
            for (const [id, fn] of enterHandlers) m.off('mouseenter', id, fn);
            for (const [id, fn] of leaveHandlers) m.off('mouseleave', id, fn);
        };
    }, [mapReady, geojson, isMeasuring, setSelectedFeature]);

    // Apply visibility filters when hidden features change
    useEffect(() => {
        if (!map.current || !mapReady) return;
        applyVisibilityFilters(map.current, 'uploaded-geojson', hiddenFeatures);
    }, [hiddenFeatures, mapReady]);

    // Update highlight when selected feature changes (skip if feature is hidden)
    useEffect(() => {
        if (map.current && mapReady) {
            const isHidden = selectedFeature && hiddenFeatures.has(`${selectedFeature.type}-${selectedFeature.idx}`);
            updateHighlight(map.current, geojson, isHidden ? null : selectedFeature);
        }
    }, [selectedFeature, mapReady, geojson, hiddenFeatures]);

    // Fly to focused feature
    useEffect(() => {
        if (map.current && mapFocus) {
            if ("idx" in mapFocus && "type" in mapFocus) {
                if (!geojson) return;
                const feature = filterGeojsonFeatures(geojson, mapFocus.type)[mapFocus.idx]
                if (feature) {
                    const bbox = getBoundingBox(feature);
                    map.current.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 5000 });
                }
            } else {
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
            <div
                ref={mapContainer}
                className="map"
                style={{ backgroundColor: settings.projection === "globe" ? "#0a0e1a" : undefined }}
            />
        </div>
    );
}
