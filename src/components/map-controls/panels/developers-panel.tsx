import { Code2, Copy, Check } from "lucide-react";
import Panel from "./panel";
import { PanelType } from "@/types";
import { useState } from "react";

interface DevelopersPanelProps {
    togglePanel: (panel: PanelType) => void;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors duration-150"
            aria-label="Copy to clipboard"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

const EMBED_EXAMPLE = `<div id="map" style="width:100%; height:500px;"></div>

<script src="https://geojson.app/embed.js"></script>
<script>
    GeoJSONApp("create", 
        { element: "#map",
        geojson: "https://example.com/data.geojson",
        center: [144.9, -37.8],
        zoom: 10,
        theme: "dark",
        projection: "mercator",
        interactive: true,
        controls: false,
    });
</script>`;

export default function DevelopersPanel({ togglePanel }: DevelopersPanelProps) {
    return (
        <Panel type="developers" onToggle={togglePanel}>
            <div className="p-3 flex flex-col gap-3">
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                        <Code2 className="h-5 w-5 text-violet-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">Embed Maps</p>
                    <p className="text-xs text-gray-400">Add interactive maps to your website using our JS SDK.</p>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Embed Code</p>
                        <CopyButton text={EMBED_EXAMPLE} />
                    </div>
                    <pre className="text-[11px] leading-relaxed bg-gray-900 text-gray-300 rounded-xl p-3 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                        {EMBED_EXAMPLE}
                    </pre>
                </div>

                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Options</p>
                    <div className="space-y-1.5">
                        {[
                            { param: "geojson", desc: "URL to your GeoJSON file" },
                            { param: "center", desc: "[lng, lat] array" },
                            { param: "zoom", desc: "Zoom level (0-22)" },
                            { param: "theme", desc: "light, dark, white, grayscale, black" },
                            { param: "projection", desc: "mercator or globe" },
                            { param: "interactive", desc: "Enable pan/zoom (default: true)" },
                            { param: "controls", desc: "Show toolbar (default: false)" },
                        ].map(({ param, desc }) => (
                            <div key={param} className="flex items-baseline gap-2">
                                <code className="text-[11px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">{param}</code>
                                <span className="text-[11px] text-gray-500">{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <a
                    href="#"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors duration-150 border border-violet-200"
                >
                    Developers Page Coming Soon
                </a>
            </div>
        </Panel>
    );
}
