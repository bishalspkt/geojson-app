import { useRef } from "react";
import { Button } from "../ui/button";
interface UploadGeoJSONButtonProps {
    setGeoJSON: (geoJSON: Record<string, unknown>) => void; // Update the type of geoJSON
}

export default function UploadGeoJSONButton({ setGeoJSON }: UploadGeoJSONButtonProps) {

    const fileUploadRef = useRef<HTMLInputElement>(null);
    const dialogCloseRef = useRef<HTMLButtonElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        const allowedExtensions = ['json', 'geojson'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        const fileExtension = file.name.split('.').pop()!.toLowerCase()!;
        const fileSize = file.size;

        if (!allowedExtensions.includes(fileExtension) || fileSize > maxSize) {
            console.error('Invalid file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target?.result;
            if (typeof contents === 'string') {
                try {
                    const jsonData = JSON.parse(contents);
                    console.log("UploadGeoJSONButton: Calling setGeoJSON")
                    setGeoJSON(jsonData);
                    dialogCloseRef.current?.click();
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <p>Upload a GeoJSON file to get started</p>
            <p className="text-gray-600 text-sm">You may select a .json or .geojson file that is less than 10MB in size.</p>
            <div className="py-2 mr-auto">
                <Button onClick={() => fileUploadRef.current?.click()}>Upload GeoJSON</Button>
            </div>
            <input
                ref={fileUploadRef}
                type="file"
                className="hidden"
                onChange={handleFileChange} />
        </>
    );
}
