import { Globe, Map, Settings } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { MapTheme, MapProjection } from "@/types";
import { useGeoJson, createGeoJsonActions } from "@/services";

const THEMES: { id: MapTheme; label: string; swatch: string; bg: string }[] = [
    { id: "light",     label: "Light",     swatch: "bg-sky-100",    bg: "border-sky-200" },
    { id: "dark",      label: "Dark",      swatch: "bg-slate-800",  bg: "border-slate-600" },
    { id: "white",     label: "Clean",     swatch: "bg-white",      bg: "border-gray-200" },
    { id: "grayscale", label: "Mono",      swatch: "bg-gray-400",   bg: "border-gray-300" },
    { id: "black",     label: "Midnight",  swatch: "bg-gray-950",   bg: "border-gray-700" },
];

export default function MapSettingsButton() {
    const { state, dispatch } = useGeoJson();
    const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
    const settings = state.mapSettings;
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const setTheme = (theme: MapTheme) => {
        actions.setMapSettings({ ...settings, theme });
    };

    const setProjection = (projection: MapProjection) => {
        actions.setMapSettings({ ...settings, projection });
    };

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors duration-150 ${
                    open ? "bg-white/25" : "hover:bg-white/15"
                }`}
                aria-label="Map settings"
            >
                <Settings className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2.5 w-64 rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-2xl shadow-black/10 p-4 flex flex-col gap-4 z-50">
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Theme</p>
                        <div className="grid grid-cols-5 gap-2">
                            {THEMES.map((t) => {
                                const active = settings.theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-150 ${
                                            active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-black/5 active:scale-95"
                                        }`}
                                        aria-label={`${t.label} theme`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg ${t.swatch} border ${t.bg} ${active ? "ring-2 ring-primary ring-offset-1" : ""}`} />
                                        <span className={`text-[10px] font-bold ${active ? "text-primary" : "text-gray-500"}`}>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-black/8 pt-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Projection</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setProjection("mercator")}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                                    settings.projection === "mercator"
                                        ? "bg-primary/10 ring-1 ring-primary/30"
                                        : "hover:bg-black/5 active:scale-[0.98]"
                                }`}
                                aria-label="Flat map projection"
                            >
                                <Map className={`h-4 w-4 ${settings.projection === "mercator" ? "text-primary" : "text-gray-400"}`} />
                                <span className={`text-xs font-bold ${settings.projection === "mercator" ? "text-primary" : "text-gray-600"}`}>Flat</span>
                            </button>
                            <button
                                onClick={() => setProjection("globe")}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                                    settings.projection === "globe"
                                        ? "bg-primary/10 ring-1 ring-primary/30"
                                        : "hover:bg-black/5 active:scale-[0.98]"
                                }`}
                                aria-label="Globe projection"
                            >
                                <Globe className={`h-4 w-4 ${settings.projection === "globe" ? "text-primary" : "text-gray-400"}`} />
                                <span className={`text-xs font-bold ${settings.projection === "globe" ? "text-primary" : "text-gray-600"}`}>Globe</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
