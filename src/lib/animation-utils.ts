import maplibregl from 'maplibre-gl';
import { AnimationStyle } from './animation-presets';

// ── Route definitions ──────────────────────────────────────────────
export interface AnimatedRoute {
    from: [number, number]; // [lng, lat]
    to: [number, number];
    label: string;
    fromLabel: string;
    toLabel: string;
    color: string;
    subtitle: string;
    description: string;
}

// ── Great circle arc computation ───────────────────────────────────
function generateArcPoints(
    start: [number, number],
    end: [number, number],
    numPoints: number = 200
): [number, number][] {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const lat1 = toRad(start[1]);
    const lon1 = toRad(start[0]);
    const lat2 = toRad(end[1]);
    const lon2 = toRad(end[0]);

    const d =
        2 *
        Math.asin(
            Math.sqrt(
                Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
                    Math.cos(lat1) *
                        Math.cos(lat2) *
                        Math.pow(Math.sin((lon1 - lon2) / 2), 2)
            )
        );

    if (d < 1e-10) return [start, end];

    const points: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        const x =
            A * Math.cos(lat1) * Math.cos(lon1) +
            B * Math.cos(lat2) * Math.cos(lon2);
        const y =
            A * Math.cos(lat1) * Math.sin(lon1) +
            B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);

        points.push([
            toDeg(Math.atan2(y, x)),
            toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
        ]);
    }

    // Pin first and last points to exact input coordinates
    points[0] = [start[0], start[1]];
    points[points.length - 1] = [end[0], end[1]];

    // ── Unwrap longitudes across the antimeridian ──────────────────
    for (let i = 1; i < points.length; i++) {
        while (points[i][0] - points[i - 1][0] > 180) points[i][0] -= 360;
        while (points[i][0] - points[i - 1][0] < -180) points[i][0] += 360;
    }

    return points;
}

// ── Compute bounding box of all arc points ─────────────────────────
function arcBounds(
    points: [number, number][]
): [[number, number], [number, number]] {
    let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
    for (const [lng, lat] of points) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    return [
        [minLng, minLat],
        [maxLng, maxLat],
    ];
}

// ── Easing ─────────────────────────────────────────────────────────
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Layer/source names for the ACTIVE (animating) route ────────────
const PREFIX = "anim-active";
const SOURCES = {
    arc: `${PREFIX}-arc`,
    arcGlow: `${PREFIX}-arc-glow`,
    dot: `${PREFIX}-dot`,
    trail: `${PREFIX}-trail`,
    origin: `${PREFIX}-origin`,
    dest: `${PREFIX}-dest`,
};
const LAYERS = {
    arcGlow: `${PREFIX}-arc-glow-layer`,
    arc: `${PREFIX}-arc-layer`,
    trail: `${PREFIX}-trail-layer`,
    dotGlow: `${PREFIX}-dot-glow-layer`,
    dot: `${PREFIX}-dot-layer`,
    originPulse: `${PREFIX}-origin-pulse`,
    originCore: `${PREFIX}-origin-core`,
    destPulse: `${PREFIX}-dest-pulse`,
    destCore: `${PREFIX}-dest-core`,
};

// ── Persistent (completed) route layer tracking ────────────────────
const PERSIST_PREFIX = "anim-done";
let persistedIds: string[] = []; // all source/layer ids we've added

function persistSourceId(index: number, kind: string): string {
    return `${PERSIST_PREFIX}-${index}-${kind}`;
}

function persistRoute(
    map: maplibregl.Map,
    index: number,
    arcPoints: [number, number][],
    route: AnimatedRoute,
    style: AnimationStyle
) {
    const glowSrc = persistSourceId(index, "glow-src");
    const glowLyr = persistSourceId(index, "glow-lyr");
    const arcSrc = persistSourceId(index, "arc-src");
    const arcLyr = persistSourceId(index, "arc-lyr");
    const originSrc = persistSourceId(index, "origin-src");
    const originLyr = persistSourceId(index, "origin-lyr");
    const destSrc = persistSourceId(index, "dest-src");
    const destLyr = persistSourceId(index, "dest-lyr");

    const lineData: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: arcPoints },
    };

    // Glow
    map.addSource(glowSrc, { type: "geojson", data: lineData });
    map.addLayer({
        id: glowLyr,
        type: "line",
        source: glowSrc,
        paint: {
            "line-color": route.color,
            "line-width": style.glowWidth * 0.8,
            "line-opacity": style.glowEffect ? 0.1 : 0,
            "line-blur": 6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
    });

    // Arc
    map.addSource(arcSrc, { type: "geojson", data: lineData });
    map.addLayer({
        id: arcLyr,
        type: "line",
        source: arcSrc,
        paint: {
            "line-color": route.color,
            "line-width": style.lineWidth,
            "line-opacity": 0.65,
        },
        layout: { "line-cap": "round", "line-join": "round" },
    });

    // Origin dot
    map.addSource(originSrc, {
        type: "geojson",
        data: pt(route.from),
    });
    map.addLayer({
        id: originLyr,
        type: "circle",
        source: originSrc,
        paint: {
            "circle-radius": 4,
            "circle-color": route.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
        },
    });

    // Dest dot
    map.addSource(destSrc, {
        type: "geojson",
        data: pt(route.to),
    });
    map.addLayer({
        id: destLyr,
        type: "circle",
        source: destSrc,
        paint: {
            "circle-radius": 4,
            "circle-color": route.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
        },
    });

    persistedIds.push(glowSrc, glowLyr, arcSrc, arcLyr, originSrc, originLyr, destSrc, destLyr);
}

function removePersistedRoutes(map: maplibregl.Map) {
    // Remove in reverse order (layers before sources)
    for (const id of [...persistedIds].reverse()) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
    }
    persistedIds = [];
}

const DEFAULT_DRAW_DURATION = 4000;
const DEFAULT_HOLD_DURATION = 1500;
const FLY_DURATION = 2000;
const TRAIL_LENGTH = 30;
const ARC_POINTS = 250;
const DEFAULT_CAMERA_PITCH = 35;
const BEARING_DRIFT = 8;

let animationFrameId: number | null = null;
let currentRouteIndex = -1;

// ── Subtitle callback ──────────────────────────────────────────────
export type SubtitleInfo = {
    visible: boolean;
    fromLabel: string;
    toLabel: string;
    subtitle: string;
    description: string;
    color: string;
    progress: number;
    routeIndex: number;
    totalRoutes: number;
};

type SubtitleCallback = (info: SubtitleInfo) => void;

// ── Helpers ────────────────────────────────────────────────────────
function removeActiveLayers(map: maplibregl.Map) {
    for (const l of Object.values(LAYERS)) {
        if (map.getLayer(l)) map.removeLayer(l);
    }
    for (const s of Object.values(SOURCES)) {
        if (map.getSource(s)) map.removeSource(s);
    }
}

function emptyLine(): GeoJSON.Feature<GeoJSON.LineString> {
    return {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
    };
}

function pt(coord: [number, number]): GeoJSON.Feature<GeoJSON.Point> {
    return {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: coord },
    };
}

function emptyFC(): GeoJSON.FeatureCollection {
    return { type: "FeatureCollection", features: [] };
}

function makeDefaultStyle(): AnimationStyle {
    return {
        lineWidth: 2.5,
        glowWidth: 10,
        trailOpacity: 0.3,
        glowEffect: true,
        holdDuration: DEFAULT_HOLD_DURATION,
        cameraPitch: DEFAULT_CAMERA_PITCH,
        drawDuration: DEFAULT_DRAW_DURATION,
        persistTrails: false,
    };
}

// ── Setup layers for the actively animating route ──────────────────
function setupRoute(map: maplibregl.Map, route: AnimatedRoute, style: AnimationStyle) {
    removeActiveLayers(map);

    // Arc glow
    map.addSource(SOURCES.arcGlow, { type: "geojson", data: emptyLine() });
    map.addLayer({
        id: LAYERS.arcGlow,
        type: "line",
        source: SOURCES.arcGlow,
        paint: {
            "line-color": route.color,
            "line-width": style.glowWidth,
            "line-opacity": style.glowEffect ? 0.15 : 0,
            "line-blur": 6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
    });

    // Arc line
    map.addSource(SOURCES.arc, { type: "geojson", data: emptyLine() });
    map.addLayer({
        id: LAYERS.arc,
        type: "line",
        source: SOURCES.arc,
        paint: {
            "line-color": route.color,
            "line-width": style.lineWidth,
            "line-opacity": 0.85,
        },
        layout: { "line-cap": "round", "line-join": "round" },
    });

    // Trail
    map.addSource(SOURCES.trail, { type: "geojson", data: emptyLine() });
    map.addLayer({
        id: LAYERS.trail,
        type: "line",
        source: SOURCES.trail,
        paint: {
            "line-color": route.color,
            "line-width": style.lineWidth * 2.4,
            "line-opacity": style.trailOpacity,
            "line-blur": 3,
        },
        layout: { "line-cap": "round", "line-join": "round" },
    });

    // Moving dot — outer glow
    map.addSource(SOURCES.dot, { type: "geojson", data: pt(route.from) });
    map.addLayer({
        id: LAYERS.dotGlow,
        type: "circle",
        source: SOURCES.dot,
        paint: {
            "circle-radius": style.lineWidth > 3 ? 18 : 14,
            "circle-color": route.color,
            "circle-opacity": 0.2,
            "circle-blur": 0.6,
        },
    });
    // Moving dot — core
    map.addLayer({
        id: LAYERS.dot,
        type: "circle",
        source: SOURCES.dot,
        paint: {
            "circle-radius": style.lineWidth > 3 ? 6 : 5,
            "circle-color": "#ffffff",
            "circle-stroke-color": route.color,
            "circle-stroke-width": style.lineWidth > 3 ? 3 : 2.5,
        },
    });

    // Origin marker
    map.addSource(SOURCES.origin, { type: "geojson", data: pt(route.from) });
    map.addLayer({
        id: LAYERS.originPulse,
        type: "circle",
        source: SOURCES.origin,
        paint: {
            "circle-radius": 18,
            "circle-color": route.color,
            "circle-opacity": 0.12,
        },
    });
    map.addLayer({
        id: LAYERS.originCore,
        type: "circle",
        source: SOURCES.origin,
        paint: {
            "circle-radius": 6,
            "circle-color": route.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
        },
    });

    // Destination marker (hidden initially)
    map.addSource(SOURCES.dest, { type: "geojson", data: emptyFC() });
    map.addLayer({
        id: LAYERS.destPulse,
        type: "circle",
        source: SOURCES.dest,
        paint: {
            "circle-radius": 18,
            "circle-color": route.color,
            "circle-opacity": 0.12,
        },
    });
    map.addLayer({
        id: LAYERS.destCore,
        type: "circle",
        source: SOURCES.dest,
        paint: {
            "circle-radius": 6,
            "circle-color": route.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
        },
    });
}

// ── Public API ─────────────────────────────────────────────────────

export function clearAnimation(map: maplibregl.Map) {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    currentRouteIndex = -1;
    removeActiveLayers(map);
    removePersistedRoutes(map);
    map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
}

export function runDemoAnimation(
    map: maplibregl.Map,
    onSubtitle: SubtitleCallback,
    onComplete: () => void,
    routes: AnimatedRoute[],
    style?: AnimationStyle
): () => void {
    clearAnimation(map);
    currentRouteIndex = 0;
    animateRoute(map, routes, 0, onSubtitle, onComplete, style ?? makeDefaultStyle());
    return () => clearAnimation(map);
}

function animateRoute(
    map: maplibregl.Map,
    routes: AnimatedRoute[],
    index: number,
    onSubtitle: SubtitleCallback,
    onComplete: () => void,
    style: AnimationStyle
) {
    const drawDuration = style.drawDuration;
    const holdDuration = style.holdDuration;
    const cameraPitch = style.cameraPitch;

    if (index >= routes.length) {
        removeActiveLayers(map);
        map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
        onSubtitle({
            visible: false,
            fromLabel: "",
            toLabel: "",
            subtitle: "",
            description: "",
            color: "",
            progress: 1,
            routeIndex: routes.length,
            totalRoutes: routes.length,
        });
        onComplete();
        return;
    }

    const route = routes[index];
    currentRouteIndex = index;
    const arcPoints = generateArcPoints(route.from, route.to, ARC_POINTS);

    // ── Camera: fit the ENTIRE arc (not just endpoints) ─────────────
    const bounds = arcBounds(arcPoints);
    const startBearing = BEARING_DRIFT * (index % 2 === 0 ? -1 : 1);

    map.fitBounds(bounds, {
        padding: { top: 80, bottom: 120, left: 60, right: 200 },
        pitch: cameraPitch,
        bearing: startBearing,
        maxZoom: 5,
        duration: FLY_DURATION,
    });

    // Show subtitle during flyTo
    onSubtitle({
        visible: true,
        fromLabel: route.fromLabel,
        toLabel: route.toLabel,
        subtitle: route.subtitle,
        description: route.description,
        color: route.color,
        progress: 0,
        routeIndex: index,
        totalRoutes: routes.length,
    });

    const drawStart = performance.now() + FLY_DURATION;
    let layersSetup = false;

    function tick(now: number) {
        if (currentRouteIndex !== index) return;

        if (!layersSetup && now >= drawStart - 300) {
            setupRoute(map, route, style);
            layersSetup = true;
        }

        const elapsed = now - drawStart;

        if (elapsed < 0) {
            animationFrameId = requestAnimationFrame(tick);
            return;
        }

        const drawProgress = Math.min(elapsed / drawDuration, 1);
        const easedProgress = easeInOutCubic(drawProgress);

        // Subtle bearing drift
        const currentBearing =
            startBearing + BEARING_DRIFT * 2 * drawProgress * (index % 2 === 0 ? 1 : -1);
        map.setBearing(currentBearing);

        const pointIdx = Math.min(
            Math.floor(easedProgress * (arcPoints.length - 1)),
            arcPoints.length - 1
        );

        // Progressive arc reveal
        const visibleCoords = arcPoints.slice(0, pointIdx + 1);
        if (visibleCoords.length >= 2) {
            const lineData: GeoJSON.Feature<GeoJSON.LineString> = {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: visibleCoords },
            };
            (map.getSource(SOURCES.arc) as maplibregl.GeoJSONSource)?.setData(lineData);
            (map.getSource(SOURCES.arcGlow) as maplibregl.GeoJSONSource)?.setData(lineData);
        }

        // Trail
        const trailStart = Math.max(0, pointIdx - TRAIL_LENGTH);
        const trailCoords = arcPoints.slice(trailStart, pointIdx + 1);
        if (trailCoords.length >= 2) {
            (map.getSource(SOURCES.trail) as maplibregl.GeoJSONSource)?.setData({
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: trailCoords },
            });
        }

        // Moving dot
        (map.getSource(SOURCES.dot) as maplibregl.GeoJSONSource)?.setData(
            pt(arcPoints[pointIdx])
        );

        // Pulsing markers
        const pulse = 18 + 6 * Math.sin(now / 220);
        if (map.getLayer(LAYERS.originPulse)) {
            map.setPaintProperty(LAYERS.originPulse, "circle-radius", pulse);
        }

        // Destination when arc completes
        if (drawProgress >= 1) {
            (map.getSource(SOURCES.dest) as maplibregl.GeoJSONSource)?.setData({
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: {},
                        geometry: { type: "Point", coordinates: route.to },
                    },
                ],
            });
            if (map.getLayer(LAYERS.destPulse)) {
                map.setPaintProperty(LAYERS.destPulse, "circle-radius", pulse);
            }
        }

        // Subtitle progress
        onSubtitle({
            visible: true,
            fromLabel: route.fromLabel,
            toLabel: route.toLabel,
            subtitle: route.subtitle,
            description: route.description,
            color: route.color,
            progress: drawProgress,
            routeIndex: index,
            totalRoutes: routes.length,
        });

        // Next route
        if (elapsed >= drawDuration + holdDuration) {
            // Persist completed arc on the map before moving on
            if (style.persistTrails) {
                persistRoute(map, index, arcPoints, route, style);
            }
            animateRoute(map, routes, index + 1, onSubtitle, onComplete, style);
            return;
        }

        animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);
}
