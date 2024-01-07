import { useState } from "react";
import UploadGeoJSONButton from "./upload-geojson.js";
import PasteGeoJSONForm from "./paste-geojson.js";
import { Button } from "../ui/button.js";
import { Download, Layers, Upload } from "lucide-react";

interface UploadGeoJSONButtonProps {
    setGeoJSON: React.Dispatch<React.SetStateAction<Record<string, unknown> | undefined>> // Update the type of geoJSON
}

type PanelType = "upload" | "layers";
type PanelStatus = "minimized" | "maximized" | "hidden";
type PanelAction = "toggle-hidden" | "toggle-maximized";

export default function MapControls({ setGeoJSON }: UploadGeoJSONButtonProps) {
    const [uploadPanelStatus, setUploadPanelStatus] = useState<PanelStatus>("maximized");
    const [layersPanelStatus, setLayersPanelStatus] = useState<PanelStatus>("hidden");


    const togglePanel = (panel: PanelType, action: PanelAction) => {
        switch (panel) {
            case "upload":
                setLayersPanelStatus("hidden")

                action === "toggle-hidden" 
                    ? setUploadPanelStatus(uploadPanelStatus === "hidden" ? "maximized" : "hidden") 
                    : setUploadPanelStatus(uploadPanelStatus === "minimized" ? "maximized" : "minimized");
                break;
            case "layers":
                setUploadPanelStatus("hidden")

                action === "toggle-hidden"
                    ? setLayersPanelStatus(layersPanelStatus === "hidden" ? "maximized" : "hidden")
                    : setLayersPanelStatus(layersPanelStatus === "minimized" ? "maximized" : "minimized");
                break;
            default:
                alert("Something unexpected happened. Panel has unknown value")
        }
    }

    return (
        <>
            <div className="fixed top-16 left-4 flex flex-col gap-2">
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("upload", "toggle-hidden")}><Upload className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl" onClick={() => togglePanel("layers", "toggle-hidden")}><Layers className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" className="rounded-3xl"><Download className="h-5 w-5" /></Button>
            </div>

            {uploadPanelStatus !== "hidden" &&
                <div className="fixed left-8 bottom-0 mx-8 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                    <div className="flex border-b border-gray-300 px-4 py-2 my-2 gap-2 hover:cursor-pointer" onClick={() => togglePanel("upload", "toggle-maximized")}>
                        <p>Import GeoJSON</p>
                    </div>
                    {uploadPanelStatus === "maximized" && (
                        <div className="flex flex-col gap-2 px-4 py-2 text-left">
                            <UploadGeoJSONButton setGeoJSON={setGeoJSON} />

                            <p className="text-l text-bold my-2 mx-auto">OR</p>
                            <PasteGeoJSONForm setGeoJSON={setGeoJSON} />
                        </div>
                    )}
                </div>
            }
            {layersPanelStatus !== "hidden" &&
                <div className="fixed left-8 bottom-0 mx-8 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                    <div className="flex border-b border-gray-300 px-4 py-2 my-2 gap-2 hover:cursor-pointer">
                        <p>Your Layers</p>
                    </div>
                    {layersPanelStatus === "maximized" && (
                        <div className="flex flex-col gap-2 px-4 py-2 text-left">
                            <p>You have not added any layers</p>
                            <p className="text-gray-600 text-sm">To add layers, import your GeoJSON</p>
                            <Button className="mr-auto" onClick={() => togglePanel("upload", "toggle-hidden")}>Import your GeoJSON</Button>
                        </div>
                    )}
                </div>
            }
        </>
    );
}
