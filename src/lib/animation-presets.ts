import { AnimatedRoute } from "./animation-utils";

// ── Style configuration for animation rendering ──────────────────
export interface AnimationStyle {
    lineWidth: number;
    glowWidth: number;
    trailOpacity: number;
    glowEffect: boolean;
    holdDuration: number;
    cameraPitch: number;
    drawDuration: number;
    persistTrails: boolean; // keep completed routes visible on the map
}

export interface AnimationPreset {
    id: string;
    name: string;
    description: string;
    icon: "globe" | "plane" | "map-pin";
    routes: AnimatedRoute[];
    style: AnimationStyle;
}

// ── Default style (used by Global Trade Routes) ──────────────────
const DEFAULT_STYLE: AnimationStyle = {
    lineWidth: 2.5,
    glowWidth: 10,
    trailOpacity: 0.3,
    glowEffect: true,
    holdDuration: 1500,
    cameraPitch: 35,
    drawDuration: 4000,
    persistTrails: false,
};

// ── Bold style (used by My Travels) ──────────────────────────────
const BOLD_STYLE: AnimationStyle = {
    lineWidth: 4,
    glowWidth: 16,
    trailOpacity: 0.45,
    glowEffect: true,
    holdDuration: 1000,
    cameraPitch: 45,
    drawDuration: 3000,
    persistTrails: true,
};

// ── City coordinates ─────────────────────────────────────────────
const KTM: [number, number] = [85.3240, 27.7172]; // Kathmandu
const DEL: [number, number] = [77.1025, 28.7041]; // Delhi
const BKK: [number, number] = [100.7501, 13.6900]; // Bangkok
const MEL: [number, number] = [144.9631, -37.8136]; // Melbourne
const AUH: [number, number] = [54.6511, 24.4539]; // Abu Dhabi
const FCO: [number, number] = [12.4964, 41.9028]; // Rome
const HKG: [number, number] = [114.1694, 22.3193]; // Hong Kong
const DOH: [number, number] = [51.5310, 25.2854]; // Doha
const LHR: [number, number] = [-0.4543, 51.4700]; // London Heathrow
const EDI: [number, number] = [-3.1883, 55.9533]; // Edinburgh
const DPS: [number, number] = [115.1889, -8.6705]; // Denpasar / Bali
const ZQN: [number, number] = [168.7332, -45.0312]; // Queenstown

// ── Global Trade Routes preset ───────────────────────────────────
const GLOBAL_TRADE_ROUTES: AnimatedRoute[] = [
    {
        from: [-77.0369, 38.9072],
        to: [116.3972, 39.9075],
        label: "US → China",
        fromLabel: "Washington DC",
        toLabel: "Beijing",
        color: "#ef4444",
        subtitle: "Trade & Commerce",
        description:
            "$700B+ in annual bilateral trade flows between the world's two largest economies",
    },
    {
        from: [46.6753, 24.7136],
        to: [72.8826, 19.0728],
        label: "Saudi Arabia → India",
        fromLabel: "Riyadh",
        toLabel: "Mumbai",
        color: "#3b82f6",
        subtitle: "Energy Exports",
        description:
            "India imports ~18% of its crude oil from Saudi Arabia, a critical energy corridor",
    },
    {
        from: [-43.1822, -22.9064],
        to: [2.3488, 48.8534],
        label: "Brazil → France",
        fromLabel: "Rio de Janeiro",
        toLabel: "Paris",
        color: "#22c55e",
        subtitle: "Agricultural Resources",
        description:
            "Brazil is the EU's largest supplier of soybeans, coffee, and iron ore",
    },
    {
        from: [151.2073, -33.8678],
        to: [139.6917, 35.6895],
        label: "Australia → Japan",
        fromLabel: "Sydney",
        toLabel: "Tokyo",
        color: "#f59e0b",
        subtitle: "LNG & Minerals",
        description:
            "Australia supplies ~40% of Japan's LNG imports and is its top coal source",
    },
    {
        from: [-0.1257, 51.5085],
        to: [-74.006, 40.7143],
        label: "UK → US",
        fromLabel: "London",
        toLabel: "New York",
        color: "#a855f7",
        subtitle: "Financial Services",
        description:
            "The world's two largest financial centers, with $1T+ in daily forex flows",
    },
];

// ── My Travels preset ────────────────────────────────────────────
const MY_TRAVELS_ROUTES: AnimatedRoute[] = [
    // ── 2011 ──
    {
        from: KTM, to: DEL,
        label: "KTM → DEL", fromLabel: "Kathmandu", toLabel: "Delhi",
        color: "#ef4444", subtitle: "2011",
        description: "First international trip — crossing into India",
    },

    // ── 2016 ──
    {
        from: KTM, to: BKK,
        label: "KTM → BKK", fromLabel: "Kathmandu", toLabel: "Bangkok",
        color: "#f97316", subtitle: "2016",
        description: "Southeast Asia adventure — exploring Thailand",
    },
    {
        from: BKK, to: MEL,
        label: "BKK → MEL", fromLabel: "Bangkok", toLabel: "Melbourne",
        color: "#f97316", subtitle: "2016",
        description: "The big move — relocating to Australia",
    },

    // ── 2018 ──
    {
        from: MEL, to: AUH,
        label: "MEL → AUH", fromLabel: "Melbourne", toLabel: "Abu Dhabi",
        color: "#eab308", subtitle: "2018",
        description: "First stop on a European getaway",
    },
    {
        from: AUH, to: FCO,
        label: "AUH → FCO", fromLabel: "Abu Dhabi", toLabel: "Rome",
        color: "#eab308", subtitle: "2018",
        description: "The eternal city — pasta, history, and gelato",
    },
    {
        from: FCO, to: AUH,
        label: "FCO → AUH", fromLabel: "Rome", toLabel: "Abu Dhabi",
        color: "#eab308", subtitle: "2018",
        description: "Return leg via Abu Dhabi hub",
    },
    {
        from: AUH, to: MEL,
        label: "AUH → MEL", fromLabel: "Abu Dhabi", toLabel: "Melbourne",
        color: "#eab308", subtitle: "2018",
        description: "Back to Melbourne — home base",
    },

    // ── 2019 ──
    {
        from: MEL, to: HKG,
        label: "MEL → HKG", fromLabel: "Melbourne", toLabel: "Hong Kong",
        color: "#22c55e", subtitle: "2019",
        description: "Skyscrapers, dim sum, and harbour views",
    },
    {
        from: HKG, to: KTM,
        label: "HKG → KTM", fromLabel: "Hong Kong", toLabel: "Kathmandu",
        color: "#22c55e", subtitle: "2019",
        description: "Home visit via Hong Kong",
    },
    {
        from: KTM, to: HKG,
        label: "KTM → HKG", fromLabel: "Kathmandu", toLabel: "Hong Kong",
        color: "#22c55e", subtitle: "2019",
        description: "Back through Hong Kong on the return",
    },
    {
        from: HKG, to: MEL,
        label: "HKG → MEL", fromLabel: "Hong Kong", toLabel: "Melbourne",
        color: "#22c55e", subtitle: "2019",
        description: "Heading home to Australia",
    },

    // ── 2022 ──
    {
        from: MEL, to: DOH,
        label: "MEL → DOH", fromLabel: "Melbourne", toLabel: "Doha",
        color: "#3b82f6", subtitle: "2022",
        description: "Post-pandemic travel resumes — transit via Qatar",
    },
    {
        from: DOH, to: LHR,
        label: "DOH → LHR", fromLabel: "Doha", toLabel: "London",
        color: "#3b82f6", subtitle: "2022",
        description: "Landing in the UK",
    },
    {
        from: LHR, to: EDI,
        label: "LHR → EDI", fromLabel: "London", toLabel: "Edinburgh",
        color: "#3b82f6", subtitle: "2022",
        description: "Scottish highlands and castle adventures",
    },
    {
        from: EDI, to: LHR,
        label: "EDI → LHR", fromLabel: "Edinburgh", toLabel: "London",
        color: "#3b82f6", subtitle: "2022",
        description: "Drive back down to London",
    },
    {
        from: LHR, to: DOH,
        label: "LHR → DOH", fromLabel: "London", toLabel: "Doha",
        color: "#3b82f6", subtitle: "2022",
        description: "Homeward bound — transit via Doha",
    },
    {
        from: DOH, to: MEL,
        label: "DOH → MEL", fromLabel: "Doha", toLabel: "Melbourne",
        color: "#3b82f6", subtitle: "2022",
        description: "Back to Melbourne after the UK trip",
    },

    // ── 2023 ──
    {
        from: MEL, to: HKG,
        label: "MEL → HKG", fromLabel: "Melbourne", toLabel: "Hong Kong",
        color: "#8b5cf6", subtitle: "2023",
        description: "Another Hong Kong–Kathmandu run",
    },
    {
        from: HKG, to: KTM,
        label: "HKG → KTM", fromLabel: "Hong Kong", toLabel: "Kathmandu",
        color: "#8b5cf6", subtitle: "2023",
        description: "Home visit — family and mountains",
    },
    {
        from: KTM, to: HKG,
        label: "KTM → HKG", fromLabel: "Kathmandu", toLabel: "Hong Kong",
        color: "#8b5cf6", subtitle: "2023",
        description: "Return via Hong Kong",
    },
    {
        from: HKG, to: MEL,
        label: "HKG → MEL", fromLabel: "Hong Kong", toLabel: "Melbourne",
        color: "#8b5cf6", subtitle: "2023",
        description: "Back to Australia",
    },

    // ── 2024 ──
    {
        from: MEL, to: DPS,
        label: "MEL → DPS", fromLabel: "Melbourne", toLabel: "Bali",
        color: "#ec4899", subtitle: "2024",
        description: "Tropical escape — rice terraces and sunsets",
    },
    {
        from: DPS, to: MEL,
        label: "DPS → MEL", fromLabel: "Bali", toLabel: "Melbourne",
        color: "#ec4899", subtitle: "2024",
        description: "Returning from paradise",
    },

    // ── 2025 ──
    {
        from: MEL, to: ZQN,
        label: "MEL → ZQN", fromLabel: "Melbourne", toLabel: "Queenstown",
        color: "#06b6d4", subtitle: "2025",
        description: "Adventure capital of the world — New Zealand",
    },
    {
        from: ZQN, to: MEL,
        label: "ZQN → MEL", fromLabel: "Queenstown", toLabel: "Melbourne",
        color: "#06b6d4", subtitle: "2025",
        description: "Home from the mountains and lakes",
    },
];

// ── Presets collection ───────────────────────────────────────────
export const ANIMATION_PRESETS: AnimationPreset[] = [
    {
        id: "global-trade",
        name: "Global Trade Routes",
        description: "Geopolitical trade flows between major economies",
        icon: "globe",
        routes: GLOBAL_TRADE_ROUTES,
        style: DEFAULT_STYLE,
    },
    {
        id: "my-travels",
        name: "My Travels",
        description: "Personal journey across the world, 2011–2025",
        icon: "plane",
        routes: MY_TRAVELS_ROUTES,
        style: BOLD_STYLE,
    },
];

export function getPresetById(id: string): AnimationPreset | undefined {
    return ANIMATION_PRESETS.find((p) => p.id === id);
}
