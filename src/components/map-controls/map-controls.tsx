import { useState } from "react";
import UploadGeoJSONButton from "./upload-geojson.js";
import PasteGeoJSONForm from "./paste-geojson.js";
import { Button } from "../ui/button.js";
import { Circle, Diamond, Import, Layers, MapPin, Pencil, Pentagon, Save, Triangle, X } from "lucide-react";
import { GeoJSON } from 'geojson';

type UploadGeoJSONButtonProps = {
    geoJson: GeoJSON | undefined;
    setGeoJSON: React.Dispatch<React.SetStateAction<GeoJSON | undefined>> // Update the type of geoJSON
}

type PanelType = "upload" | "layers" | "create";
type PanelStatus = "maximized" | "hidden";

export default function MapControls({ setGeoJSON }: UploadGeoJSONButtonProps) {
    const [uploadPanelStatus, setUploadPanelStatus] = useState<PanelStatus>("maximized");
    const [layersPanelStatus, setLayersPanelStatus] = useState<PanelStatus>("hidden");
    const [createPanelStatus, setCreatePanelStatus] = useState<PanelStatus>("hidden");

    const togglePanel = (panel: PanelType) => {
        switch (panel) {
            case "upload":
                setLayersPanelStatus("hidden")
                setCreatePanelStatus("hidden")
                uploadPanelStatus === "hidden" ? setUploadPanelStatus("maximized") : setUploadPanelStatus("hidden")
                break;
            case "layers":
                setUploadPanelStatus("hidden")
                setCreatePanelStatus("hidden")
                layersPanelStatus === "hidden" ? setLayersPanelStatus("maximized") : setLayersPanelStatus("hidden")
                break;
            case "create":
                setUploadPanelStatus("hidden")
                setLayersPanelStatus("hidden")
                createPanelStatus === "hidden" ? setCreatePanelStatus("maximized") : setCreatePanelStatus("hidden")

                break;
            default:
                alert("Something unexpected happened. Panel has unknown value")
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

            {uploadPanelStatus !== "hidden" &&
                <div className="fixed left-4 bottom-20 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                    <div className="flex border-b border-gray-300 px-4 py-3 gap-2 bg-accent hover:cursor-pointer" onClick={() => togglePanel("upload")}>
                        <Import className="h-5 w-5" />
                        <p>Import GeoJSON</p>
                        <X className="h-5 w-5 ml-auto" />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-2 text-left">
                        <UploadGeoJSONButton setGeoJSON={setGeoJSON} />

                        <p className="text-l text-bold my-2 mx-auto">OR</p>
                        <PasteGeoJSONForm setGeoJSON={setGeoJSON} />
                    </div>
                </div>
            }
            {layersPanelStatus !== "hidden" &&
                <div className="fixed left-4 bottom-20 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                    <div className="flex border-b border-gray-300 px-4 py-3 gap-2 bg-accent hover:cursor-pointer" onClick={() => togglePanel("layers")}>
                        <Layers className="h-5 w-5" />
                        <p>Your Layers</p>
                        <X className="h-5 w-5 ml-auto" />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-2 text-left">
                        <p>You have not added any layers</p>
                        <p className="text-gray-600 text-sm">To add layers, import your GeoJSON</p>
                        <div className="py-2 mr-auto">
                            <Button className="py-2" onClick={() => togglePanel("upload")}>Import your GeoJSON</Button>
                        </div>
                    </div>
                </div>
            }

            {createPanelStatus !== "hidden" &&
                <div className="fixed left-4 bottom-20 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                    <div className="flex border-b border-gray-300 px-4 py-3 gap-2 bg-accent hover:cursor-pointer" onClick={() => togglePanel("create")}>
                        <Pencil className="h-5 w-5" />
                        <p>Create Tools</p>
                        <X className="h-5 w-5 ml-auto" />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-2 text-left">
                        <p>Select a tool to begin editing</p>
                        <p className="text-gray-600 text-sm">Add layers</p>
                        <div className="py-2 mr-auto flex gap-4">
                            <Button variant="secondary" size="icon"><MapPin /></Button>
                            <Button variant="secondary" size="icon"><Triangle /></Button>
                            <Button variant="secondary" size="icon"><Diamond /></Button>
                            <Button variant="secondary" size="icon"><Pentagon /></Button>
                            <Button variant="secondary" size="icon"><Circle /></Button>
                        </div>
                    </div>
                </div>

            }
        </>
    );
}
