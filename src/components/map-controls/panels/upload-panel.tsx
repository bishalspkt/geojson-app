import { FeatureCollection, GeoJSON } from "geojson";
import { UploadGeoJSONButton } from "..";
import { PanelType } from "@/types";
import Panel from "./panel";
import { useMemo } from "react";
import volcanoes from "../../../assets/samples/volcanoes.json";
import wonders from "../../../assets/samples/wonders.json";
import trainRoutes from "../../../assets/samples/train-routes.json";
import nationalParks from "../../../assets/samples/national-parks.json";
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

    const importSample = (sample: GeoJSON, name: string) => {
        return (e: React.MouseEvent) => {
            e.preventDefault();
            togglePanel("layers");
            actions.loadGeoJson(sample as FeatureCollection);
            actions.setFileName(null);
            trackUpload('sample', sample, name);
        }
    }

    return (
        <Panel type="upload" onToggle={togglePanel} className="p-3">
            <UploadGeoJSONButton setGeoJSON={loadGeoJsonAndSwitch} />
            <p className="text-xs">
                Try a demo:{" "}
                <a href="#" className="font-bold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors duration-150" onClick={importSample(volcanoes as GeoJSON, 'Volcanoes')}>Volcanoes</a>
                {", "}
                <a href="#" className="font-bold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors duration-150" onClick={importSample(wonders as GeoJSON, 'Wonders')}>Wonders</a>
                {", "}
                <a href="#" className="font-bold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors duration-150" onClick={importSample(trainRoutes as GeoJSON, 'Train Routes')}>Train Routes</a>
                {" or "}
                <a href="#" className="font-bold text-primary hover:text-primary-dark underline underline-offset-2 transition-colors duration-150" onClick={importSample(nationalParks as GeoJSON, 'National Parks')}>National Parks</a>
            </p>
        </Panel>
    )
}
