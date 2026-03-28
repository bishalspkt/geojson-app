import { FeatureCollection, GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import PasteGeoJSONForm from "../paste-geojson";
import { PanelType } from "@/types";
import Panel from "./panel";
import { useMemo, useState } from "react";
import example1 from "../../../assets/samples/example1.json";
import example2 from "../../../assets/samples/example2.json";
import { useGeoJson, createGeoJsonActions } from "@/services";
import { useMapInstance } from "@/services/map";
import { usePostHog } from "@posthog/react";

type UploadPanelProps = {
    togglePanel: (panel: PanelType) => void;
}

export default function UploadPanel({ togglePanel }: UploadPanelProps) {
    const { dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const [pasteGeoJsonFormShown, setPasteGeoJsonFormShown] = useState(false);
    const mapRef = useMapInstance();
    const posthog = usePostHog();

    const trackUpload = (source: string, geoJson: GeoJSON, fileName?: string, fileSize?: number) => {
        const fc = geoJson as FeatureCollection;
        const featureCount = fc.features?.length ?? 0;
        const center = mapRef.current?.getCenter();
        posthog.capture('geojson_uploaded', {
            source,
            file_name: fileName ?? null,
            file_size_bytes: fileSize ?? null,
            feature_count: featureCount,
            map_center_lat: center?.lat ?? null,
            map_center_lng: center?.lng ?? null,
        });
    };

    const loadGeoJsonAndSwitch = (geoJson: GeoJSON, fileName?: string, fileSize?: number) => {
        togglePanel("layers");
        actions.loadGeoJson(geoJson as FeatureCollection);
        actions.setFileName(fileName ?? null);
        trackUpload('file_upload', geoJson, fileName, fileSize);
    };

    const loadPastedGeoJson = (geoJson: GeoJSON) => {
        togglePanel("layers");
        actions.loadGeoJson(geoJson as FeatureCollection);
        actions.setFileName(null);
        trackUpload('paste', geoJson);
    };

    const importSampleGeoJson = (num: number) => {
        return () => {
            const sample = num === 1 ? example1 as GeoJSON : example2 as GeoJSON;
            const sampleName = num === 1 ? 'Regions' : 'Landmarks';
            togglePanel("layers");
            actions.loadGeoJson(sample as FeatureCollection);
            actions.setFileName(null);
            trackUpload('sample', sample, sampleName);
        }
    }

    return (
        <Panel type="upload" onToggle={togglePanel} className="p-3">
            <UploadGeoJSONButton setGeoJSON={loadGeoJsonAndSwitch} />
            <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-200/50" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-200/50" />
            </div>
            {pasteGeoJsonFormShown ?
                <PasteGeoJSONForm setGeoJSON={loadPastedGeoJson} /> :
                <div className="text-xs text-gray-500 space-y-1.5">
                    <p><a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={() => setPasteGeoJsonFormShown(true)}>Paste GeoJSON</a> directly</p>
                    <p>Try a sample: <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(2)}>Landmarks</a> or <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(1)}>Regions</a></p>
                </div>
            }
        </Panel>
    )
}
