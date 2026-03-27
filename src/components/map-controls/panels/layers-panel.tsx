import { Button } from "../../ui/button";
import Panel from "./panel";
import { GeoJsonPrimaryFetureTypes, LayersPanelProps, MapFeatureTypeAndId } from "../types";
import { filterGeojsonFeatures, getGeoJsonFeatureCountStats } from "../../../lib/geojson-utils";
import { Eye, EyeOff, MapPin, RotateCcw, Shapes, Waypoints } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { length } from "@turf/length";
import { area } from "@turf/area";

function formatNumber(value: number): string {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    if (value >= 10) return value.toFixed(0);
    if (value >= 0.01) return value.toFixed(2);
    return value.toFixed(4);
}

function featureKey(type: GeoJsonPrimaryFetureTypes, idx: number): string {
    return `${type}-${idx}`;
}


export default function LayersPanel({
    togglePanel, geoJson, setMapFocus, selectedFeature, setSelectedFeature,
    hiddenFeatures, onToggleFeature, onSetFeatureVisibility, onResetMap,
}: LayersPanelProps) {
    const [filterByLayer, setFilterByLayer] = useState<GeoJsonPrimaryFetureTypes>("Polygon");
    const geoJsonStats = useMemo(() => getGeoJsonFeatureCountStats(geoJson), [geoJson]);
    const polygons = useMemo(() => filterGeojsonFeatures(geoJson, ["Polygon", "MultiPolygon"]), [geoJson]);
    const points = useMemo(() => filterGeojsonFeatures(geoJson, ["Point", "MultiPoint"]), [geoJson]);
    const lines = useMemo(() => filterGeojsonFeatures(geoJson, ["LineString", "MultiLineString"]), [geoJson]);

    // Auto-switch tab when a feature is selected (e.g. from map click)
    useEffect(() => {
        if (selectedFeature) {
            const primaryType = selectedFeature.type.replace('Multi', '') as GeoJsonPrimaryFetureTypes;
            if (primaryType !== filterByLayer) {
                setFilterByLayer(primaryType);
            }
        }
    }, [selectedFeature]);

    const filterTabs: { type: GeoJsonPrimaryFetureTypes; icon: React.ReactNode; count: number }[] = [
        { type: "Point", icon: <MapPin className="h-3.5 w-3.5" />, count: geoJsonStats.numberOfPoints },
        { type: "LineString", icon: <Waypoints className="h-3.5 w-3.5" />, count: geoJsonStats.numberOfLines },
        { type: "Polygon", icon: <Shapes className="h-3.5 w-3.5" />, count: geoJsonStats.numberOfPolygons },
    ];

    const currentFeatures = useMemo(() => {
        switch (filterByLayer) {
            case "Point": return points;
            case "LineString": return lines;
            case "Polygon": return polygons;
            default: return [];
        }
    }, [filterByLayer, points, lines, polygons]);

    const currentKeys = useMemo(
        () => currentFeatures.map((_, idx) => featureKey(filterByLayer, idx)),
        [currentFeatures, filterByLayer],
    );

    const allCurrentVisible = useMemo(
        () => currentKeys.length > 0 && currentKeys.every(k => !hiddenFeatures.has(k)),
        [currentKeys, hiddenFeatures],
    );

    const allCurrentHidden = useMemo(
        () => currentKeys.length > 0 && currentKeys.every(k => hiddenFeatures.has(k)),
        [currentKeys, hiddenFeatures],
    );

    const handleShowAll = useCallback(() => {
        onSetFeatureVisibility(currentKeys, true);
    }, [currentKeys, onSetFeatureVisibility]);

    const handleHideAll = useCallback(() => {
        onSetFeatureVisibility(currentKeys, false);
    }, [currentKeys, onSetFeatureVisibility]);

    const isSelected = (type: GeoJsonPrimaryFetureTypes, idx: number) =>
        selectedFeature?.type === type && selectedFeature?.idx === idx;

    const isHidden = (type: GeoJsonPrimaryFetureTypes, idx: number) =>
        hiddenFeatures.has(featureKey(type, idx));

    const handleFeatureClick = (type: GeoJsonPrimaryFetureTypes, idx: number) => {
        const sel: MapFeatureTypeAndId = { type, idx };
        if (isSelected(type, idx)) {
            setSelectedFeature(null);
        } else {
            setSelectedFeature(sel);
            if (!isHidden(type, idx)) {
                setMapFocus(sel);
            }
        }
    };

    const handleVisibilityClick = (e: React.MouseEvent, type: GeoJsonPrimaryFetureTypes, idx: number) => {
        e.stopPropagation();
        onToggleFeature(type, idx);
    };

    const featureRow = (
        type: GeoJsonPrimaryFetureTypes,
        idx: number,
        icon: React.ReactNode,
        name: string,
        subtitle?: string,
    ) => {
        const active = isSelected(type, idx);
        const hidden = isHidden(type, idx);
        return (
            <li key={idx}>
                <div
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] ${
                        active
                            ? "bg-orange-50 ring-1 ring-orange-300"
                            : "hover:bg-white/40"
                    } ${hidden ? "opacity-40" : ""}`}
                    onClick={() => handleFeatureClick(type, idx)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFeatureClick(type, idx); } }}
                >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-orange-100" : "bg-violet-50"}`}>
                        {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${active ? "text-orange-800" : "text-gray-900"}`}>
                            {name}
                        </p>
                        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
                    </div>
                    <button
                        className={`shrink-0 p-1 rounded-lg transition-colors duration-150 ${
                            hidden
                                ? "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={(e) => handleVisibilityClick(e, type, idx)}
                        aria-label={hidden ? "Show feature" : "Hide feature"}
                    >
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </li>
        );
    };

    return (
        <Panel type="layers" onToggle={togglePanel}>
            <>
                {(!geoJson) &&
                    <div className="p-3">
                        <p className="text-sm font-bold text-gray-900">No layers added</p>
                        <p className="text-gray-500 text-xs mt-0.5">Import GeoJSON to see layers here</p>
                        <div className="pt-3">
                            <Button className="rounded-xl text-xs font-bold h-8" onClick={() => togglePanel("upload")}>Import GeoJSON</Button>
                        </div>
                    </div>
                }
                {geoJson &&
                    <div className="pb-12">
                        <div className="sticky bottom-0 flex gap-1 p-1.5 border-t border-white/30 bg-white/50 backdrop-blur-xl">
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.type}
                                    onClick={() => setFilterByLayer(tab.type)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                                        filterByLayer === tab.type
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-gray-500 hover:bg-white/40"
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.count > 0 && <span>{tab.count}</span>}
                                </button>
                            ))}
                        </div>
                        {currentFeatures.length > 0 && (
                            <div className="flex items-center gap-1 px-2 pt-2 pb-1">
                                <button
                                    onClick={handleShowAll}
                                    disabled={allCurrentVisible}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    <Eye className="h-3 w-3" />
                                    Show All
                                </button>
                                <button
                                    onClick={handleHideAll}
                                    disabled={allCurrentHidden}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    <EyeOff className="h-3 w-3" />
                                    Hide All
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={onResetMap}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>
                        )}
                        <ul className="p-1">
                            {filterByLayer === "Polygon" && polygons.map((p, idx) =>
                                featureRow(
                                    "Polygon", idx,
                                    <Shapes className={`h-3.5 w-3.5 ${isSelected("Polygon", idx) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Polygon ${idx + 1}`,
                                    `${formatNumber(area(p)/1e6)} sq km`,
                                )
                            )}
                            {filterByLayer === "Point" && points.map((p, idx) =>
                                featureRow(
                                    "Point", idx,
                                    <MapPin className={`h-3.5 w-3.5 ${isSelected("Point", idx) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Point ${idx + 1}`,
                                )
                            )}
                            {filterByLayer === "LineString" && lines.map((p, idx) =>
                                featureRow(
                                    "LineString", idx,
                                    <Waypoints className={`h-3.5 w-3.5 ${isSelected("LineString", idx) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Line ${idx + 1}`,
                                    `${formatNumber(length(p))} km`,
                                )
                            )}
                        </ul>
                    </div>
                }
            </>
        </Panel>
    )
}
