import { FeatureCollection, GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import { PanelType } from "@/types";
import Panel from "./panel";
import { useMemo } from "react";
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
            <p className="text-xs text-gray-500">Try a demo GeoJSON: <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(2)}>Landmarks</a> or <a href="#" className="font-bold text-gray-700 hover:text-gray-900 underline underline-offset-2 transition-colors duration-150" onClick={importSampleGeoJson(1)}>Regions</a></p>
        </Panel>
    )
}
