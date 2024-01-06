import { useRef, useState } from "react";
import { UploadGeoJSONButton } from ".";
import { Button } from "../ui/button";

interface UploadGeoJSONButtonProps {
    setGeoJSON: (geoJSON: Record<string, unknown>) => void; // Update the type of geoJSON
}

function handleViewGeoJsonClick(textareaRef: HTMLTextAreaElement): GeoJSON.GeoJSON {
    const geojson = JSON.parse(textareaRef.value);
    return geojson;
}

export default function MapControls({ setGeoJSON }: UploadGeoJSONButtonProps) {
    const title = "Import GeoJSON";
    const [minimized, setMinimized] = useState(false);
    const geojsonTextareRef = useRef<HTMLTextAreaElement>(null);
    const handleMinimize = () => {
        setMinimized(!minimized);
    };

    return (
        <>
            <div className="fixed bottom-0 mx-8 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
                <div className="flex border-b border-gray-300 px-4 py-2 my-2 gap-2 hover:cursor-pointer" onClick={handleMinimize}>
                    <p>{title}</p>
                    <a className={`bg-gray-400 h-8 w-8 text-white rounded-2xl ${minimized ? '' : 'rotate-180'} ml-auto leading-10`}> ^ </a>
                </div>
                {!minimized && (
                    <>
                        <div className="flex flex-col gap-2 px-4 py-2 text-left">
                            <p className="text-gray-600 text-sm">Upload a GeoJSON file to get started</p>
                            <div className="py-2 ml-auto">
                                <UploadGeoJSONButton setGeoJSON={setGeoJSON} />
                            </div>
                            <p className="text-l text-bold my-2 mx-auto">OR</p>
                            <p className="text-gray-600 text-sm">Paste your GeoJSON here</p>
                            <h3></h3>
                            <textarea className="border border-gray-300 text-white rounded-lg p-2 h-40 bg-gray-800" placeholder="Paste GeoJSON here" ref={geojsonTextareRef}/>
                                <div className="py-2 ml-auto">
                                    <Button onClick={() => handleViewGeoJsonClick(geojsonTextareRef.current!!)}>View GeoJSON</Button>
                                </div>
                        </div>
                    </>
                )}
            </div>

        </>
    );
}
