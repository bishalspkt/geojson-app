export default function MapControls() {
    const title = "GeoJSON Viewer";

return (
    <>
        <div className="fixed top-4 mx-4 rounded max-w-400px text-black font-semibold bg-white p-2 flex gap-2">
            <img src="/logo.png" alt="Outback Yak Logo" className="w-28"/>
            {title}
        </div>
        
    </>
);
}
