import { useRef, useEffect, useState, ElementRef, useCallback, useMemo } from 'react';
import maplibregl, { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { addBlueDot, addGeoJSONLayer, applyVisibilityFilters, getBoundingBox, initHighlightLayers, removeGeoJSONLayers, updateHighlight } from '../../lib/map-utils';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { GeoJSON, FeatureCollection } from 'geojson';
import { useGeoJson, createGeoJsonActions } from '@/services';
import { useMapInstance } from '@/services/map';
import { categorizeGeometry, FeatureId } from '@/types';
import { MapTheme, MeasurePoint } from '@/types';
import { filterGeojsonFeatures } from '../../lib/geojson-utils';
import { usePostHog } from '@posthog/react';

// Generate a starfield SVG data URI for globe background
function generateStarfieldSvg(): string {
    const W = 1200, H = 1200, NUM = 350;
    let seed = 42;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    let circles = '';
    for (let i = 0; i < NUM; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const r = rand() * 1.1 + 0.3;
        const opacity = rand() * 0.5 + 0.2;
        circles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="white" opacity="${opacity.toFixed(2)}"/>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${circles}</svg>`)}")`;
}

const STARFIELD_BG = generateStarfieldSvg();

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

// Build a legacy-compatible GeoJSON FeatureCollection from identified features
function buildGeoJsonFromFeatures(features: import('@/types').IdentifiedFeature[]): GeoJSON | undefined {
    if (features.length === 0) return undefined;
    return {
        type: 'FeatureCollection',
        features: features,
    } as GeoJSON;
}

// Build legacy hidden features set (type-idx keys) from feature IDs
function buildLegacyHiddenSet(
    features: import('@/types').IdentifiedFeature[],
    hiddenIds: Set<FeatureId>,
): Set<string> {
    const result = new Set<string>();
    // Group features by category and track their index within that category
    const counters: Record<string, number> = {};
    for (const f of features) {
        const cat = categorizeGeometry(f.geometry.type);
        const baseType = cat === 'point' ? 'Point' : cat === 'line' ? 'LineString' : 'Polygon';
        const idx = counters[baseType] ?? 0;
        counters[baseType] = idx + 1;
        if (hiddenIds.has(f.id)) {
            result.add(`${baseType}-${idx}`);
        }
    }
    return result;
}

// Find a feature's legacy type+idx from its FeatureId
function findLegacySelection(
    features: import('@/types').IdentifiedFeature[],
    selectedId: FeatureId | null,
): { type: string; idx: number } | null {
    if (!selectedId) return null;
    const counters: Record<string, number> = {};
    for (const f of features) {
        const cat = categorizeGeometry(f.geometry.type);
        const baseType = cat === 'point' ? 'Point' : cat === 'line' ? 'LineString' : 'Polygon';
        const idx = counters[baseType] ?? 0;
        counters[baseType] = idx + 1;
        if (f.id === selectedId) {
            return { type: baseType, idx };
        }
    }
    return null;
}

export default function Map() {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const mapRef = useMapInstance();
    const posthog = usePostHog();
    const mapContainer = useRef<ElementRef<"div">>(null);
    const [mapReady, setMapReady] = useState(false);
    const prevThemeRef = useRef(state.mapSettings.theme);
    const prevCollectionRef = useRef<GeoJSON | undefined>(undefined);

    // Derive legacy-compatible values from the store
    const geojson = useMemo(() => buildGeoJsonFromFeatures(state.features), [state.features]);
    const hiddenFeatures = useMemo(
        () => buildLegacyHiddenSet(state.features, state.hiddenFeatureIds),
        [state.features, state.hiddenFeatureIds],
    );
    const selectedFeature = useMemo(
        () => findLegacySelection(state.features, state.selectedFeatureId),
        [state.features, state.selectedFeatureId],
    );

    // Refs for current values so style.load callback always has fresh data
    const geojsonRef = useRef(geojson);
    const measurePointsRef = useRef(state.measurePoints);
    const selectedFeatureRef = useRef(selectedFeature);
    const projectionRef = useRef(state.mapSettings.projection);
    const hiddenFeaturesRef = useRef(hiddenFeatures);
    useEffect(() => { geojsonRef.current = geojson; }, [geojson]);
    useEffect(() => { measurePointsRef.current = state.measurePoints; }, [state.measurePoints]);
    useEffect(() => { selectedFeatureRef.current = selectedFeature; }, [selectedFeature]);
    useEffect(() => { projectionRef.current = state.mapSettings.projection; }, [state.mapSettings.projection]);
    useEffect(() => { hiddenFeaturesRef.current = hiddenFeatures; }, [hiddenFeatures]);

    const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
        actions.addMeasurePoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    }, [actions]);

    // Initialize MapLibre Map
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: buildStyle(state.mapSettings.theme),
            center: [105, -5],
            zoom: 2.8,
        });

        mapRef.current.on('load', () => {
            if (!mapRef.current) return;
            addOverlayLayers(mapRef.current);
            setMapReady(true);
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        }
    }, []);

    // Handle theme changes
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        if (state.mapSettings.theme === prevThemeRef.current) return;
        prevThemeRef.current = state.mapSettings.theme;

        const m = mapRef.current;
        const center = m.getCenter();
        const zoom = m.getZoom();
        const bearing = m.getBearing();
        const pitch = m.getPitch();

        m.setStyle(buildStyle(state.mapSettings.theme));

        m.once('style.load', () => {
            m.jumpTo({ center, zoom, bearing, pitch });
            m.setProjection({ type: projectionRef.current });
            addOverlayLayers(m);

            if (geojsonRef.current) {
                addGeoJSONLayer(m, geojsonRef.current, 'uploaded-geojson');
                applyVisibilityFilters(m, 'uploaded-geojson', hiddenFeaturesRef.current);
            }

            updateMeasureLayers(m, measurePointsRef.current);
            updateHighlight(m, geojsonRef.current, selectedFeatureRef.current);
        });
    }, [state.mapSettings.theme, mapReady]);

    // Handle projection changes
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        mapRef.current.setProjection({ type: state.mapSettings.projection });
    }, [state.mapSettings.projection, mapReady]);

    // Toggle measure click handler
    useEffect(() => {
        if (!mapRef.current) return;
        const m = mapRef.current;

        if (state.isMeasuring) {
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
    }, [state.isMeasuring, handleMapClick]);

    // Update measure visualization
    useEffect(() => {
        if (mapRef.current && mapReady) {
            updateMeasureLayers(mapRef.current, state.measurePoints);
        }
    }, [state.measurePoints, mapReady]);

    // Update uploaded GeoJson Layer
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        const m = mapRef.current;
        if (!geojson) {
            removeGeoJSONLayers(m, 'uploaded-geojson');
            prevCollectionRef.current = undefined;
            return;
        }
        const isNewData = geojson !== prevCollectionRef.current;
        prevCollectionRef.current = geojson;
        addGeoJSONLayer(m, geojson, 'uploaded-geojson');
        applyVisibilityFilters(m, 'uploaded-geojson', hiddenFeaturesRef.current);
        if (isNewData) {
            m.fitBounds(getBoundingBox(geojson), { padding: 100 });
        }
    }, [mapReady, geojson])

    // Handle hover + click on GeoJSON features
    useEffect(() => {
        if (!mapRef.current || !mapReady || !geojson) return;
        const m = mapRef.current;

        const GEOJSON_FEATURE_LAYERS: { layerId: string; source: string; type: string }[] = [
            { layerId: 'uploaded-geojson-polygons-layer', source: 'uploaded-geojson-polygons', type: 'Polygon' },
            { layerId: 'uploaded-geojson-lines-layer', source: 'uploaded-geojson-lines', type: 'LineString' },
            { layerId: 'uploaded-geojson-points-layer', source: 'uploaded-geojson-points', type: 'Point' },
            { layerId: 'uploaded-geojson-points-symbol', source: 'uploaded-geojson-points', type: 'Point' },
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

            const onClick = (e: maplibregl.MapLayerMouseEvent) => {
                if (state.isMeasuring) return;
                const feature = e.features?.[0];
                if (!feature || feature.properties?._featureIndex == null) return;
                const idx = feature.properties._featureIndex as number;

                // Find the feature ID from the store
                const fid = feature.properties?._fid as string | undefined;
                if (fid) {
                    const currentSelected = state.selectedFeatureId;
                    actions.selectFeature(currentSelected === fid ? null : fid);
                } else {
                    // Fallback: use legacy type+idx to find the feature
                    const cat = categorizeGeometry(type);
                    const matchingFeatures = state.features.filter(
                        (f) => categorizeGeometry(f.geometry.type) === cat,
                    );
                    const matched = matchingFeatures[idx];
                    if (matched) {
                        const currentSelected = state.selectedFeatureId;
                        actions.selectFeature(currentSelected === matched.id ? null : matched.id);
                    }
                }
            };
            m.on('click', layerId, onClick);
            clickHandlers.push([layerId, onClick]);

            const onEnter = (e: maplibregl.MapLayerMouseEvent) => {
                if (state.isMeasuring) return;
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

            const onLeave = () => {
                if (!state.isMeasuring) m.getCanvas().style.cursor = '';
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
    }, [mapReady, geojson, state.isMeasuring, state.features, state.selectedFeatureId, actions]);

    // Right-click context menu (works with or without features)
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        const m = mapRef.current;

        const CONTEXT_LAYERS = [
            'uploaded-geojson-polygons-layer',
            'uploaded-geojson-lines-layer',
            'uploaded-geojson-points-layer',
            'uploaded-geojson-points-symbol',
        ];

        const onContextMenu = (e: maplibregl.MapMouseEvent) => {
            if (state.isMeasuring) return;

            // Try to find a feature at the click point
            const activeLayers = CONTEXT_LAYERS.filter(l => m.getLayer(l));
            const features = activeLayers.length > 0
                ? m.queryRenderedFeatures(e.point, { layers: activeLayers })
                : [];
            let storeFeature: import('@/types').IdentifiedFeature | null = null;
            if (features.length > 0) {
                const fid = features[0].properties?._fid as string | undefined;
                if (fid) {
                    storeFeature = state.features.find((f) => f.id === fid) ?? null;
                }
            }

            e.preventDefault();

            const event = new CustomEvent('geojson-context-menu', {
                detail: {
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                    context: {
                        feature: storeFeature,
                        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
                        mapInstance: m,
                        actions,
                    },
                },
            });
            window.dispatchEvent(event);
        };

        m.on('contextmenu', onContextMenu);
        return () => { m.off('contextmenu', onContextMenu); };
    }, [mapReady, state.isMeasuring, state.features, actions]);

    // Apply visibility filters when hidden features change
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        applyVisibilityFilters(mapRef.current, 'uploaded-geojson', hiddenFeatures);
    }, [hiddenFeatures, mapReady]);

    // Update highlight when selected feature changes
    useEffect(() => {
        if (mapRef.current && mapReady) {
            const isHidden = state.selectedFeatureId && state.hiddenFeatureIds.has(state.selectedFeatureId);
            updateHighlight(mapRef.current, geojson, isHidden ? null : selectedFeature);
        }
    }, [selectedFeature, mapReady, geojson, state.hiddenFeatureIds, state.selectedFeatureId]);

    // Fly to focused feature
    useEffect(() => {
        if (mapRef.current && state.mapFocus) {
            const focus = state.mapFocus;
            if ("featureId" in focus) {
                // New-style focus by feature ID
                const feature = state.features.find((f) => f.id === focus.featureId);
                if (feature) {
                    const bbox = getBoundingBox(feature);
                    mapRef.current.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 5000 });
                }
            } else if ("idx" in focus && "type" in focus) {
                // Legacy-style focus by type+idx
                if (!geojson) return;
                const feature = filterGeojsonFeatures(geojson, focus.type)[focus.idx];
                if (feature) {
                    const bbox = getBoundingBox(feature);
                    mapRef.current.fitBounds(bbox, { padding: 60, maxZoom: 15, maxDuration: 5000 });
                }
            } else if ("longitude" in focus) {
                mapRef.current.flyTo({
                    center: [focus.longitude, focus.latitude],
                    zoom: 15,
                    maxDuration: 5000
                });
                addBlueDot(mapRef.current, focus);
            }
        }
    }, [state.mapFocus, geojson, state.features])

    // Starfield parallax: shift background-position based on map center
    const starfieldRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        const m = mapRef.current;
        const onMove = () => {
            if (!starfieldRef.current) return;
            const center = m.getCenter();
            const bearing = m.getBearing();
            const offsetX = center.lng * 1.5 + bearing * 0.5;
            const offsetY = -center.lat * 1.5;
            starfieldRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        };
        m.on('move', onMove);
        return () => { m.off('move', onMove); };
    }, [mapReady]);

    // Drag-and-drop GeoJSON files
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current++;
        if (dragCounterRef.current === 1) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'json' && ext !== 'geojson') return;
        if (file.size > 25 * 1024 * 1024) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            if (typeof text !== 'string') return;
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = JSON.parse(text) as any;
                let fc: FeatureCollection | null = null;
                if (data.type === 'FeatureCollection') {
                    fc = data as FeatureCollection;
                } else if (data.type === 'Feature') {
                    fc = { type: 'FeatureCollection', features: [data] } as FeatureCollection;
                }
                if (fc) {
                    actions.loadGeoJson(fc);
                    actions.setFileName(file.name);
                    const center = mapRef.current?.getCenter();
                    posthog.capture('geojson_uploaded', {
                        source: 'drag_and_drop',
                        file_name: file.name,
                        file_size_bytes: file.size,
                        feature_count: fc.features?.length ?? 0,
                        map_center_lat: center?.lat ?? null,
                        map_center_lng: center?.lng ?? null,
                    });
                }
            } catch { /* ignore invalid JSON */ }
        };
        reader.readAsText(file);
    }, [actions, posthog, mapRef]);

    const isGlobe = state.mapSettings.projection === 'globe';

    return (
        <div
            className="map-wrap"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isGlobe && (
                <div
                    ref={starfieldRef}
                    className="starfield"
                    style={{ backgroundImage: STARFIELD_BG, backgroundColor: '#0a0e1a' }}
                />
            )}
            <div
                ref={mapContainer}
                className="map"
                style={{ backgroundColor: isGlobe ? 'transparent' : undefined }}
            />
            {isDragging && (
                <div className="drop-overlay">
                    <div className="drop-overlay-inner">Drop GeoJSON file to load</div>
                </div>
            )}
        </div>
    );
}
