import { SubtitleInfo } from "../../lib/animation-utils";
import { Plane } from "lucide-react";

interface AnimationSubtitleProps {
    info: SubtitleInfo;
}

export default function AnimationSubtitle({ info }: AnimationSubtitleProps) {
    if (!info.visible) return null;

    // For presets with many routes, show text counter instead of dots
    const useDots = info.totalRoutes <= 10;

    return (
        <div className="fixed bottom-20 right-4 z-30 pointer-events-none">
            <div
                className="bg-black/50 backdrop-blur-sm text-white rounded-xl px-4 py-3 w-[260px] shadow-lg border border-white/5"
                style={{ animation: "subtitle-fade-in 0.3s ease-out" }}
            >
                {/* Route counter */}
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-medium">
                        {info.routeIndex + 1} / {info.totalRoutes}
                    </span>
                    {useDots ? (
                        <div className="flex gap-0.5">
                            {Array.from({ length: info.totalRoutes }).map(
                                (_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 h-1 rounded-full"
                                        style={{
                                            backgroundColor:
                                                i <= info.routeIndex
                                                    ? info.color
                                                    : "rgba(255,255,255,0.15)",
                                        }}
                                    />
                                )
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <div
                                className="h-1 rounded-full"
                                style={{
                                    width: `${((info.routeIndex + 1) / info.totalRoutes) * 40}px`,
                                    backgroundColor: info.color,
                                }}
                            />
                            <div
                                className="h-1 rounded-full"
                                style={{
                                    width: `${40 - ((info.routeIndex + 1) / info.totalRoutes) * 40}px`,
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Category */}
                <div
                    className="text-[9px] font-semibold uppercase tracking-wider mb-1 opacity-80"
                    style={{ color: info.color }}
                >
                    {info.subtitle}
                </div>

                {/* Route cities */}
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm font-bold text-white/90">
                        {info.fromLabel}
                    </span>
                    <Plane
                        className="h-2.5 w-2.5 shrink-0 opacity-40"
                        style={{ color: info.color }}
                    />
                    <span className="text-sm font-bold text-white/90">
                        {info.toLabel}
                    </span>
                </div>

                {/* Description */}
                <p className="text-[10px] leading-relaxed text-white/40">
                    {info.description}
                </p>

                {/* Progress bar */}
                <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-[width] duration-75 ease-linear"
                        style={{
                            width: `${info.progress * 100}%`,
                            backgroundColor: info.color,
                            opacity: 0.7,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
