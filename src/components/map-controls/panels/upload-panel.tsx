import { GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import PasteGeoJSONForm from "../paste-geojson";
import { PanelType } from "../types";
import Panel from "./panel";

type UploadPanelProps = {
    togglePanel: (panel: PanelType) => void;
    setGeoJson: (geojson: GeoJSON) => void;
}

export default function UploadPanel({togglePanel, setGeoJson}: UploadPanelProps) {
    return (
        <Panel type="layers" onToggle={togglePanel}>
                <Panel type="upload" onToggle={togglePanel}>
                    <UploadGeoJSONButton setGeoJSON={setGeoJson} />
                    <p className="text-l text-bold my-2 mx-auto">OR</p>
                    <PasteGeoJSONForm setGeoJSON={setGeoJson} />
                </Panel>
    </Panel>
    )
}