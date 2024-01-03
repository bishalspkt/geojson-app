import { useState } from "react";
import { UploadGeoJSONButton } from ".";

interface UploadGeoJSONButtonProps {
    setGeoJSON: (geoJSON: unknown) => void; // Update the type of geoJSON
}
export default function MapControls({ setGeoJSON }: UploadGeoJSONButtonProps) {
    const title = "GeoJSON Viewer";
    const [minimized, setMinimized] = useState(false);

    const handleMinimize = () => {
        setMinimized(!minimized);
    };

    return (
        <>
            <div className="fixed bottom-0 mx-8 rounded min-w-240px max-w-400px text-black font-semibold bg-white shadow-lg border border-b-0">
                <div className="flex border-b border-gray-300 px-4 py-2 my-2 gap-2">
                    <img src="/logo.png" alt="Outback Yak Logo" className="w-28" />
                    <p>{title}</p>
                    <a onClick={handleMinimize} className={`ml-8 bg-gray-400 px-2 text-white rounded-2xl hover:text-white ${minimized ? '' : 'rotate-180'}`}>
                        ∧
                    </a>
                </div>
                {!minimized && (
                    <>
                        <div className="flex flex-col gap-2 px-4 py-2">
                            <h4 className="text-left">Upload GeoJSON</h4>
                            <p className="text-gray-600 text-sm text-left">Please upload a GeoJSON file to get started</p>
                            <div className="text-left py-2">
                                <UploadGeoJSONButton setGeoJSON={setGeoJSON} />
                            </div>
                            <p className="text-gray-600 text-sm text-bold">OR</p>
                            <h4 className="text-left pt-4">Paste your GeoJSON here</h4>
                            <textarea className="border border-gray-300 text-white rounded-lg p-2 h-40 bg-gray-800" placeholder="Enter GeoJSON"/>
                        </div>
                    </>
                )}
            </div>

        </>
    );
}
