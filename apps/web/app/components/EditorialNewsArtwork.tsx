import { newsArtLabel, newsArtMotif, newsArtRandom, newsArtSeed } from "../lib/newsArt";

/**
 * PHASE 10A-POLISH — the editorial cover artwork.
 *
 * Retina-sharp inline SVG: arcs, meshes, waveforms and grids drawn as geometry,
 * never as a bitmap font. No headline is repeated inside the artwork — the title
 * is typeset once, by the DOM, next to it. The only overlays are a category pill
 * and one entity chip, rendered with the site's real CSS typography.
 *
 * The composition is seeded by `slug|category`, so every briefing gets its own
 * arrangement while staying identical across the lead, the grid and the detail
 * hero (and across renders).
 */

type ArtProps = {
  slug: string;
  category: string;
  entity?: string | null;
  className?: string;
};

type Ctx = { rng: () => number; id: string };

const round = (value: number) => Math.round(value * 100) / 100;

function toPath(points: Array<[number, number]>): string {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join(" ");
}

function wavePoints(y: number, amplitude: number, phase: number, frequency: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let x = -24; x <= 1224; x += 12) {
    const value =
      Math.sin(x * frequency + phase) * amplitude + Math.sin(x * frequency * 2.37 + phase * 1.7) * amplitude * 0.26;
    points.push([x, y + value]);
  }
  return points;
}

/** Exploitation / KEV — precision radar: concentric arcs, sweep, focal node. */
function RadarArt({ rng }: Ctx) {
  const cx = 852 + rng() * 56;
  const cy = 296 + rng() * 62;
  const radii = [104, 166, 228, 290, 352];
  const outer = radii[radii.length - 1];
  const start = -1.16 + rng() * 0.46;
  const end = start + 0.58;
  const sweep = [
    [cx + Math.cos(start) * outer, cy + Math.sin(start) * outer] as [number, number],
    [cx + Math.cos(end) * outer, cy + Math.sin(end) * outer] as [number, number],
  ];
  const blips = Array.from({ length: 3 }, (_, index) => {
    const angle = rng() * Math.PI * 2;
    const radius = radii[1 + (index % 3)];
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  return (
    <g fill="none">
      <g stroke="#282724" strokeWidth="1">
        <line x1="360" y1={round(cy)} x2="1180" y2={round(cy)} strokeDasharray="2 10" opacity="0.55" />
        <line x1={round(cx)} y1="60" x2={round(cx)} y2="630" strokeDasharray="2 10" opacity="0.55" />
      </g>
      {radii.map((radius, index) => (
        <circle
          key={radius}
          cx={round(cx)}
          cy={round(cy)}
          r={radius}
          stroke="#282724"
          strokeWidth="1"
          opacity={round(0.9 - index * 0.14)}
        />
      ))}
      <path
        d={`M${round(cx)} ${round(cy)} L${round(sweep[0][0])} ${round(sweep[0][1])} A${outer} ${outer} 0 0 1 ${round(
          sweep[1][0],
        )} ${round(sweep[1][1])} Z`}
        fill="#ff6b00"
        fillOpacity="0.07"
      />
      <circle cx={round(cx)} cy={round(cy)} r={outer} stroke="#ff6b00" strokeOpacity="0.22" strokeDasharray="3 9" />
      <circle cx={round(cx)} cy={round(cy)} r="30" stroke="#ff6b00" strokeOpacity="0.32" />
      {blips.map((blip, index) => (
        <circle key={index} cx={round(blip.x)} cy={round(blip.y)} r="2.6" fill="#ff6b00" fillOpacity="0.75" stroke="none" />
      ))}
      <circle cx={round(cx)} cy={round(cy)} r="6.5" fill="#ff6b00" stroke="none" />
    </g>
  );
}

/** Vulnerability — a severity ladder: bars rising to one accent peak. */
function SeverityArt({ rng }: Ctx) {
  const count = 9;
  const barWidth = 62;
  const gap = 22;
  const total = count * barWidth + (count - 1) * gap;
  const startX = 1160 - total;
  const baseY = 566;
  const peak = 3 + Math.floor(rng() * 4);
  const heights = Array.from({ length: count }, (_, index) => {
    const ratio = 0.32 + rng() * 0.44 + (index === peak ? 0.24 : 0);
    return Math.min(1, ratio) * 330;
  });

  return (
    <g>
      <line x1={startX - 40} y1={baseY} x2="1180" y2={baseY} stroke="#282724" strokeWidth="1" opacity="0.8" />
      {heights.map((height, index) => {
        const x = startX + index * (barWidth + gap);
        const isPeak = index === peak;
        return (
          <g key={index}>
            <rect
              x={round(x)}
              y={round(baseY - height)}
              width={barWidth}
              height={round(height)}
              rx="3"
              fill={isPeak ? "#ff6b00" : "#161513"}
              fillOpacity={isPeak ? 0.9 : 1}
              stroke={isPeak ? "#ff6b00" : "#282724"}
              strokeOpacity={isPeak ? 0.9 : 0.8}
            />
            <rect
              x={round(x)}
              y={round(baseY - height)}
              width={barWidth}
              height="2"
              fill={isPeak ? "#ff6b00" : "#77756f"}
              fillOpacity={isPeak ? 1 : 0.55}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Malware — layered signal waveform, one accent trace. */
function WaveformArt({ rng }: Ctx) {
  const rows = 8;
  const accentRow = 3;
  const marker = 440 + rng() * 420;
  return (
    <g fill="none">
      <line x1={round(marker)} y1="80" x2={round(marker)} y2="610" stroke="#282724" strokeWidth="1" opacity="0.5" />
      {Array.from({ length: rows }, (_, row) => {
        const top = 126 + row * 62;
        const amplitude = 16 + rng() * 40;
        const phase = rng() * Math.PI * 2;
        const frequency = 0.0052 + rng() * 0.0034;
        const isAccent = row === accentRow;
        return (
          <path
            key={row}
            d={toPath(wavePoints(top, amplitude, phase, frequency))}
            stroke={isAccent ? "#ff6b00" : "#282724"}
            strokeWidth={isAccent ? 1.8 : 1}
            strokeOpacity={isAccent ? 0.85 : round(0.32 + (row % 4) * 0.11)}
          />
        );
      })}
      <circle cx={round(marker)} cy="120" r="3" fill="#ff6b00" stroke="none" />
    </g>
  );
}

/** Threat actor — constellation mesh with one focal node. */
function ConstellationArt({ rng }: Ctx) {
  const nodes = Array.from({ length: 9 }, () => ({
    x: 470 + rng() * 650,
    y: 110 + rng() * 460,
    r: 2.4 + rng() * 2.2,
  }));
  const links: Array<[number, number]> = [];
  for (let index = 1; index < nodes.length; index += 1) {
    links.push([index, index - 1]);
    if (index > 2) links.push([index, Math.floor(rng() * index)]);
  }
  const accent = 4 + Math.floor(rng() * 3);

  return (
    <g>
      <g stroke="#282724" strokeWidth="1" opacity="0.85">
        {links.map(([from, to], index) => (
          <line
            key={index}
            x1={round(nodes[from].x)}
            y1={round(nodes[from].y)}
            x2={round(nodes[to].x)}
            y2={round(nodes[to].y)}
          />
        ))}
      </g>
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={round(node.x)}
          cy={round(node.y)}
          r={round(node.r)}
          fill={index === accent ? "#ff6b00" : "#77756f"}
          fillOpacity={index === accent ? 1 : 0.75}
        />
      ))}
      <circle
        cx={round(nodes[accent].x)}
        cy={round(nodes[accent].y)}
        r={round(nodes[accent].r * 6.5)}
        fill="none"
        stroke="#ff6b00"
        strokeOpacity="0.3"
      />
    </g>
  );
}

/** Supply chain — interlocking modular matrix, one compromised link. */
function ModularArt({ rng }: Ctx) {
  const count = 5;
  const width = 116;
  const gap = 34;
  const total = count * width + (count - 1) * gap;
  const startX = 1120 - total;
  const baseY = 232 + rng() * 40;
  const compromised = Math.floor(rng() * count);

  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const x = startX + index * (width + gap);
        const y = baseY + (index % 2 === 0 ? 0 : 26);
        const isBroken = index === compromised;
        return (
          <g key={index}>
            <rect
              x={round(x)}
              y={round(y)}
              width={width}
              height="196"
              rx="14"
              fill="#111110"
              stroke={isBroken ? "#ff6b00" : "#282724"}
              strokeOpacity={isBroken ? 0.85 : 1}
            />
            <line x1={round(x + 22)} y1={round(y + 46)} x2={round(x + width - 22)} y2={round(y + 46)} stroke="#282724" />
            <line x1={round(x + 22)} y1={round(y + 74)} x2={round(x + width - 46)} y2={round(y + 74)} stroke="#282724" opacity="0.7" />
            <rect
              x={round(x + 22)}
              y={round(y + 116)}
              width={isBroken ? 46 : 30}
              height="3"
              fill={isBroken ? "#ff6b00" : "#77756f"}
              fillOpacity={isBroken ? 1 : 0.6}
            />
            {index < count - 1 ? (
              <line
                x1={round(x + width)}
                y1={round(y + 98)}
                x2={round(x + width + gap)}
                y2={round(y + 98 + (index % 2 === 0 ? 26 : -26))}
                stroke="#282724"
                strokeDasharray="3 6"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Advisory / policy — an architectural column field: document rules above a
 * horizon, a measured colonnade below it, and one accent column carrying the
 * focal point. Denser and more legible at card size than a diagonal wash.
 */
function ArchitecturalArt({ rng }: Ctx) {
  const horizon = 372 + rng() * 60;
  const startX = 404 + rng() * 74;
  const columns = 16 + Math.floor(rng() * 6);
  const step = 40 + rng() * 8;
  const accent = 3 + Math.floor(rng() * Math.max(1, columns - 6));
  const endX = startX + (columns - 1) * step;
  const accentX = startX + accent * step;
  const accentTop = horizon - (96 + rng() * 132);
  const shafts = Array.from({ length: columns }, (_, index) => 22 + rng() * 130);

  return (
    <g>
      {/* Document rules above the horizon, thinning as they rise. */}
      <g stroke="#3a3833" strokeWidth="1">
        {Array.from({ length: 7 }, (_, index) => (
          <line
            key={index}
            x1={round(startX)}
            y1={round(horizon - 30 - index * 42)}
            x2={round(endX)}
            y2={round(horizon - 30 - index * 42)}
            opacity={round(0.85 - index * 0.1)}
          />
        ))}
      </g>
      {/* The colonnade: measured shafts of varying depth below the horizon. */}
      <g strokeWidth="1.5">
        {shafts.map((shaft, index) => (
          <line
            key={index}
            x1={round(startX + index * step)}
            y1={round(horizon)}
            x2={round(startX + index * step)}
            y2={round(horizon + shaft)}
            stroke={index === accent ? "#ff6b00" : "#403d38"}
            strokeOpacity={index === accent ? 0.95 : round(0.6 + (index % 3) * 0.13)}
          />
        ))}
      </g>
      {/* Horizon rule + the accent column that breaks it. */}
      <line x1={round(startX - 26)} y1={round(horizon)} x2={round(Math.min(1180, endX + 34))} y2={round(horizon)} stroke="#403d38" strokeWidth="1" />
      <line x1={round(accentX)} y1={round(accentTop)} x2={round(accentX)} y2={round(horizon + 168)} stroke="#ff6b00" strokeWidth="2" strokeOpacity="0.9" />
      <circle cx={round(accentX)} cy={round(accentTop)} r="4" fill="#ff6b00" />
      <circle cx={round(accentX)} cy={round(accentTop)} r="14" fill="none" stroke="#ff6b00" strokeOpacity="0.28" />
      {/* One soft light streak keeps the surface lit without a brown wash. */}
      <g stroke="#ff6b00" strokeWidth="2" strokeOpacity="0.1">
        <line x1="900" y1="675" x2="1240" y2="60" />
        <line x1="944" y1="675" x2="1284" y2="60" />
      </g>
      {/* Corner bracket — the document frame. */}
      <path d="M 1096 62 h 76 v 76" fill="none" stroke="#282724" strokeWidth="1" strokeOpacity="0.85" />
    </g>
  );
}

function motifArt(motif: ReturnType<typeof newsArtMotif>, ctx: Ctx) {
  switch (motif) {
    case "KEV":
      return <RadarArt {...ctx} />;
    case "VULNERABILITY":
      return <SeverityArt {...ctx} />;
    case "MALWARE":
      return <WaveformArt {...ctx} />;
    case "ACTOR":
      return <ConstellationArt {...ctx} />;
    case "SUPPLY_CHAIN":
      return <ModularArt {...ctx} />;
    default:
      return <ArchitecturalArt {...ctx} />;
  }
}

export function EditorialNewsArtwork({ slug, category, entity = null, className = "" }: ArtProps) {
  const motif = newsArtMotif(category);
  const seed = newsArtSeed(`${slug}|${category}`);
  const rng = newsArtRandom(seed);
  const id = `ena${seed.toString(36)}`;
  const glowX = 62 + (seed % 22);
  const glowY = 8 + (seed % 16);
  const label = newsArtLabel(category);

  return (
    <figure className={`ena ena-${motif.toLowerCase()}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <div className="ena-ambient" />
      <svg className="ena-art" viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" focusable="false" role="presentation">
        <defs>
          <radialGradient id={`${id}-glow`} cx={`${glowX}%`} cy={`${glowY}%`} r="58%">
            <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.11" />
            <stop offset="48%" stopColor="#ff6b00" stopOpacity="0.035" />
            <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="52%" stopColor="#050505" stopOpacity="0" />
            <stop offset="100%" stopColor="#050505" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="1200" height="675" fill="#050505" />
        <rect width="1200" height="675" fill={`url(#${id}-glow)`} />
        {motifArt(motif, { rng, id })}
        <rect width="1200" height="675" fill={`url(#${id}-fade)`} opacity="0.6" />
      </svg>
      <span className="ena-pill">{label}</span>
      {entity ? (
        <span className="ena-chip" title={entity}>
          {entity}
        </span>
      ) : null}
    </figure>
  );
}
