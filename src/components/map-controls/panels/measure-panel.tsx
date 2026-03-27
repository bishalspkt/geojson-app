import { MapPin, RotateCcw, Ruler } from "lucide-react";
import Panel from "./panel";
import { PanelType, MeasurePoint } from "@/types";
import { distance } from "@turf/distance";
import { point } from "@turf/helpers";
import { useGeoJson, createGeoJsonActions } from "@/services";
import { useMemo } from "react";

interface MeasurePanelProps {
    togglePanel: (panel: PanelType) => void;
}

function formatDistance(km: number): string {
    if (km < 1) return `${(km * 1000).toFixed(0)} m`;
    if (km < 100) return `${km.toFixed(2)} km`;
    return `${km.toFixed(1)} km`;
}

function getSegmentDistances(points: MeasurePoint[]): number[] {
    const distances: number[] = [];
    for (let i = 1; i < points.length; i++) {
        const from = point([points[i - 1].lng, points[i - 1].lat]);
        const to = point([points[i].lng, points[i].lat]);
        distances.push(distance(from, to, { units: "kilometers" }));
    }
    return distances;
}

export default function MeasurePanel({ togglePanel }: MeasurePanelProps) {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const points = state.measurePoints;
    const isMeasuring = state.isMeasuring;
    const segments = getSegmentDistances(points);
    const totalDistance = segments.reduce((sum, d) => sum + d, 0);

    return (
        <Panel type="measure" onToggle={togglePanel}>
            <div className="p-3 flex flex-col gap-3">
                {points.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Ruler className="h-5 w-5 text-amber-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">Click the map to start measuring</p>
                        <p className="text-xs text-gray-400">Each click adds a point. Distances update live.</p>
                    </div>
                )}

                {points.length === 1 && (
                    <div className="flex items-center gap-2 px-1 py-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <p className="text-xs font-medium text-gray-500">Click another point to measure distance</p>
                    </div>
                )}

                {points.length >= 2 && (
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-extrabold text-gray-900 tabular-nums">{formatDistance(totalDistance)}</span>
                    </div>
                )}

                {segments.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                        {points.map((pt, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                                <div className="flex flex-col items-center">
                                    <div className={`h-5 w-5 rounded-lg flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${i === 0 ? 'bg-primary' : 'bg-amber-500'}`}>
                                        {i + 1}
                                    </div>
                                    {i < points.length - 1 && (
                                        <div className="w-px h-5 bg-gray-200" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between flex-1 min-w-0 py-1">
                                    <span className="text-xs text-gray-500 tabular-nums truncate">
                                        {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                                    </span>
                                    {i < segments.length && (
                                        <span className="text-xs font-bold text-amber-600 tabular-nums ml-2 shrink-0">
                                            {formatDistance(segments[i])}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {points.length > 0 && (
                    <div className="flex gap-2 pt-1 border-t border-white/30">
                        <button
                            onClick={() => actions.clearMeasurePoints()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-white/40 transition-colors duration-150 active:scale-95"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Clear
                        </button>
                        {isMeasuring && (
                            <p className="flex items-center gap-1.5 ml-auto text-[11px] text-gray-400">
                                <MapPin className="h-3 w-3" />
                                Click map to add points
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
}
