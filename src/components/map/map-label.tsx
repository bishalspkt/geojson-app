import { MapPinned } from "lucide-react";

export default function MapLabel() {
    return (
        <div className="fixed top-2 left-2 flex gap-1">
            <MapPinned className="h-8 w-8 p-1 text-gray-800" />
            <h2 className="text-xl text-black"  style={{ textShadow: '0px 0px 6px white' }}>geojson.app</h2>
        </div>
    )
}