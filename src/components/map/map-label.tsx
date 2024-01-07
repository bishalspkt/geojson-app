import { MapPinned } from "lucide-react";

export default function MapLabel() {
    return (
        <div className="fixed top-2 left-2 flex gap-1" style={{ textShadow: '1px 1px 2px white' }}>
            <MapPinned className="h-8 w-8 p-1 text-gray-800" />
            <h2 className="text-xl text-gray-800 font-bold">geojson.app</h2>
        </div>
    )
}