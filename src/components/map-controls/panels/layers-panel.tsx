import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "@/types";
import { GeometryCategory, categorizeGeometry, IdentifiedFeature } from "@/types";
import { useGeoJson, createGeoJsonActions, selectFeaturesByCategory } from "@/services";
import { ChevronDown, ChevronRight, Eye, EyeOff, Info, MapPin, RotateCcw, Shapes, Waypoints } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { length } from "@turf/length";
import { area } from "@turf/area";
import { useEmbed } from "@/services/embed-context";
import { openPropertiesDialog } from "@/context-menu/feature-details";

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

type SortOrder = "original" | "alpha" | "size";

interface LayersPanelProps {
    togglePanel: (panel: PanelType) => void;
    collapsedCategories: Set<GeometryCategory>;
    setCollapsedCategories: Dispatch<SetStateAction<Set<GeometryCategory>>>;
}

export default function LayersPanel({ togglePanel, collapsedCategories, setCollapsedCategories }: LayersPanelProps) {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const embed = useEmbed();
    const [sortOrder, setSortOrder] = useState<SortOrder>("original");
    const featureRefs = useRef<Map<string, HTMLElement>>(new Map());

    const polygons = useMemo(() => selectFeaturesByCategory(state.features, "polygon"), [state.features]);
    const lines = useMemo(() => selectFeaturesByCategory(state.features, "line"), [state.features]);
    const points = useMemo(() => selectFeaturesByCategory(state.features, "point"), [state.features]);

    const featuresByCategory: Record<GeometryCategory, IdentifiedFeature[]> = useMemo(() => ({
        polygon: polygons,
        line: lines,
        point: points,
    }), [polygons, lines, points]);

    const sortedFeaturesByCategory = useMemo((): Record<GeometryCategory, IdentifiedFeature[]> => {
        const getSortName = (f: IdentifiedFeature) =>
            f.properties?.name || f.properties?.label || f.properties?.title || "";

        const sort = (feats: IdentifiedFeature[], cat: GeometryCategory): IdentifiedFeature[] => {
            if (sortOrder === "original") return feats;
            if (sortOrder === "alpha") {
                return [...feats].sort((a, b) => getSortName(a).localeCompare(getSortName(b)));
            }
            // size
            if (cat === "polygon") return [...feats].sort((a, b) => area(b) - area(a));
            if (cat === "line") return [...feats].sort((a, b) => length(b) - length(a));
            // points: size doesn't apply — fall back to alpha
            return [...feats].sort((a, b) => getSortName(a).localeCompare(getSortName(b)));
        };

        return {
            polygon: sort(featuresByCategory.polygon, "polygon"),
            line: sort(featuresByCategory.line, "line"),
            point: sort(featuresByCategory.point, "point"),
        };
    }, [featuresByCategory, sortOrder]);

    // Auto-expand section when a feature is selected
    useEffect(() => {
        if (state.selectedFeatureId) {
            const feature = state.features.find((f) => f.id === state.selectedFeatureId);
            if (feature) {
                const cat = categorizeGeometry(feature.geometry.type);
                setCollapsedCategories((prev) => {
                    if (!prev.has(cat)) return prev;
                    const next = new Set(prev);
                    next.delete(cat);
                    return next;
                });
            }
        }
    }, [state.selectedFeatureId, state.features, setCollapsedCategories]);

    // Scroll to selected feature (after accordion has had time to expand)
    useEffect(() => {
        if (!state.selectedFeatureId) return;
        const id = state.selectedFeatureId;
        const timer = setTimeout(() => {
            const el = featureRefs.current.get(id);
            if (!el) return;
            // Find the nearest scrollable ancestor and scroll manually to account
            // for the sticky category header height (~36 px).
            const scrollContainer = el.closest<HTMLElement>("[data-scroll-container]");
            if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const STICKY_HEADER_HEIGHT = 36;
                const target = scrollContainer.scrollTop + (elRect.top - containerRect.top) - STICKY_HEADER_HEIGHT;
                scrollContainer.scrollTo({ top: target, behavior: "smooth" });
            } else {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [state.selectedFeatureId]);

    const toggleCollapse = (cat: GeometryCategory) => {
        setCollapsedCategories((prev) => {
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

    const handleInfoClick = (e: React.MouseEvent, feature: IdentifiedFeature) => {
        e.stopPropagation();
        openPropertiesDialog(feature);
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
                        {/* Sort bar */}
                        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/30 bg-white/60 backdrop-blur-sm">
                            <span className="text-[10px] font-semibold text-gray-400 mr-0.5">Sort:</span>
                            {(["original", "alpha", "size"] as SortOrder[]).map((order) => (
                                <button
                                    key={order}
                                    onClick={() => setSortOrder(order)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors duration-150 ${
                                        sortOrder === order
                                            ? "bg-primary text-primary-foreground"
                                            : "text-gray-400 hover:text-gray-600 hover:bg-white/60"
                                    }`}
                                >
                                    {order === "original" ? "Original" : order === "alpha" ? "A–Z" : "Size"}
                                </button>
                            ))}
                        </div>

                        {CATEGORY_CONFIG.map(({ type: cat, label, icon: Icon }) => {
                            const features = sortedFeaturesByCategory[cat];
                            if (features.length === 0) return null;
                            const isCollapsed = collapsedCategories.has(cat);
                            const catIds = features.map((f) => f.id);
                            const allCatHidden = catIds.every((id) => state.hiddenFeatureIds.has(id));
                            const someCatHidden = catIds.some((id) => state.hiddenFeatureIds.has(id));

                            return (
                                <div key={cat}>
                                    {/* Sticky category header */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/60 transition-colors duration-150 select-none bg-white/90 backdrop-blur-sm border-b border-white/20"
                                        onClick={() => toggleCollapse(cat)}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapse(cat); } }}
                                    >
                                        {isCollapsed
                                            ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                        }
                                        <Icon className="h-3.5 w-3.5 text-violet-400" />
                                        <span className="text-xs font-extrabold text-gray-700 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
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
                                                            ref={(el) => {
                                                                if (el) featureRefs.current.set(feature.id, el);
                                                                else featureRefs.current.delete(feature.id);
                                                            }}
                                                            role="button"
                                                            tabIndex={0}
                                                            className={`flex items-center gap-2.5 w-full pl-8 pr-2 py-2.5 sm:py-2 rounded-xl text-left transition-colors duration-150 cursor-pointer active:scale-[0.98] scroll-mt-10 ${
                                                                active
                                                                    ? "bg-orange-50 ring-1 ring-orange-300"
                                                                    : "hover:bg-white/40"
                                                            } ${hidden ? "opacity-40" : ""}`}
                                                            onClick={() => handleFeatureClick(feature)}
                                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFeatureClick(feature); } }}
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
                                                            {/* Info button — mobile only */}
                                                            <button
                                                                className="sm:hidden shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
                                                                onClick={(e) => handleInfoClick(e, feature)}
                                                                aria-label="View properties"
                                                            >
                                                                <Info className="h-3.5 w-3.5" />
                                                            </button>
                                                            {/* Visibility toggle */}
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
    );
}
