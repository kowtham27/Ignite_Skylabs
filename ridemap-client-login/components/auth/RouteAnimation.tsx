"use client";

import { Minus, Plus } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

const W = 560;
const H = 360;

// Palette: flat, desaturated map tones so only the route and bus carry colour.
const C = {
  land: "#171c23",
  block: "#1e242c",
  blockEdge: "#232a33",
  park: "#1b2620",
  tree: "#22322a",
  water: "#172330",
  waterEdge: "#1d2c3b",
  road: "#2a313a",
  roadMajor: "#313943",
  label: "rgba(255,255,255,0.32)",
  casing: "#0d1116",
};

/** Roads as straight segments with a slight skew, like a real street grid. */
const ROADS = {
  hosur: "M-10 250.6 L570 213.4",
  hostel: "M-10 172.2 L570 159.8",
  college: "M-10 110.3 L570 95.8",
  firstCross: "M149.7 -10 L162.3 370",
  library: "M317.7 -10 L330.3 370",
  fifthCross: "M469.8 -10 L478.2 370",
};

/**
 * The bus route snaps to the road network:
 * Depot → east on Hosur Rd → north on 1st Cross → east on Hostel Rd →
 * north on Library Rd → east on College Rd → Admin Block.
 */
const ROUTE = "M40 247.4 L158 239.8 L155.6 168.6 L323.5 165.1 L321.4 102 L474 98.2";

const STOPS = [
  { x: 100, y: 243.6, name: "Main Gate", eta: "2 min", labelDx: 0, labelDy: 16 },
  { x: 240, y: 166.9, name: "Hostel Block", eta: "4 min", labelDx: 0, labelDy: -10 },
  { x: 400, y: 100, name: "Library", eta: "6 min", labelDx: 0, labelDy: 17 },
];

const DEST = { x: 474, y: 98.2 };

const BLOCKS = [
  "8,8 70,8 68,94 8,97",
  "80,8 140,8 142,93 78,95",
  "172,8 240,8 242,91 173,93",
  "252,8 309,8 311,89 254,90",
  "488,8 552,8 552,85 490,87",
  "8,123 145,119 146,159 8,164",
  "170,115 250,113 251,155 171,157",
  "262,113 312,111 313,153 263,155",
  "488,107 552,105 553,150 489,152",
  "8,183 145,177 146,228 8,236",
  "170,178 238,176 240,225 171,229",
  "250,176 314,174 316,219 252,223",
  "338,175 464,171 466,210 339,215",
  "488,168 552,166 552,204 489,208",
  "8,263 70,258 72,352 8,352",
  "82,257 150,252 153,352 84,352",
  "338,238 404,234 406,352 340,352",
  "416,233 466,230 470,352 418,352",
  "486,228 552,224 552,352 488,352",
];

const TREES: [number, number, number][] = [
  [186, 262, 5], [204, 276, 7], [226, 262, 4.5], [250, 284, 6], [196, 300, 5.5],
  [280, 262, 5], [296, 296, 7], [270, 318, 5], [224, 326, 6.5], [300, 334, 4.5],
  [356, 22, 5], [380, 40, 6], [420, 24, 4.5], [446, 60, 5.5], [364, 70, 4.5],
];

function RoadLabel({ x, y, angle, children }: { x: number; y: number; angle: number; children: string }) {
  return (
    <text
      x={x}
      y={y}
      transform={`rotate(${angle} ${x} ${y})`}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="6.5"
      fontWeight="600"
      letterSpacing="1.4"
      fill={C.label}
    >
      {children}
    </text>
  );
}

/** Flat, cartographic live-tracking map: the bus follows real streets between labelled stops. */
export function RouteAnimation() {
  const reduceMotion = usePrefersReducedMotion();
  const motion = (rotate?: "auto") =>
    reduceMotion ? null : (
      <animateMotion dur="14s" repeatCount="indefinite" path={ROUTE} rotate={rotate} calcMode="linear" />
    );

  return (
    <div className="relative aspect-[14/9] w-full overflow-hidden rounded-card" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none">
        <rect width={W} height={H} fill={C.land} />

        {/* Blocks, playground, lake */}
        {BLOCKS.map((pts) => (
          <polygon key={pts} points={pts} fill={C.block} stroke={C.blockEdge} strokeWidth="1" />
        ))}
        <polygon points="170,250 318,240 322,352 172,352" fill={C.park} />
        <polygon points="342,10 460,8 462,86 420,88 344,90" fill={C.park} />
        {TREES.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={C.tree} />
        ))}
        <path
          d="M352 121 C 372 110 418 111 444 122 C 461 131 456 149 431 152 C 401 156 362 152 351 140 C 346 133 347 125 352 121 Z"
          fill={C.water}
          stroke={C.waterEdge}
        />
        <text x="400" y="134" textAnchor="middle" fontSize="7" fontStyle="italic" fill="rgba(120,160,200,0.45)">
          Campus Lake
        </text>

        {/* Roads */}
        {[ROADS.hostel, ROADS.college, ROADS.firstCross, ROADS.library, ROADS.fifthCross].map((d) => (
          <path key={d} d={d} stroke={C.road} strokeWidth="10" />
        ))}
        <path d={ROADS.hosur} stroke={C.roadMajor} strokeWidth="15" />
        <path d={ROADS.hosur} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="8 7" />

        <RoadLabel x={430} y={222.5} angle={-3.7}>HOSUR ROAD</RoadLabel>
        <RoadLabel x={236} y={104.2} angle={-1.5}>COLLEGE ROAD</RoadLabel>
        <RoadLabel x={420} y={163.3} angle={-1.3}>HOSTEL RD</RoadLabel>
        <RoadLabel x={159.3} y={300} angle={88.1}>1ST CROSS</RoadLabel>
        <RoadLabel x={327.7} y={290} angle={88.1}>LIBRARY RD</RoadLabel>

        {/* Route: dark casing + solid line, like a navigation app */}
        <path d={ROUTE} stroke={C.casing} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
        <path
          d={ROUTE}
          pathLength={1}
          className="rm-route-draw"
          stroke="#a7e92f"
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Depot */}
        <circle cx="40" cy="247.4" r="5" fill={C.casing} stroke="#a7e92f" strokeWidth="2" />
        <text x="40" y="266" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="rgba(255,255,255,0.55)">
          Depot
        </text>

        {/* Stops: transit-style dots with haloed labels */}
        {STOPS.map((s) => (
          <g key={s.name}>
            <circle cx={s.x} cy={s.y} r="4.5" fill="white" stroke={C.casing} strokeWidth="2" />
            <text
              x={s.x + s.labelDx}
              y={s.y + s.labelDy}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="rgba(255,255,255,0.85)"
              stroke={C.land}
              strokeWidth="3"
              paintOrder="stroke"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* Destination */}
        <g transform={`translate(${DEST.x} ${DEST.y})`}>
          <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#a7e92f" stroke={C.casing} strokeWidth="2" />
          <path d="M-4.5 -0.5 L0 -4.5 L4.5 -0.5 M-3 -1 V4 H3 V-1" stroke={C.casing} strokeWidth="1.5" strokeLinejoin="round" />
          <text
            y="20"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#a7e92f"
            stroke={C.land}
            strokeWidth="3"
            paintOrder="stroke"
          >
            Admin Block
          </text>
        </g>

        {/* Bus: top-down body turns with the road */}
        <g transform={reduceMotion ? "translate(240 166.9)" : undefined}>
          {motion("auto")}
          <ellipse cx="1" cy="2" rx="12" ry="7.5" fill="black" fillOpacity="0.35" />
          <rect x="-11" y="-6.5" width="22" height="13" rx="3" fill="#a7e92f" stroke={C.casing} strokeWidth="1.5" />
          <rect x="5.5" y="-5" width="3.5" height="10" rx="1" fill={C.casing} fillOpacity="0.85" />
          <rect x="-8" y="-3.5" width="11" height="7" rx="1.2" fill={C.casing} fillOpacity="0.14" />
        </g>
        {/* Route-number tag follows the bus but stays upright */}
        <g transform={reduceMotion ? "translate(240 166.9)" : undefined}>
          {motion()}
          <g transform="translate(0 -19)">
            <rect x="-10" y="-7" width="20" height="13" rx="3" fill={C.casing} stroke="#a7e92f" strokeOpacity="0.6" />
            <text y="2.6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#a7e92f">
              12
            </text>
          </g>
        </g>

        {/* Scale bar */}
        <g transform="translate(14 318)" stroke="rgba(255,255,255,0.4)" strokeWidth="1">
          <path d="M0 0 V4 H40 V0" />
          <text x="46" y="5" fontSize="7" fill="rgba(255,255,255,0.45)" stroke="none">
            200 m
          </text>
        </g>
      </svg>

      {/* Route card */}
      <div className="absolute left-3 top-3 rounded-lg border border-white/[0.08] bg-[#11151b]/95 px-3 py-2 shadow-md">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rm-lime">
          <span className="h-1.5 w-1.5 rounded-full bg-rm-lime" />
          Live
        </p>
        <p className="mt-0.5 text-xs font-semibold text-rm-text">Route 12 · Morning pickup</p>
      </div>

      {/* Zoom */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#11151b]/95 text-rm-muted shadow-md">
        <span className="flex h-7 w-7 items-center justify-center border-b border-white/[0.08]">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center">
          <Minus className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* ETA callout pointing at the Library stop */}
      <div
        className="absolute -translate-x-1/2 -translate-y-full"
        style={{ left: `${(400 / W) * 100}%`, top: `calc(${(100 / H) * 100}% - 9px)` }}
      >
        <div className="rounded-md bg-[#f4f6f8] px-2 py-1 text-[11px] font-bold leading-none text-[#11151b] shadow-md">
          6 min
        </div>
        <div className="mx-auto h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#f4f6f8]" />
      </div>

      {/* Hoverable stops */}
      {STOPS.map((s) => (
        <div
          key={s.name}
          className="group absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-default"
          style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%` }}
        >
          <span className="absolute inset-2 rounded-full border-2 border-rm-lime opacity-0 transition duration-200 group-hover:opacity-100" />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-[#11151b] px-2.5 py-1.5 text-center opacity-0 shadow-lg ring-1 ring-white/10 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="block text-[11px] font-semibold">{s.name}</span>
            <span className="block text-[10px] text-rm-muted">Arrives in {s.eta}</span>
          </span>
        </div>
      ))}

      {/* Next-stop sheet */}
      <div className="absolute bottom-3 right-3 w-52 rounded-lg border border-white/[0.08] bg-[#11151b]/95 px-3 py-2.5 shadow-md">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider text-rm-muted">Next stop</p>
          <p className="text-[10px] text-rm-muted">08:42 AM</p>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <p className="text-sm font-semibold">Hostel Block</p>
          <p className="text-sm font-bold text-rm-lime">4 min</p>
        </div>
        <div className="mt-2 flex items-center">
          {/* Main Gate (passed) → Hostel Block (next) → Library → Admin Block */}
          {(["done", "next", "todo", "todo"] as const).map((state, i) => (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  state === "done" ? "bg-rm-lime" : state === "next" ? "border-2 border-rm-lime" : "border border-white/30"
                }`}
              />
              {i < 3 && <span className={`h-px flex-1 ${state === "done" ? "bg-rm-lime" : "bg-white/15"}`} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
