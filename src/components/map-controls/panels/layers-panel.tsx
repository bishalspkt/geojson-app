import { GeoJSON } from "geojson";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "../types";
import { getGeoJsonFeatureCountStats, getPolygons } from "../../../lib/geojson-utils";
import { MapPin, Shapes, Waypoints } from "lucide-react";

type LayersPanelProps = {
    togglePanel: (panel: PanelType) => void;
    geoJson: GeoJSON | undefined;
}

export default function LayersPanel({ togglePanel, geoJson }: LayersPanelProps) {
    const geoJsonStats = getGeoJsonFeatureCountStats(geoJson);
    const polygons = getPolygons(geoJson);

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
                    <div className="flex gap-2 absolute bottom-4 bg-white">
                            <Button variant="outline" size="default"><MapPin className="h-5 w-5"/> {geoJsonStats.numberOfPoints || ""} </Button>
                            <Button variant="outline" size="default"><Waypoints className="h-5 w-5"/> {geoJsonStats.numberOfLines || ""} </Button>
                            <Button variant="outline" size="default" className="text-md"><Shapes className="h-5 w-5"/>({geoJsonStats.numberOfPolygons || ""})</Button>
                    </div>
                    <div className="mb-14">
                        <ul>{polygons.map((p, idx) => (
                        <li className="py-4 block" key={idx}>
                            <Shapes className="h-5 w-5 inline"/>
                            <p className="inline m-4">Polygon {idx + 1} ({p.type})</p>
                            </li>
                        ))}</ul>
                    </div>
                    </>
                }
            </>
        </Panel>
    )
}