import { Play, RotateCcw, Plane, Globe, MapPin } from "lucide-react";
import Panel from "./panel";
import { PanelType } from "../types";
import { ANIMATION_PRESETS } from "../../../lib/animation-presets";

interface AnimatePanelProps {
    togglePanel: (panel: PanelType) => void;
    isAnimating: boolean;
    onPlay: () => void;
    onReset: () => void;
    selectedPresetId: string;
    onPresetChange: (id: string) => void;
}

const ICON_MAP = {
    globe: Globe,
    plane: Plane,
    "map-pin": MapPin,
} as const;

export default function AnimatePanel({
    togglePanel,
    isAnimating,
    onPlay,
    onReset,
    selectedPresetId,
    onPresetChange,
}: AnimatePanelProps) {
    const selectedPreset = ANIMATION_PRESETS.find(
        (p) => p.id === selectedPresetId
    );

    const groupedRoutes = selectedPreset
        ? selectedPreset.routes.reduce(
              (acc, route, i) => {
                  const key = route.subtitle;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push({ route, index: i });
                  return acc;
              },
              {} as Record<
                  string,
                  { route: (typeof selectedPreset.routes)[0]; index: number }[]
              >
          )
        : {};

    return (
        <Panel type="animate" onToggle={togglePanel}>
            <div className="p-3 flex flex-col gap-3">
                {/* Preset selector */}
                <div className="flex gap-1.5">
                    {ANIMATION_PRESETS.map((preset) => {
                        const Icon = ICON_MAP[preset.icon];
                        const isSelected = preset.id === selectedPresetId;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => onPresetChange(preset.id)}
                                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                    isSelected
                                        ? "bg-gray-800 text-white shadow-md"
                                        : "text-gray-500 hover:bg-white/50"
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
                                <span className="truncate w-full text-center">{preset.name}</span>
                                <span className={`text-[10px] font-normal ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                                    {preset.routes.length} routes
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Description */}
                {selectedPreset && (
                    <p className="text-xs text-gray-500 font-normal leading-relaxed">
                        {selectedPreset.description}
                    </p>
                )}

                {/* Play / Reset buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onPlay}
                        disabled={isAnimating}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-md"
                    >
                        <Play className="h-3.5 w-3.5" />
                        {isAnimating ? "Playing..." : "Play"}
                    </button>
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-white/50 transition-all duration-200 active:scale-95"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                    </button>
                </div>

                {/* Route list */}
                {selectedPreset && (
                    <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold sticky top-0 bg-transparent backdrop-blur-sm pb-1">
                            Sequence
                        </p>
                        {Object.entries(groupedRoutes).map(
                            ([group, items]) => (
                                <div key={group}>
                                    {selectedPreset.routes.length > 8 && (
                                        <div className="flex items-center gap-2 py-1 px-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: items[0].route.color }}
                                            />
                                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                                {group}
                                            </span>
                                        </div>
                                    )}
                                    {items.map(({ route, index }) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            <div
                                                className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white font-bold shrink-0"
                                                style={{ backgroundColor: route.color }}
                                            >
                                                {index + 1}
                                            </div>
                                            <div className="flex flex-col gap-0 min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    <span className="text-gray-700 truncate">{route.fromLabel}</span>
                                                    <Plane className="h-3 w-3 text-gray-300 shrink-0" />
                                                    <span className="text-gray-700 truncate">{route.toLabel}</span>
                                                </div>
                                                {selectedPreset.routes.length <= 8 && (
                                                    <span className="text-[10px] text-gray-400 font-normal">{route.subtitle}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}

                <div className="text-[11px] text-gray-400 font-normal border-t border-white/30 pt-2">
                    Routes play sequentially with the map framing both endpoints.
                </div>
            </div>
        </Panel>
    );
}
