import React from "react";
import { Import, Layers, Pencil, Play, Ruler, X } from "lucide-react";
import { PanelProps, PanelType } from "@/types";

const panelDict: Record<PanelType, { title: string; icon: React.ReactNode }> = {
    "upload": { title: "Import GeoJSON", icon: <Import className="h-4 w-4" /> },
    "layers": { title: "Layers", icon: <Layers className="h-4 w-4" /> },
    "measure": { title: "Measure", icon: <Ruler className="h-4 w-4" /> },
    "create": { title: "Create", icon: <Pencil className="h-4 w-4" /> },
    "animate": { title: "Animate", icon: <Play className="h-4 w-4" /> },
}
export default function Panel({ type, children, className, onToggle }: PanelProps) {
    return (
        <div className="fixed left-3 bottom-16 sm:w-[420px] w-[calc(100vw-24px)] z-20 rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-black/10">
            <div
                className="flex items-center gap-2 px-3 py-2.5 border-b border-white/30 cursor-pointer rounded-t-2xl hover:bg-white/40 transition-colors duration-150"
                onClick={() => onToggle(type)}
            >
                <span className="text-gray-500">{panelDict[type].icon}</span>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{panelDict[type].title}</h2>
                <button
                    className="ml-auto h-6 w-6 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors duration-150"
                    aria-label={`Close ${panelDict[type].title} panel`}
                >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
            </div>
            <div className={`flex flex-col gap-2 text-left max-h-[60vh] overflow-y-auto ${className}`}>
                {children}
            </div>
        </div>
    )
}
