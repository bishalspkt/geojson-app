import React, { useEffect, useMemo, useRef, useState } from "react";
import { Import, Layers, Locate, Ruler } from "lucide-react";
import LayersPanel from "./panels/layers-panel.js";
import UploadPanel from "./panels/upload-panel.js";
import MeasurePanel from "./panels/measure-panel.js";
import { PanelStatus, PanelType } from "@/types";
import { getCurrentPosition } from "../../lib/map-utils.js";
import { useGeoJson, createGeoJsonActions } from "@/services";
import { useEmbed } from "@/services/embed-context";

export default function MapControls() {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const embed = useEmbed();

    const [uploadPanelStatus, setUploadPanelStatus] =
        useState<PanelStatus>(embed.enabled ? "hidden" : "maximized");
    const [layersPanelStatus, setLayersPanelStatus] =
        useState<PanelStatus>(embed.enabled && embed.controls ? "maximized" : "hidden");
    const [measurePanelStatus, setMeasurePanelStatus] =
        useState<PanelStatus>("hidden");

    const togglePanel = (panel: PanelType) => {
        switch (panel) {
            case "upload":
                setUploadPanelStatus(
                    uploadPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                setLayersPanelStatus("hidden");
                setMeasurePanelStatus("hidden");
                actions.setMeasuring(false);
                actions.selectFeature(null);
                break;
            case "layers":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus(
                    layersPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                setMeasurePanelStatus("hidden");
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
                actions.setMeasuring(willOpen);
                actions.selectFeature(null);
                break;
            }
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
            { panel: "layers", icon: <Layers className="h-4 w-4" />, label: "Features" },
            { panel: "measure", icon: <Ruler className="h-4 w-4" />, label: "Measure" },
            { icon: <Locate className="h-4 w-4" />, label: "Locate", onClick: locateUserAndSetMapFocus },
        ];

    const activePanels: Record<string, PanelStatus> = {
        upload: uploadPanelStatus,
        layers: layersPanelStatus,
        measure: measurePanelStatus,
    };

    return (
        <>
            <div className="fixed bottom-3 left-3 z-30 flex items-center gap-0.5 p-1 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/5">
                {toolbarButtons.map((btn) => {
                    const isActive = btn.panel && activePanels[btn.panel] !== "hidden";
                    return (
                        <button
                            key={btn.label}
                            onClick={btn.onClick ?? (() => togglePanel(btn.panel!))}
                            aria-label={btn.label}
                            className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-95 ${
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-gray-600 hover:bg-white/40 hover:text-gray-900"
                            }`}
                        >
                            {btn.icon}
                            <span className="hidden sm:inline">{btn.label}</span>
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
        </>
    );
}
