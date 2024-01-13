import { GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import PasteGeoJSONForm from "../paste-geojson";
import { PanelType } from "../types";
import Panel from "./panel";
import { useState } from "react";
import example1 from "../../../assets/samples/example1.json";

type UploadPanelProps = {
    togglePanel: (panel: PanelType) => void;
    setGeoJson: (geojson: GeoJSON) => void;
}

export default function UploadPanel({ togglePanel, setGeoJson }: UploadPanelProps) {
    const [pasteGeoJsonFormShown, setPasteGeoJsonFormShown] = useState(false);

    const importSampleGeoJson = () => {
        togglePanel("layers");
        setGeoJson(example1 as GeoJSON)
    }

    const setGeoJsonWithToggleToLayers = () => {
        return (geoJson: GeoJSON) => {
            togglePanel("layers");
            setGeoJson(geoJson);
        }
    }

    return (
        <Panel type="upload" onToggle={togglePanel} className="px-4 py-2">
            <UploadGeoJSONButton setGeoJSON={setGeoJsonWithToggleToLayers()} />
            <p className="text-l text-bold my-2 mx-auto">OR</p>
            {pasteGeoJsonFormShown ?
                <PasteGeoJSONForm setGeoJSON={setGeoJsonWithToggleToLayers()} /> :
                <>
                    <p className="text-sm">You may also <a href="#" className="underline" onClick={() => setPasteGeoJsonFormShown(true)}>paste your GeoJSON content</a>. </p>
                    <p className="text-sm"> Or simply import <a href="#" className="underline" onClick={importSampleGeoJson}>an example here</a>.</p>

                </>
            }
        </Panel>
    )
}