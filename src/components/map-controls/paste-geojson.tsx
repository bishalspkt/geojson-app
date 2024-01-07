import { useRef } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";



export default function PasteGeoJSONForm({setGeoJSON}: {setGeoJSON: React.Dispatch<React.SetStateAction<Record<string, unknown> | undefined>>}) {
    const geojsonTextareRef = useRef<HTMLTextAreaElement>(null);

    const handleViewGeoJsonClick = () => {
        const geojsonStr = geojsonTextareRef.current?.value;
        if (!geojsonStr) {
            return;
        }

        console.log("MapControls: Calling setGeoJSON")
        const json = JSON.parse(geojsonStr);
        setGeoJSON(json);
    }

    return (
        <>
            <p className="text-gray-600 text-sm">Copy/Paste your GeoJSON content below</p>

            <Textarea className="h-48" placeholder="Paste GeoJSON here" ref={geojsonTextareRef} />
            <div className="py-2 mr-auto">
                <Button onClick={handleViewGeoJsonClick}>View GeoJSON</Button>
            </div>
        </>
    )
}