import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "@/types";
import { GeometryCategory, categorizeGeometry, IdentifiedFeature } from "@/types";
import { useGeoJson, createGeoJsonActions, selectFeaturesByCategory, selectFeatureStats } from "@/services";
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

interface LayersPanelProps {
    togglePanel: (panel: PanelType) => void;
}

export default function LayersPanel({ togglePanel }: LayersPanelProps) {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);

    const [filterByLayer, setFilterByLayer] = useState<GeometryCategory>("polygon");
    const stats = useMemo(() => selectFeatureStats(state.features), [state.features]);
    const polygons = useMemo(() => selectFeaturesByCategory(state.features, "polygon"), [state.features]);
    const points = useMemo(() => selectFeaturesByCategory(state.features, "point"), [state.features]);
    const lines = useMemo(() => selectFeaturesByCategory(state.features, "line"), [state.features]);

    // Auto-switch tab when a feature is selected
    useEffect(() => {
        if (state.selectedFeatureId) {
            const feature = state.features.find((f) => f.id === state.selectedFeatureId);
            if (feature) {
                const cat = categorizeGeometry(feature.geometry.type);
                if (cat !== filterByLayer) {
                    setFilterByLayer(cat);
                }
            }
        }
    }, [state.selectedFeatureId, state.features]);

    const filterTabs: { type: GeometryCategory; icon: React.ReactNode; count: number }[] = [
        { type: "point", icon: <MapPin className="h-3.5 w-3.5" />, count: stats.points },
        { type: "line", icon: <Waypoints className="h-3.5 w-3.5" />, count: stats.lines },
        { type: "polygon", icon: <Shapes className="h-3.5 w-3.5" />, count: stats.polygons },
    ];

    const currentFeatures = useMemo(() => {
        switch (filterByLayer) {
            case "point": return points;
            case "line": return lines;
            case "polygon": return polygons;
            default: return [];
        }
    }, [filterByLayer, points, lines, polygons]);

    const currentIds = useMemo(
        () => currentFeatures.map((f) => f.id),
        [currentFeatures],
    );

    const allCurrentVisible = useMemo(
        () => currentIds.length > 0 && currentIds.every(id => !state.hiddenFeatureIds.has(id)),
        [currentIds, state.hiddenFeatureIds],
    );

    const allCurrentHidden = useMemo(
        () => currentIds.length > 0 && currentIds.every(id => state.hiddenFeatureIds.has(id)),
        [currentIds, state.hiddenFeatureIds],
    );

    const handleShowAll = useCallback(() => {
        actions.setFeaturesVisibility(currentIds, true);
    }, [currentIds, actions]);

    const handleHideAll = useCallback(() => {
        actions.setFeaturesVisibility(currentIds, false);
    }, [currentIds, actions]);

    const isSelected = (feature: IdentifiedFeature) =>
        state.selectedFeatureId === feature.id;

    const isHidden = (feature: IdentifiedFeature) =>
        state.hiddenFeatureIds.has(feature.id);

    const handleFeatureClick = (feature: IdentifiedFeature) => {
        if (isSelected(feature)) {
            actions.selectFeature(null);
        } else {
            actions.selectFeature(feature.id);
            if (!isHidden(feature)) {
                actions.setMapFocus({ featureId: feature.id });
            }
        }
    };

    const handleVisibilityClick = (e: React.MouseEvent, feature: IdentifiedFeature) => {
        e.stopPropagation();
        actions.toggleFeatureVisibility(feature.id);
    };

    const handleReset = () => {
        actions.clearGeoJson();
    };

    const featureRow = (
        feature: IdentifiedFeature,
        icon: React.ReactNode,
        name: string,
        subtitle?: string,
    ) => {
        const active = isSelected(feature);
        const hidden = isHidden(feature);
        return (
            <li key={feature.id}>
                <div
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] ${
                        active
                            ? "bg-orange-50 ring-1 ring-orange-300"
                            : "hover:bg-white/40"
                    } ${hidden ? "opacity-40" : ""}`}
                    onClick={() => handleFeatureClick(feature)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFeatureClick(feature); } }}
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
                        onClick={(e) => handleVisibilityClick(e, feature)}
                        aria-label={hidden ? "Show feature" : "Hide feature"}
                    >
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </li>
        );
    };

    const hasData = state.features.length > 0;

    return (
        <Panel type="layers" onToggle={togglePanel}>
            <>
                {!hasData &&
                    <div className="p-3">
                        <p className="text-sm font-bold text-gray-900">No layers added</p>
                        <p className="text-gray-500 text-xs mt-0.5">Import GeoJSON to see layers here</p>
                        <div className="pt-3">
                            <Button className="rounded-xl text-xs font-bold h-8" onClick={() => togglePanel("upload")}>Import GeoJSON</Button>
                        </div>
                    </div>
                }
                {hasData &&
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
                                    onClick={handleReset}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>
                        )}
                        <ul className="p-1">
                            {filterByLayer === "polygon" && polygons.map((p) =>
                                featureRow(
                                    p,
                                    <Shapes className={`h-3.5 w-3.5 ${isSelected(p) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Polygon ${polygons.indexOf(p) + 1}`,
                                    `${formatNumber(area(p)/1e6)} sq km`,
                                )
                            )}
                            {filterByLayer === "point" && points.map((p) =>
                                featureRow(
                                    p,
                                    <MapPin className={`h-3.5 w-3.5 ${isSelected(p) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Point ${points.indexOf(p) + 1}`,
                                )
                            )}
                            {filterByLayer === "line" && lines.map((p) =>
                                featureRow(
                                    p,
                                    <Waypoints className={`h-3.5 w-3.5 ${isSelected(p) ? "text-orange-500" : "text-violet-400"}`} />,
                                    p.properties?.name || `Line ${lines.indexOf(p) + 1}`,
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
