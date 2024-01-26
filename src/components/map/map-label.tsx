import { Github, MapPinned, Menu } from "lucide-react";
import { useState } from "react";

export default function MapLabel() {
    const [isMenuOpen, setMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setMenuOpen(!isMenuOpen);
    };

    const menuItems = [
        { name: "GitHub", icon: <Github className="h-5 w-5 text-gray-800" />, url: "https://github.com/bishalspkt/geojson-app" }
    ]
    return (
        <div className="fixed p-4 pl-4 w-full flex gap-2 z-10 bg-white bg-opacity-50 backdrop-filter backdrop-blur-sm items-center">
            <MapPinned className="h-5 w-5 text-gray-800" />
            <h2 className="text text-black font-semibold">geojson.app</h2>
            <div className="ml-auto cursor-pointer hover:scale-110" onClick={handleMenuClick}>
                <Menu className="h-5 w-5 text-gray-800" />
            </div>
            {isMenuOpen && (
                <div className="absolute top-0 right-0 mt-14 mr-2 bg-white shadow-lg rounded-lg p-4  z-10 bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm items-center border border-color-gray-400">
                    {menuItems.map((item, index) => (
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <div className="flex gap-2 items-center" key={index}>
                                {item.icon}{item.name}
                            </div>
                        </a>
                    ),)}
                </div>
            )}
        </div>
    );
}