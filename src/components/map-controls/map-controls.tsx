import React, { useState } from "react";
import { Import, Layers, Locate, Ruler } from "lucide-react";
import LayersPanel from "./panels/layers-panel.js";
import UploadPanel from "./panels/upload-panel.js";
import MeasurePanel from "./panels/measure-panel.js";
import { MapFeatureTypeAndId, MeasurePoint, PanelStatus, PanelType, UploadGeoJSONButtonProps } from "./types.js";
import { getCurrentPosition } from "../../lib/map-utils.js";

interface MapControlsProps extends UploadGeoJSONButtonProps {
    measurePoints: MeasurePoint[];
    onClearMeasure: () => void;
    isMeasuring: boolean;
    onToggleMeasure: (active: boolean) => void;
    selectedFeature: MapFeatureTypeAndId | null;
    setSelectedFeature: React.Dispatch<React.SetStateAction<MapFeatureTypeAndId | null>>;
}

export default function MapControls({
    geoJson,
    setGeoJSON,
    setMapFocus,
    measurePoints,
    onClearMeasure,
    isMeasuring,
    onToggleMeasure,
    selectedFeature,
    setSelectedFeature,
}: MapControlsProps) {
    const [uploadPanelStatus, setUploadPanelStatus] =
        useState<PanelStatus>("maximized");
    const [layersPanelStatus, setLayersPanelStatus] =
        useState<PanelStatus>("hidden");
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
                onToggleMeasure(false);
                setSelectedFeature(null);
                break;
            case "layers":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus(
                    layersPanelStatus === "hidden" ? "maximized" : "hidden"
                );
                setMeasurePanelStatus("hidden");
                onToggleMeasure(false);
                if (layersPanelStatus !== "hidden") {
                    setSelectedFeature(null);
                }
                break;
            case "measure": {
                const willOpen = measurePanelStatus === "hidden";
                setUploadPanelStatus("hidden");
                setLayersPanelStatus("hidden");
                setMeasurePanelStatus(willOpen ? "maximized" : "hidden");
                onToggleMeasure(willOpen);
                setSelectedFeature(null);
                break;
            }
            default:
                break;
        }
    };

    const locateUserAndSetMapFocus = async () => {
        try {
            const position = await getCurrentPosition();
            setMapFocus(position);
        } catch (error: unknown) {
            alert((error as Error).message);
        }
    };

    const toolbarButtons: { panel?: PanelType; icon: React.ReactNode; label: string; onClick?: () => void }[] = [
        { panel: "upload", icon: <Import className="h-4 w-4" />, label: "Import" },
        { panel: "layers", icon: <Layers className="h-4 w-4" />, label: "Layers" },
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
            <div className="fixed bottom-3 left-3 flex items-center gap-0.5 p-1 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/5">
                {toolbarButtons.map((btn) => {
                    const isActive = btn.panel && activePanels[btn.panel] !== "hidden";
                    return (
                        <button
                            key={btn.label}
                            onClick={btn.onClick ?? (() => togglePanel(btn.panel!))}
                            aria-label={btn.label}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-95 ${
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

            {uploadPanelStatus !== "hidden" && (
                <UploadPanel
                    togglePanel={togglePanel}
                    setGeoJson={setGeoJSON}
                />
            )}
            {layersPanelStatus !== "hidden" && (
                <LayersPanel
                    togglePanel={togglePanel}
                    geoJson={geoJson}
                    setMapFocus={setMapFocus}
                    selectedFeature={selectedFeature}
                    setSelectedFeature={setSelectedFeature}
                />
            )}
            {measurePanelStatus !== "hidden" && (
                <MeasurePanel
                    togglePanel={togglePanel}
                    points={measurePoints}
                    onClear={onClearMeasure}
                    isMeasuring={isMeasuring}
                />
            )}
        </>
    );
}
