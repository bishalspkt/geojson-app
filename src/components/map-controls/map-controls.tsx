import { useState } from "react";
import UploadGeoJSONButton from "./upload-geojson.js";
import PasteGeoJSONForm from "./paste-geojson.js";
import { Button } from "../ui/button.js";
import { Download, Layers, Upload } from "lucide-react";

interface UploadGeoJSONButtonProps {
    setGeoJSON: React.Dispatch<React.SetStateAction<Record<string, unknown> | undefined>> // Update the type of geoJSON
}

export default function MapControls({ setGeoJSON }: UploadGeoJSONButtonProps) {
    const title = "Import GeoJSON";
    const [uploadMinimized, setUploadMinimized] = useState(false);
    const [layersMinimized, setLayersMinimized] = useState(false);

    const toggleUploadMinimize = () => {
        setUploadMinimized(!uploadMinimized);
    };

    const toggleLayersMinimize = () => {
        setLayersMinimized(!layersMinimized);
    }

    return (
        <>
        <div className="fixed top-16 left-4 flex flex-col gap-2">
        <Button variant="outline" size="icon" className="rounded-3xl" onClick={toggleUploadMinimize}><Upload className="h-5 w-5"/></Button>
        <Button variant="outline" size="icon" className="rounded-3xl" onClick={toggleLayersMinimize}><Layers className="h-5 w-5"/></Button>
        <Button variant="outline" size="icon" className="rounded-3xl"><Download className="h-5 w-5"/></Button>
            </div>
            <div className="fixed left-8 bottom-0 mx-8 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                <div className="flex border-b border-gray-300 px-4 py-2 my-2 gap-2 hover:cursor-pointer" onClick={toggleUploadMinimize}>
                    <p>{title}</p>
                    <a className={`bg-gray-400 h-8 w-8 text-white rounded-2xl ${uploadMinimized ? '' : 'rotate-180'} ml-auto leading-10`}> ^ </a>
                </div>
                {!uploadMinimized && (
                    <>
                        <div className="flex flex-col gap-2 px-4 py-2 text-left">
                            <UploadGeoJSONButton setGeoJSON={setGeoJSON} />

                            <p className="text-l text-bold my-2 mx-auto">OR</p>
                            <PasteGeoJSONForm setGeoJSON={setGeoJSON} />
                        </div>
                    </>
                )}
            </div>

        </>
    );
}
