"use client";

import { useEffect, useRef, useState } from "react";

// Manually curated 2027 elite cyber thriller asset pools
const BASE_LAYERS = [
  "1526374965328-7f61d4dc18c5", // Glowing green binary matrix streams
  "1542831371-29b0f74f9713", // Multi-monitor underground hacker ops room
  "1504639725590-34d0984388bd", // High-tech development environment dark interfaces
  "1510511459019-5dda7724fd87", // Neon futuristic grid schematic dashboard
  "1614064641938-3bbee52942c7", // High-contrast encrypted security layout nodes
  "1558494949-ef010cbdcc31", // Large enterprise data center blades glowing neon blue
  "1451187580459-43490279c0fa", // Planet earth digital network matrix from orbit
  "1562813733-b31f71025d54", // Fiber optic high-speed communication packet rails
  "1635070041078-e363dbe005cb", // 3D dark quantum matrix node connections mesh
  "1504384308090-c894fdcc538d", // Tactical military surveillance drone interface asset
  "1601597111158-2fceff292cdc", // Corrupted circuit board trace macro close-up
  "1531297484001-80022131f5a1", // Pure premium modern hardware silicon microchips
];

function createStableSeed(title: string, category: string, id: string, neighborOffset: number): number {
  const combined = `${title}_${category}_${id}_${neighborOffset}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function base64Encode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : Number.NaN;
    const c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : Number.NaN;

    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (Number.isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = Number.isNaN(c2)
      ? 64
      : ((c2 & 15) << 2) | (Number.isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = Number.isNaN(c3) ? 64 : c3 & 63;

    output +=
      chars.charAt(byte1) +
      chars.charAt(byte2) +
      chars.charAt(byte3) +
      chars.charAt(byte4);
  }
  return output;
}

function getCategoryFilterUri(category: string): string {
  const norm = category
    ? category.toLowerCase().trim().replace(/[-\s]/g, "_")
    : "default";
  let colorMatrix = "0.2 0 0 0 0  0 0.3 0 0 0  0 0 0.4 0 0  0 0 0 1 0";

  if (norm === "threat_intel" || norm === "threat_intelligence") {
    // Crimson Red Tint
    colorMatrix = "0.9 0 0 0 0.1  0 0.1 0 0 0  0 0 0.1 0 0  0 0 0 1 0";
  } else if (
    norm === "vulnerabilities" ||
    norm === "vulnerability" ||
    norm === "cve" ||
    norm === "cves"
  ) {
    // Amber Laser Tint
    colorMatrix = "0.9 0 0 0 0.1  0 0.6 0 0 0.05  0 0 0.1 0 0  0 0 0 1 0";
  } else if (norm === "osint") {
    // Radar Green Tint
    colorMatrix = "0.1 0 0 0 0  0 0.9 0 0 0.1  0 0 0.1 0 0  0 0 0 1 0";
  } else if (norm === "tools" || norm === "tool") {
    // Stealth Mechanical Blue Tint
    colorMatrix = "0.1 0 0 0 0  0 0.1 0 0 0  0 0 0.9 0 0.1  0 0 0 1 0";
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><filter id="pcae"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" result="noise"/><feColorMatrix type="matrix" values="${colorMatrix}"/><feComposite operator="in" in2="SourceGraphic"/></filter></svg>`;
  return `url(data:image/svg+xml;base64,${base64Encode(svg)}#pcae)`;
}

interface CyberArticleImageProps {
  title: string;
  category: string;
  articleId: string;
  featuredImage?: string | null;
  className?: string;
  priority?: boolean;
  neighborOffset?: number;
}

export default function CyberArticleImage({
  title,
  category,
  articleId,
  featuredImage,
  className = "",
  priority = false,
  neighborOffset = 0,
}: CyberArticleImageProps) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check cache state directly on native DOM layers to circumvent edge hydration event drops
  useEffect(() => {
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth !== 0) {
        setLoaded(true);
      } else {
        if (featuredImage) setImgError(true);
      }
    }
  }, [featuredImage]);

  if (!mounted) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-950 border border-neutral-900 ${className}`}
      >
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 animate-pulse">
          <div className="flex justify-between items-center opacity-20">
            <span className="font-mono text-[8px] tracking-widest text-neutral-400">
              SYS_RECON_LOADING...
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-neutral-800 to-transparent opacity-20" />
          <span className="font-mono text-[7px] tracking-widest text-neutral-500 text-right uppercase">
            {category}
          </span>
        </div>
      </div>
    );
  }

  // Derive stable seed and PRNG values on client side
  const seed = createStableSeed(title, category, articleId, neighborOffset);
  const rand = mulberry32(seed);

  const zoom = (1.0 + rand() * 0.4).toFixed(3);
  const rotation = (-8 + rand() * 16).toFixed(2);
  const scaleX = rand() < 0.5 ? 1 : -1;

  // Resolve base photo from our 12 layers
  const basePhotoIndex = Math.abs(Math.floor(rand() * BASE_LAYERS.length));
  const basePhotoId = BASE_LAYERS[basePhotoIndex];

  // Resolve target image URL
  const proceduralUrl = `https://images.unsplash.com/photo-${basePhotoId}?auto=format&fit=crop&w=800&h=450&q=80`;
  const displaySrc =
    featuredImage && !imgError ? featuredImage : proceduralUrl;

  const filterUri = getCategoryFilterUri(category);

  // Apply transformations styling
  const imgStyle: React.CSSProperties = {
    transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${scaleX})`,
    filter: filterUri,
    transition: "transform 0.5s ease-out, filter 0.5s ease-out",
  };

  const scanlineStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 2,
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.12) 0px, rgba(0, 0, 0, 0.12) 1px, transparent 1px, transparent 3px)",
    opacity: 0.35,
  };

  return (
    <div
      className={`relative overflow-hidden bg-neutral-950 border border-neutral-900 ${className}`}
    >
      {/* 2027 System Recon Premium Shimmer Overlay Layer */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 animate-pulse">
          <div className="flex justify-between items-center opacity-20">
            <span className="font-mono text-[8px] tracking-widest text-neutral-400">
              SYS_RECON_LOADING...
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-neutral-800 to-transparent opacity-20" />
          <span className="font-mono text-[7px] tracking-widest text-neutral-500 text-right uppercase">
            {category}
          </span>
        </div>
      )}

      {/* CRT Scanline CSS Layer */}
      <div style={scanlineStyle} />

      <img
        ref={imgRef}
        src={displaySrc}
        alt={title}
        style={imgStyle}
        className={`w-full h-full object-cover transition-all duration-700 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (featuredImage) setImgError(true);
        }}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}
