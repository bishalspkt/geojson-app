import { useState } from "react";
import { Button } from "../ui/button.js";
import { Circle, Diamond, Import, Layers, MapPin, Pencil, Pentagon, Save, Triangle } from "lucide-react";
import Panel from "./panels/panel.js";
import { PanelStatus, PanelType, UploadGeoJSONButtonProps } from "./types.js";
import LayersPanel from "./panels/layers-panel.js";
import UploadPanel from "./panels/upload-panel.js";


export default function MapControls({ geoJson, setGeoJSON }: UploadGeoJSONButtonProps) {
    const [uploadPanelStatus, setUploadPanelStatus] = useState<PanelStatus>("maximized");
    const [layersPanelStatus, setLayersPanelStatus] = useState<PanelStatus>("hidden");
    const [createPanelStatus, setCreatePanelStatus] = useState<PanelStatus>("hidden");

    const togglePanel = (panel: PanelType) => {
        switch (panel) {
            case "upload":
                setUploadPanelStatus(uploadPanelStatus === "hidden" ? "maximized" : "hidden");
                setLayersPanelStatus("hidden");
                setCreatePanelStatus("hidden");
                break;
            case "layers":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus(layersPanelStatus === "hidden" ? "maximized" : "hidden");
                setCreatePanelStatus("hidden");
                break;
            case "create":
                setUploadPanelStatus("hidden");
                setLayersPanelStatus("hidden");
                setCreatePanelStatus(createPanelStatus === "hidden" ? "maximized" : "hidden");
                break;
            default:
                alert("Something unexpected happened. Panel has unknown value");
        }
    }

    return (
        <>
            <div className="fixed bottom-4 left-4 flex flex gap-2">
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("upload")}><Import className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("layers")}><Layers className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("create")}><Pencil className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl"><Save className="h-5 w-5" /></Button>
            </div>

            { uploadPanelStatus !== "hidden" && <UploadPanel togglePanel={togglePanel} setGeoJson={setGeoJSON} /> }
            { layersPanelStatus !== "hidden" && <LayersPanel togglePanel={togglePanel} geoJson={geoJson}/> }
            {createPanelStatus !== "hidden" &&
                <Panel type="create" onToggle={togglePanel}>
                    <p>Select a tool to begin editing</p>
                    <p className="text-gray-600 text-sm">Add layers</p>
                    <div className="py-2 mr-auto flex gap-4">
                        <Button variant="secondary" size="icon"><MapPin /></Button>
                        <Button variant="secondary" size="icon"><Triangle /></Button>
                        <Button variant="secondary" size="icon"><Diamond /></Button>
                        <Button variant="secondary" size="icon"><Pentagon /></Button>
                        <Button variant="secondary" size="icon"><Circle /></Button>
                    </div>
                </Panel>
            }
        </>
    );
}
