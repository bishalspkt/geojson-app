import { MapPinned } from "lucide-react";
import MapSettingsButton from "./map-settings";
import { MapSettings } from "../map-controls/types";

interface MapLabelProps {
    settings: MapSettings;
    onSettingsChange: (settings: MapSettings) => void;
}

export default function MapLabel({ settings, onSettingsChange }: MapLabelProps) {
    return (
        <div className="fixed top-3 left-3 z-10 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/10">
            <MapPinned className="h-4 w-4" />
            <h1 className="font-extrabold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>geojson.app</h1>
            <div className="w-px h-4 bg-white/25" />
            <MapSettingsButton settings={settings} onSettingsChange={onSettingsChange} />
        </div>
    );
}
