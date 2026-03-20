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
        <Panel type="upload" onToggle={togglePanel} className="p-3">
            <UploadGeoJSONButton setGeoJSON={setGeoJsonWithToggleToLayers()} />
            <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-200/50" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-200/50" />
            </div>
            {pasteGeoJsonFormShown ?
                <PasteGeoJSONForm setGeoJSON={setGeoJsonWithToggleToLayers()} /> :
                <div className="text-xs text-gray-500 space-y-1.5">
                    <p><a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={() => setPasteGeoJsonFormShown(true)}>Paste GeoJSON</a> directly</p>
                    <p>Try a sample: <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(2)}>Landmarks</a> or <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(1)}>Regions</a></p>
                </div>
            }
        </Panel>
    )
}