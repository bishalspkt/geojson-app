import maplibregl from 'maplibre-gl';
import { bbox } from '@turf/bbox';
import { Feature } from 'geojson';
import { filterGeojsonFeatures } from './geojson-utils';
import { GeoJSON } from 'geojson';
import { resolvePointPaint, resolveLinePaint, resolvePolygonPaint, DEFAULTS, loadMarkerIcons } from '@/style';

const COLORS = {
    highlightFill:   DEFAULTS.highlight.fillColor,
    highlightStroke: DEFAULTS.highlight.strokeColor,
    highlightGlow:   DEFAULTS.highlight.glowColor,
};

export function getBoundingBox(geoJson: GeoJSON | Feature): [[number, number], [number, number]] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresBoundingBox = bbox(geoJson as any);
    return [[featuresBoundingBox[0], featuresBoundingBox[1]], [featuresBoundingBox[2], featuresBoundingBox[3]]];
}

export async function getCurrentPosition(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            (error) => reject(error),
        );
    });
}

export function addBlueDot(map: maplibregl.Map, coordinates: GeolocationCoordinates) {
    const sourceName = 'blue-dot';
    const layerName = 'blue-dot-layer';
    const glowLayerName = 'blue-dot-glow-layer';

    for (const l of [glowLayerName, layerName]) {
        if (map.getLayer(l)) map.removeLayer(l);
    }
    if (map.getSource(sourceName)) map.removeSource(sourceName);

    map.addSource(sourceName, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [coordinates.longitude, coordinates.latitude]
                }
            }]
        }
    });

    map.addLayer({
        id: glowLayerName,
        type: 'circle',
        source: sourceName,
        paint: {
            'circle-radius': 18,
            'circle-color': '#3b82f6',
            'circle-opacity': 0.15,
        }
    });

    map.addLayer({
        id: layerName,
        type: 'circle',
        source: sourceName,
        paint: {
            'circle-radius': 7,
            'circle-color': '#3b82f6',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2.5,
        }
    });
}

export function removeGeoJSONLayers(map: maplibregl.Map, sourceName: string) {
    for (const suffix of ['polygons', 'lines', 'points']) {
        const sub = `${sourceName}-${suffix}`;
        const layerIds = getLayerIds(sub);
        for (const id of Object.values(layerIds)) {
            removeLayerSafe(map, id);
        }
        removeSourceSafe(map, sub);
    }
}

export function addGeoJSONLayer(map: maplibregl.Map, geoJSON: GeoJSON, sourceName: string) {
    const pointFeatures = filterGeojsonFeatures(geoJSON, ["Point", "MultiPoint"]);
    const lineFeatures = filterGeojsonFeatures(geoJSON, ["LineString", "MultiLineString"]);
    const polygonFeatures = filterGeojsonFeatures(geoJSON, ["Polygon", "MultiPolygon"]);

    // Inject a stable _featureIndex into properties for highlight matching
    const addIndex = (features: Feature[]) =>
        features.map((f, i) => ({ ...f, properties: { ...f.properties, _featureIndex: i } }));

    updateGeoJsonLayer(map, `${sourceName}-polygons`, addIndex(polygonFeatures));
    updateGeoJsonLayer(map, `${sourceName}-lines`, addIndex(lineFeatures));
    updateGeoJsonLayer(map, `${sourceName}-points`, addIndex(pointFeatures));
}

function removeLayerSafe(map: maplibregl.Map, id: string) {
    if (map.getLayer(id)) map.removeLayer(id);
}
function removeSourceSafe(map: maplibregl.Map, id: string) {
    if (map.getSource(id)) map.removeSource(id);
}

function updateGeoJsonLayer(map: maplibregl.Map, sourceName: string, features: Feature[]) {
    const layerIds = getLayerIds(sourceName);

    for (const id of Object.values(layerIds)) {
        removeLayerSafe(map, id);
    }
    removeSourceSafe(map, sourceName);

    if (features.length === 0) return;

    const featureType = features[0].geometry.type;

    map.addSource(sourceName, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
        promoteId: '_featureIndex',
    });

    switch (featureType) {
        case "Point":
        case "MultiPoint": {
            const { mainPaint, glowPaint, symbolLayout, symbolPaint, hasSymbols } = resolvePointPaint(features);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.glow, type: 'circle', source: sourceName, paint: glowPaint as any });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.main, type: 'circle', source: sourceName, paint: mainPaint as any });

            if (hasSymbols && symbolLayout && symbolPaint) {
                // Load Maki icons then add the symbol layer
                loadMarkerIcons(map, features).then(() => {
                    if (!map.getSource(sourceName)) return; // source may have been removed
                    if (map.getLayer(layerIds.symbol)) return; // already added
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    map.addLayer({ id: layerIds.symbol, type: 'symbol', source: sourceName, layout: symbolLayout as any, paint: symbolPaint as any });
                });
            }
            break;
        }

        case "LineString":
        case "MultiLineString": {
            const { mainPaint, mainLayout, casingPaint, casingLayout } = resolveLinePaint(features);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.casing, type: 'line', source: sourceName, layout: casingLayout as any, paint: casingPaint as any });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.main, type: 'line', source: sourceName, layout: mainLayout as any, paint: mainPaint as any });
            break;
        }

        case "Polygon":
        case "MultiPolygon": {
            const { fillPaint, outlinePaint, outlineLayout } = resolvePolygonPaint(features);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.main, type: 'fill', source: sourceName, paint: fillPaint as any });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.addLayer({ id: layerIds.outline, type: 'line', source: sourceName, layout: outlineLayout as any, paint: outlinePaint as any });
            break;
        }

        default:
            console.warn("Unknown feature type", featureType);
    }
}

function getLayerIds(sourceName: string) {
    return {
        main: `${sourceName}-layer`,
        glow: `${sourceName}-glow`,
        casing: `${sourceName}-casing`,
        outline: `${sourceName}-outline`,
        symbol: `${sourceName}-symbol`,
    };
}

// -- Visibility filters --

export function applyVisibilityFilters(
    map: maplibregl.Map,
    sourceName: string,
    hiddenFeatures: Set<string>,
) {
    const typeLayerMap: [string, string[]][] = [
        ['Polygon', [`${sourceName}-polygons-layer`, `${sourceName}-polygons-outline`]],
        ['LineString', [`${sourceName}-lines-layer`, `${sourceName}-lines-casing`]],
        ['Point', [`${sourceName}-points-layer`, `${sourceName}-points-glow`, `${sourceName}-points-symbol`]],
    ];

    for (const [type, layerIds] of typeLayerMap) {
        const hiddenIndices: number[] = [];
        for (const key of hiddenFeatures) {
            const dashIdx = key.indexOf('-');
            const keyType = key.substring(0, dashIdx);
            const keyIdx = parseInt(key.substring(dashIdx + 1));
            if (keyType === type) hiddenIndices.push(keyIdx);
        }

        for (const layerId of layerIds) {
            if (!map.getLayer(layerId)) continue;
            if (hiddenIndices.length === 0) {
                map.setFilter(layerId, null);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map.setFilter(layerId, ['!', ['in', ['get', '_featureIndex'], ['literal', hiddenIndices]]] as any);
            }
        }
    }
}

// -- Highlight system --

const HIGHLIGHT_SOURCE = 'highlight-source';
export const HIGHLIGHT_LAYERS = {
    fillGlow:   'highlight-fill-glow',
    fill:       'highlight-fill',
    outline:    'highlight-outline',
    lineGlow:   'highlight-line-glow',
    line:       'highlight-line',
    circleGlow: 'highlight-circle-glow',
    circle:     'highlight-circle',
};

export function initHighlightLayers(map: maplibregl.Map) {
    if (map.getSource(HIGHLIGHT_SOURCE)) return;

    map.addSource(HIGHLIGHT_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
        id: HIGHLIGHT_LAYERS.fillGlow,
        type: 'fill',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'Polygon'],
        paint: {
            'fill-color': COLORS.highlightGlow,
            'fill-opacity': 0.25,
        }
    });
    map.addLayer({
        id: HIGHLIGHT_LAYERS.outline,
        type: 'line',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'Polygon'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': COLORS.highlightStroke,
            'line-width': 3,
        }
    });

    map.addLayer({
        id: HIGHLIGHT_LAYERS.lineGlow,
        type: 'line',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': COLORS.highlightGlow,
            'line-width': 8,
            'line-opacity': 0.4,
        }
    });
    map.addLayer({
        id: HIGHLIGHT_LAYERS.line,
        type: 'line',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': COLORS.highlightStroke,
            'line-width': 4,
        }
    });

    map.addLayer({
        id: HIGHLIGHT_LAYERS.circleGlow,
        type: 'circle',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'Point'],
        paint: {
            'circle-radius': 16,
            'circle-color': COLORS.highlightGlow,
            'circle-opacity': 0.3,
        }
    });
    map.addLayer({
        id: HIGHLIGHT_LAYERS.circle,
        type: 'circle',
        source: HIGHLIGHT_SOURCE,
        filter: ['==', '$type', 'Point'],
        paint: {
            'circle-radius': 7,
            'circle-color': COLORS.highlightFill,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2.5,
        }
    });
}

export function updateHighlight(
    map: maplibregl.Map,
    geoJson: GeoJSON | undefined,
    selected: { type: string; idx: number } | null,
) {
    const source = map.getSource(HIGHLIGHT_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!selected || !geoJson) {
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
    }

    const features = filterGeojsonFeatures(geoJson, selected.type);
    const feature = features[selected.idx];
    if (!feature) {
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
    }

    source.setData({
        type: 'FeatureCollection',
        features: [feature],
    });
}
