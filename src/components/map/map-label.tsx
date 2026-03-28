import { MapPinned } from "lucide-react";
import { useEffect } from "react";
import MapSettingsButton from "./map-settings";
import { useGeoJson } from "@/services";

const BASE_TITLE = "geojson.app - Open Source Mapping & Geospatial Data Visualization";

export default function MapLabel() {
    const { state } = useGeoJson();
    const fileName = state.fileName;

    useEffect(() => {
        document.title = fileName ? `${fileName} - ${BASE_TITLE}` : BASE_TITLE;
        return () => { document.title = BASE_TITLE; };
    }, [fileName]);

    return (
        <div className="fixed top-3 left-3 z-10 flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/10">
                <MapPinned className="h-4 w-4" />
                <h1 className="font-extrabold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>geojson.app</h1>
                <div className="w-px h-4 bg-white/25" />
                <MapSettingsButton />
            </div>
            {fileName && (
                <span className="px-3.5 text-[11px] font-semibold text-gray-500 truncate max-w-[180px]" title={fileName}>
                    {fileName}
                </span>
            )}
        </div>
    );
}
