import { useState } from "react";

interface UploadGeoJSONButtonProps {
    setGeoJSON: (geoJSON: unknown) => void; // Update the type of geoJSON
}

export default function UploadGeoJSONButton({setGeoJSON}: UploadGeoJSONButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleButtonClick = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

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
                    closeModal();
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <button className="fixed bottom-4 right-2 bg-green-600 mx-4 p-2 rounded" onClick={handleButtonClick}>
                Upload GeoJSON
            </button>
            {isModalOpen && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-50 text-gray-800">
                    <div className="bg-white rounded-lg p-4 relative">
                        <button className="absolute top-2 right-2 bg-red-600 text-white p-0.5 w-8 h-8 rounded-3xl" onClick={closeModal}>
                            X
                        </button>
                        {/* Modal content goes here */}
                        <h2 className="text-xl font-bold mb-4">Upload your GeoJSON</h2>
                        <p>Select a GeoJSON file that you would like to view.</p>
                        <div className="mt-4">
                            <label htmlFor="file-upload" className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
                                Choose File
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="application/geo+json,application/vnd.geo+json,.geojson"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}