import React, { useEffect, useMemo, useRef, useState } from "react";
import { Code2, Import, Layers, Locate, Navigation, Ruler } from "lucide-react";
import LayersPanel from "./panels/layers-panel.js";
import UploadPanel from "./panels/upload-panel.js";
import MeasurePanel from "./panels/measure-panel.js";
import DevelopersPanel from "./panels/developers-panel.js";
import { PanelStatus, PanelType } from "@/types";
import { getCurrentPosition } from "../../lib/map-utils.js";
import { useGeoJson, createGeoJsonActions } from "@/services";
import { useMapInstance } from "@/services/map";
import { useEmbed } from "@/services/embed-context";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 640px)");
        const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
}

export default function MapControls() {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const embed = useEmbed();
    const isMobile = useIsMobile();
    const mapRef = useMapInstance();
    const [bearing, setBearing] = useState(0);

    // Track map bearing for compass visibility/rotation
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const update = () => setBearing(map.getBearing());
        update();
        map.on("rotate", update);
        map.on("rotateend", update);
        map.on("load", update);
        return () => {
            map.off("rotate", update);
            map.off("rotateend", update);
            map.off("load", update);
        };
    }, [mapRef.current]);

    const resetBearing = () => {
        mapRef.current?.easeTo({ bearing: 0, duration: 300 });
    };

    const showCompass = Math.abs(bearing) > 0.5;

    // On mobile, never auto-open panels on first load
    const [uploadPanelStatus, setUploadPanelStatus] =
        useState<PanelStatus>(embed.enabled || isMobile ? "hidden" : "maximized");
    const [layersPanelStatus, setLayersPanelStatus] =
        useState<PanelStatus>(embed.enabled && embed.controls ? "maximized" : "hidden");
    const [measurePanelStatus, setMeasurePanelStatus] =
        useState<PanelStatus>("hidden");
    const [developersPanelStatus, setDevelopersPanelStatus] =
        useState<PanelStatus>("hidden");

    const togglePanel = (panel: PanelType) => {
        switch (panel) {
            case "upload":
                setUploadPanelStatus(
                    uploadPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                setLayersPanelStatus("hidden");
                setMeasurePanelStatus("hidden");
                setDevelopersPanelStatus("hidden");
                actions.setMeasuring(false);
                actions.selectFeature(null);
                break;
            case "layers":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus(
                    layersPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                setMeasurePanelStatus("hidden");
                setDevelopersPanelStatus("hidden");
                actions.setMeasuring(false);
                if (layersPanelStatus !== "hidden") {
                    actions.selectFeature(null);
                }
                break;
            case "measure": {
                const willOpen = measurePanelStatus === "hidden";
                setUploadPanelStatus("hidden");
                setLayersPanelStatus("hidden");
                setMeasurePanelStatus(willOpen ? "maximized" : "hidden");
                setDevelopersPanelStatus("hidden");
                actions.setMeasuring(willOpen);
                actions.selectFeature(null);
                break;
            }
            case "developers":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus("hidden");
                setMeasurePanelStatus("hidden");
                setDevelopersPanelStatus(
                    developersPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                actions.setMeasuring(false);
                actions.selectFeature(null);
                break;
            default:
                break;
        }
    };

    // Auto-open measure panel when measuring is activated externally (e.g. from context menu)
    useEffect(() => {
        if (state.isMeasuring && measurePanelStatus === "hidden") {
            setUploadPanelStatus("hidden");
            setLayersPanelStatus("hidden");
            setMeasurePanelStatus("maximized");
        }
    }, [state.isMeasuring]);

    // Auto-open layers panel when a feature is selected (e.g. from map click)
    const prevSelectedRef = useRef(state.selectedFeatureId);
    useEffect(() => {
        if (state.selectedFeatureId && state.selectedFeatureId !== prevSelectedRef.current) {
            if (layersPanelStatus === "hidden") {
                setUploadPanelStatus("hidden");
                setLayersPanelStatus("maximized");
                setMeasurePanelStatus("hidden");
                actions.setMeasuring(false);
            }
        }
        prevSelectedRef.current = state.selectedFeatureId;
    }, [state.selectedFeatureId]);

    const locateUserAndSetMapFocus = async () => {
        try {
            const position = await getCurrentPosition();
            actions.setMapFocus(position);
        } catch (error: unknown) {
            alert((error as Error).message);
        }
    };

    const toolbarButtons: { panel?: PanelType; icon: React.ReactNode; label: string; onClick?: () => void }[] = embed.enabled
        ? [
            { panel: "layers", icon: <Layers className="h-4 w-4" />, label: "Features" },
        ]
        : [
            { panel: "upload", icon: <Import className="h-4 w-4" />, label: "Import" },
            { panel: "layers", icon: <Layers className="h-4 w-4" />, label: "Layers" },
            { panel: "measure", icon: <Ruler className="h-4 w-4" />, label: "Measure" },
            { panel: "developers", icon: <Code2 className="h-4 w-4" />, label: "Embed Maps" },
        ];

    const activePanels: Record<string, PanelStatus> = {
        upload: uploadPanelStatus,
        layers: layersPanelStatus,
        measure: measurePanelStatus,
        developers: developersPanelStatus,
    };

    return (
        <>
            {/* Floating Locate + Compass stack — top right (below search on mobile) */}
            {!embed.enabled && (
                <div className="fixed top-16 right-3 sm:top-3 sm:right-3 z-30 flex flex-col gap-2">
                    <button
                        onClick={locateUserAndSetMapFocus}
                        aria-label="Locate me"
                        className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 active:scale-95 transition-transform duration-150 text-primary hover:text-primary hover:bg-white/90"
                    >
                        <Locate className="h-4.5 w-4.5" />
                    </button>
                    {showCompass && (
                        <button
                            onClick={resetBearing}
                            aria-label="Reset bearing to north"
                            className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 active:scale-95 transition-transform duration-150 text-primary hover:text-primary hover:bg-white/90"
                        >
                            <Navigation
                                className="h-4.5 w-4.5"
                                style={{ transform: `rotate(${-bearing}deg)`, transition: "transform 0.1s linear" }}
                                fill="currentColor"
                            />
                        </button>
                    )}
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 sm:bottom-3 sm:left-3 sm:right-auto sm:w-fit z-30 flex items-center gap-0.5 p-1.5 sm:p-1 sm:rounded-2xl bg-white/70 backdrop-blur-xl border-t sm:border border-white/30 shadow-lg shadow-black/5">
                {toolbarButtons.map((btn) => {
                    const isActive = btn.panel && activePanels[btn.panel] !== "hidden";
                    return (
                        <button
                            key={btn.label}
                            onClick={btn.onClick ?? (() => togglePanel(btn.panel!))}
                            aria-label={btn.label}
                            className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-1.5 px-3 py-3 sm:py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-95 ${
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-gray-600 hover:bg-white/40 hover:text-gray-900"
                            }`}
                        >
                            {btn.icon}
                            <span className="text-[11px] sm:text-xs">{btn.label}</span>
                        </button>
                    );
                })}
            </div>

            {!embed.enabled && uploadPanelStatus !== "hidden" && (
                <UploadPanel togglePanel={togglePanel} />
            )}
            {layersPanelStatus !== "hidden" && (
                <LayersPanel togglePanel={togglePanel} />
            )}
            {!embed.enabled && measurePanelStatus !== "hidden" && (
                <MeasurePanel togglePanel={togglePanel} />
            )}
            {!embed.enabled && developersPanelStatus !== "hidden" && (
                <DevelopersPanel togglePanel={togglePanel} />
            )}
        </>
    );
}
