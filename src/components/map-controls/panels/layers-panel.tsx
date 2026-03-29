import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "@/types";
import { GeometryCategory, categorizeGeometry, IdentifiedFeature } from "@/types";
import { useGeoJson, createGeoJsonActions, selectFeaturesByCategory } from "@/services";
import { ChevronDown, ChevronRight, Eye, EyeOff, MapPin, RotateCcw, Shapes, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { length } from "@turf/length";
import { area } from "@turf/area";
import { useEmbed } from "@/services/embed-context";

function formatNumber(value: number): string {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    if (value >= 10) return value.toFixed(0);
    if (value >= 0.01) return value.toFixed(2);
    return value.toFixed(4);
}

const CATEGORY_CONFIG: { type: GeometryCategory; label: string; icon: typeof MapPin }[] = [
    { type: "point", label: "Markers", icon: MapPin },
    { type: "line", label: "LineStrings", icon: Waypoints },
    { type: "polygon", label: "Polygons", icon: Shapes },
];

interface LayersPanelProps {
    togglePanel: (panel: PanelType) => void;
}

export default function LayersPanel({ togglePanel }: LayersPanelProps) {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const embed = useEmbed();

    const polygons = useMemo(() => selectFeaturesByCategory(state.features, "polygon"), [state.features]);
    const lines = useMemo(() => selectFeaturesByCategory(state.features, "line"), [state.features]);
    const points = useMemo(() => selectFeaturesByCategory(state.features, "point"), [state.features]);

    const featuresByCategory: Record<GeometryCategory, IdentifiedFeature[]> = useMemo(() => ({
        polygon: polygons,
        line: lines,
        point: points,
    }), [polygons, lines, points]);

    const [collapsed, setCollapsed] = useState<Set<GeometryCategory>>(new Set());

    // Auto-expand section when a feature is selected
    useEffect(() => {
        if (state.selectedFeatureId) {
            const feature = state.features.find((f) => f.id === state.selectedFeatureId);
            if (feature) {
                const cat = categorizeGeometry(feature.geometry.type);
                if (collapsed.has(cat)) {
                    setCollapsed((prev) => {
                        const next = new Set(prev);
                        next.delete(cat);
                        return next;
                    });
                }
            }
        }
    }, [state.selectedFeatureId, state.features]);

    const toggleCollapse = (cat: GeometryCategory) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

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

    const handleToggleAllVisibility = (e: React.MouseEvent, cat: GeometryCategory) => {
        e.stopPropagation();
        const features = featuresByCategory[cat];
        const ids = features.map((f) => f.id);
        const allHidden = ids.every((id) => state.hiddenFeatureIds.has(id));
        actions.setFeaturesVisibility(ids, allHidden);
    };

    const handleReset = () => {
        actions.clearGeoJson();
    };

    const getFeatureName = (feature: IdentifiedFeature, cat: GeometryCategory, idx: number) => {
        const name = feature.properties?.name;
        if (name) return name;
        const label = cat === "polygon" ? "Polygon" : cat === "line" ? "Line" : "Point";
        return `${label} ${idx + 1}`;
    };

    const getSubtitle = (feature: IdentifiedFeature, cat: GeometryCategory) => {
        if (cat === "polygon") return `${formatNumber(area(feature) / 1e6)} sq km`;
        if (cat === "line") return `${formatNumber(length(feature))} km`;
        return undefined;
    };

    const hasData = state.features.length > 0;

    return (
        <Panel type="layers" onToggle={togglePanel}>
            <>
                {!hasData &&
                    <div className="p-3">
                        <p className="text-sm font-bold text-gray-900">No features</p>
                        {!embed.enabled && (
                            <>
                                <p className="text-gray-500 text-xs mt-0.5">Import GeoJSON to see features here</p>
                                <div className="pt-3">
                                    <Button className="rounded-xl text-xs font-bold h-8" onClick={() => togglePanel("upload")}>Import GeoJSON</Button>
                                </div>
                            </>
                        )}
                    </div>
                }
                {hasData &&
                    <div className="pb-2">
                        {CATEGORY_CONFIG.map(({ type: cat, label, icon: Icon }) => {
                            const features = featuresByCategory[cat];
                            if (features.length === 0) return null;
                            const isCollapsed = collapsed.has(cat);
                            const catIds = features.map((f) => f.id);
                            const allCatHidden = catIds.every((id) => state.hiddenFeatureIds.has(id));
                            const someCatHidden = catIds.some((id) => state.hiddenFeatureIds.has(id));

                            return (
                                <div key={cat}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/40 transition-colors duration-150 select-none"
                                        onClick={() => toggleCollapse(cat)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(cat); } }}
                                    >
                                        {isCollapsed
                                            ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                        }
                                        <Icon className="h-3.5 w-3.5 text-violet-400" />
                                        <span className="text-xs font-extrabold text-gray-700 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                                            {label}
                                        </span>
                                        <span className="text-[11px] font-semibold text-gray-400">{features.length}</span>
                                        <div className="flex-1" />
                                        <button
                                            className={`shrink-0 p-1.5 rounded-lg transition-colors duration-150 ${
                                                allCatHidden
                                                    ? "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                                    : someCatHidden
                                                    ? "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                            }`}
                                            onClick={(e) => handleToggleAllVisibility(e, cat)}
                                            aria-label={allCatHidden ? `Show all ${label.toLowerCase()}` : `Hide all ${label.toLowerCase()}`}
                                        >
                                            {allCatHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </button>
                                    </div>
                                    {!isCollapsed && (
                                        <ul className="px-1 pb-1">
                                            {features.map((feature, idx) => {
                                                const active = isSelected(feature);
                                                const hidden = isHidden(feature);
                                                return (
                                                    <li key={feature.id}>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            className={`flex items-center gap-2.5 w-full pl-8 pr-3 py-2.5 sm:py-2 rounded-xl text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] ${
                                                                active
                                                                    ? "bg-orange-50 ring-1 ring-orange-300"
                                                                    : "hover:bg-white/40"
                                                            } ${hidden ? "opacity-40" : ""}`}
                                                            onClick={() => handleFeatureClick(feature)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFeatureClick(feature); } }}
                                                        >
                                                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-orange-100" : "bg-violet-50"}`}>
                                                                <Icon className={`h-3.5 w-3.5 ${active ? "text-orange-500" : "text-violet-400"}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className={`text-sm font-bold truncate ${active ? "text-orange-800" : "text-gray-900"}`}>
                                                                    {getFeatureName(feature, cat, idx)}
                                                                </p>
                                                                {getSubtitle(feature, cat) && (
                                                                    <p className="text-[11px] text-gray-400">{getSubtitle(feature, cat)}</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                className={`shrink-0 p-2 sm:p-1 rounded-lg transition-colors duration-150 ${
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
                                            })}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                        {!embed.enabled && (
                            <div className="flex justify-end px-2 pt-1 border-t border-white/30">
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>
                        )}
                    </div>
                }
            </>
        </Panel>
    )
}
