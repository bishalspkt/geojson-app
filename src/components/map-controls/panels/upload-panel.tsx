import { GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import PasteGeoJSONForm from "../paste-geojson";
import { PanelType } from "../types";
import Panel from "./panel";
import { useState } from "react";
import example1 from "../../../assets/samples/example1.json";
import example2 from "../../../assets/samples/example2.json";

type UploadPanelProps = {
    togglePanel: (panel: PanelType) => void;
    setGeoJson: (geojson: GeoJSON) => void;
}

export default function UploadPanel({ togglePanel, setGeoJson }: UploadPanelProps) {
    const [pasteGeoJsonFormShown, setPasteGeoJsonFormShown] = useState(false);

    const importSampleGeoJson = (num: number) => {
        return () => {
            togglePanel("layers");
            setGeoJson(num === 1 ? example1 as GeoJSON : example2 as GeoJSON)
        }
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
                <div className="py-2">
                    <p className="text-sm">You may also <a href="#" className="underline" onClick={() => setPasteGeoJsonFormShown(true)}>paste your GeoJSON content</a>. </p>
                    <p className="text-sm"> Or import an <a href="#" className="underline" onClick={importSampleGeoJson(2)}>example here</a> or <a href="#" className="underline" onClick={importSampleGeoJson(1)}>here.</a></p>

                </div>
            }
        </Panel>
    )
}