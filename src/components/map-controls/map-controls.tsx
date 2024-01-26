import { useState } from "react";
import { Button } from "../ui/button.js";
import { Import, Layers, Locate, Pencil } from "lucide-react";
import LayersPanel from "./panels/layers-panel.js";
import UploadPanel from "./panels/upload-panel.js";
import CreatePanel from "./panels/create-panel.js";
import { PanelStatus, PanelType, UploadGeoJSONButtonProps } from "./types.js";
import { getCurrentPosition } from "../../lib/map-utils.js";

export default function MapControls({ geoJson, setGeoJSON, setMapFocus }: UploadGeoJSONButtonProps) {
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

    const locateUserAndSetMapFocus = async () => {
        try {
            const position = await getCurrentPosition();
            setMapFocus(position);
        } catch(error: any) {
            alert((error as Error).message);
        }
    }

    return (
        <>
            <div className="fixed bottom-4 left-4 flex flex gap-2 rounded-lg">
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("upload")}><Import className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("layers")}><Layers className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("create")}><Pencil className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={locateUserAndSetMapFocus}><Locate className="h-5 w-5" /></Button>
            </div>

            { uploadPanelStatus !== "hidden" && <UploadPanel togglePanel={togglePanel} setGeoJson={setGeoJSON} /> }
            { layersPanelStatus !== "hidden" && <LayersPanel togglePanel={togglePanel} geoJson={geoJson} setMapFocus={setMapFocus}/> }
            {createPanelStatus !== "hidden" && <CreatePanel togglePanel={togglePanel} /> }
        </>
    );
}
