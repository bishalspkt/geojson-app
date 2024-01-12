import { GeoJSON } from "geojson";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "../types";
import { getGeoJsonFeatureCountStats } from "../../../lib/geojson-utils";

type LayersPanelProps = {
    togglePanel: (panel: PanelType) => void;
    geoJson: GeoJSON | undefined;
}

export default function LayersPanel({ togglePanel, geoJson }: LayersPanelProps) {
    const geoJsonStats = getGeoJsonFeatureCountStats(geoJson);
    return (
        <Panel type="layers" onToggle={togglePanel}>
            <>
            {(!geoJson) && 
            <>
                    <p>You have not added any layers</p>
                    <p className="text-gray-600 text-sm">To add layers, import your GeoJSON</p>
                    <div className="py-2 mr-auto">
                        <Button className="py-2" onClick={() => togglePanel("upload")}>Import your GeoJSON</Button>
                    </div>
            </>
            }
            {geoJson && 
            <>
                <p className="text-gray-600 text-sm">Click on a layer to edit it</p>
                <ul>
                    {Object.entries(geoJsonStats).map(([key, value]) => (
                        <li key={key}>
                            {key}: {value}
                        </li>
                    ))}
                </ul>
            </>
            }
            </>
        </Panel>
    )
}