import { GeoJSON } from "geojson";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "../types";

type LayersPanelProps = {
    togglePanel: (panel: PanelType) => void;
    geoJson: GeoJSON|undefined;
}

export default function LayersPanel({togglePanel, geoJson}: LayersPanelProps) {
    return (
        <Panel type="layers" onToggle={togglePanel}>
        <p>{JSON.stringify(geoJson)}</p>
        <p>You have not added any layers</p>
        <p className="text-gray-600 text-sm">To add layers, import your GeoJSON</p>
        <div className="py-2 mr-auto">
            <Button className="py-2" onClick={() => togglePanel("upload")}>Import your GeoJSON</Button>
        </div>
    </Panel>
    )
}