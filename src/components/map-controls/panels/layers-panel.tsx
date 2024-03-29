import { Button } from "../../ui/button";
import Panel from "./panel";
import { GeoJsonPrimaryFetureTypes, LayersPanelProps } from "../types";
import { filterGeojsonFeatures, getGeoJsonFeatureCountStats } from "../../../lib/geojson-utils";
import { MapPin, Shapes, Waypoints } from "lucide-react";
import { useState } from "react";
// @ts-ignore
import length from "@turf/length";
import area from "@turf/area";


export default function LayersPanel({ togglePanel, geoJson, setMapFocus }: LayersPanelProps) {
    const [filterByLayer, setFilterByLayer] = useState<GeoJsonPrimaryFetureTypes>("Polygon");
    const geoJsonStats = getGeoJsonFeatureCountStats(geoJson);
    const polygons = filterGeojsonFeatures(geoJson, ["Polygon", "MultiPolygon"]);
    const points = filterGeojsonFeatures(geoJson, ["Point", "MultiPoint"]);
    const lines = filterGeojsonFeatures(geoJson, ["LineString", "MultiLineString"]);

    return (
        <Panel type="layers" onToggle={togglePanel}>
            <>
                {(!geoJson) &&
                    <div className="mx-4 my-2">
                        <p>You have not added any layers</p>
                        <p className="text-gray-600 text-sm">To add layers, import your GeoJSON</p>
                        <div className="py-2 mr-auto">
                            <Button className="py-2" onClick={() => togglePanel("upload")}>Import your GeoJSON</Button>
                        </div>
                    </div>
                }
                {geoJson &&
                    <div className="mb-20">
                        <div className="absolute bottom-0 bg-white flex gap-2 w-full p-5 border-t border-gray-300 bg-opacity-90 backdrop-filter backdrop-blur-sm h-20">
                            <Button variant="outline" size="default" onClick={() => setFilterByLayer("Point")} className="text-md"><MapPin className="h-5 w-5" /> {geoJsonStats.numberOfPoints || ""} </Button>
                            <Button variant="outline" size="default" onClick={() => setFilterByLayer("LineString")}  className="text-md"><Waypoints className="h-5 w-5" /> {geoJsonStats.numberOfLines || ""} </Button>
                            <Button variant="outline" size="default" onClick={() => setFilterByLayer("Polygon")} className="text-md"><Shapes className="h-5 w-5" />{geoJsonStats.numberOfPolygons || ""}</Button>
                        </div>
                        {filterByLayer === "Polygon" &&
                            <div>
                                <ul>{polygons.map((p, idx) => (
                                    <li key={idx} className="flex flex-row">
                                        <Button variant="ghost" size="lg" className="text-md block w-full text-left h-16" onClick={() => setMapFocus({ type: "Polygon", idx })}>
                                            <Shapes className="h-5 w-5 inline" />
                                            <p className="inline m-4">
                                                {  p.properties?.name || `New ${p.type} ${idx + 1}` }
                                                <span className="text-xs text-secondary bg-primary px-2 py-1 mx-4 rounded-xl">{(area(p)/1e6).toFixed(2)} sq km</span>
                                            </p>
                                        </Button>
                                        { /* <Info className="h-5 w-5 m-auto" /> */}
                                    </li>
                                ))}</ul>
                            </div>
                        }
                        {filterByLayer === "Point" &&
                            <div>
                                <ul>{points.map((p, idx) => (
                                    <li key={idx} className="flex flex-row">
                                        <Button variant="ghost" size="lg" className="text-md block w-full text-left h-16" onClick={() => setMapFocus({ type: "Point", idx })}>
                                            <MapPin className="h-5 w-5 inline" />
                                            <p className="inline m-4">
                                            {  p.properties?.name || `New ${p.type} ${idx + 1}` }
                                            </p>
                                        </Button>
                                        { /* <Info className="h-5 w-5 m-auto" /> */}
                                    </li>
                                ))}</ul>
                            </div>
                        }
                        {filterByLayer === "LineString" &&
                            <div>
                                <ul>{lines.map((p, idx) => (
                                    <li key={idx} className="flex flex-row">
                                        <Button variant="ghost" size="lg" className="text-md block w-full text-left h-16" onClick={() => setMapFocus({ type: "LineString", idx })}>
                                            <Waypoints className="h-5 w-5 inline" />
                                            <p className="inline m-4">
                                            {  p.properties?.name || `New ${p.type} ${idx + 1}` }
                                            <span className="text-xs text-secondary bg-primary px-2 py-1 mx-4 rounded-xl">{length(p).toFixed(2)} km</span>
                                            </p>
                                        </Button>
                                        { /* <Info className="h-5 w-5 m-auto" /> */}
                                    </li>
                                ))}</ul>
                            </div>
                        }
                    </div>
                }
            </>
        </Panel>
    )
}