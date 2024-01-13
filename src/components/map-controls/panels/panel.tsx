import { Import, Layers, Pencil, X } from "lucide-react";
import { PanelProps } from "../types";

const panelDict = {
    "upload": { title: "Import GeoJSON", icon: <Import className="h-5 w-5" /> },
    "layers": { title: "Layers", icon: <Layers className="h-5 w-5" /> },
    "create": { title: "Create", icon: <Pencil className="h-5 w-5" /> },

}
export default function Panel({ type, children, className, onToggle }: PanelProps) {
    return (
        <div className="fixed left-4 bottom-20 rounded sm:w-[450px] w-[300px] text-black font-semibold bg-white shadow-lg border border-b-0">
            <div className="flex border-b border-gray-300 px-4 py-3 gap-2 bg-accent hover:cursor-pointer" onClick={() => onToggle(type)}>
                <p>{panelDict[type].title}</p>
                <X className="h-5 w-5 ml-auto" />
            </div>
            <div className={`flex flex-col gap-2 text-left max-h-[70vh] overflow-y-auto ${className}`}>
                {children}
            </div>
        </div>
    )
}