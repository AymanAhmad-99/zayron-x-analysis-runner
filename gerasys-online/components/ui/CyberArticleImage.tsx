'use client';

import { useEffect, useRef, useState } from 'react';

// Manually curated 2027 elite cyber thriller asset pools to guarantee absolute dark aesthetic control
const THEME_POOLS: Record<string, string[]> = {
  threat_intel: [
    '1526374965328-7f61d4dc18c5', // Glowing green binary matrix streams
    '1542831371-29b0f74f9713', // Multi-monitor underground hacker ops room
    '1504639725590-34d0984388bd', // High-tech development environment dark interfaces
    '1510511459019-5dda7724fd87', // Neon futuristic grid schematic dashboard
    '1614064641938-3bbee52942c7', // High-contrast encrypted security layout nodes
  ],
  osint: [
    '1558494949-ef010cbdcc31', // Large enterprise data center blades glowing neon blue
    '1451187580459-43490279c0fa', // Planet earth digital network matrix from orbit
    '1562813733-b31f71025d54', // Fiber optic high-speed communication packet rails
    '1635070041078-e363dbe005cb', // 3D dark quantum matrix node connections mesh
    '1504384308090-c894fdcc538d', // Tactical military surveillance drone interface asset
  ],
  vulnerabilities: [
    '1601597111158-2fceff292cdc', // Corrupted circuit board trace macro close-up
    '1531297484001-80022131f5a1', // Pure premium modern hardware silicon microchips
    '1617791160505-6f006e121980', // Dark fluid abstract art showing processor breakdown
    '1607799279861-4dd421887fb3', // Linux bash core kernel terminal logging outputs
    '1555066931-4365d14bab8c', // Dense raw exploit exploitation payload assembly array
  ],
  tools: [
    '1629654297299-c8506221ca97', // Cybersecurity industrial lock on glowing mechanical interface
    '1515879218367-8466d910aaa4', // Extreme close-up of dark mode python script block compilation
    '1633158829585-23ba8f7c8caf', // Dark hardware keystroke injection peripheral device
    '1563986768609-322da13575f3', // Deep digital red threat intelligence map infrastructure
    '1526374865515-51607cb72b0c', // High-contrast custom cryptographic physical arrays
  ],
  default: [
    '1618005182384-a83a8bd57fbe', // Volumetric neon ambient particle mesh lines
    '1614064642639-3c7579914738', // Encrypted hardware schematic blueprints abstract vault
    '1535320903710-d993d3d77d29', // Dark minimal luxury mainframe architecture blocks
  ],
};

function generateStableIndexedUrl(category: string, id: string): string {
  const normCategory = ['threat_intel', 'vulnerabilities', 'osint', 'tools'].includes(category)
    ? category
    : 'default';
  const pool = THEME_POOLS[normCategory] ?? THEME_POOLS.default ?? [];

  // Deterministic character hash function to guarantee absolute, unchanging image assignments per unique article
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % pool.length;
  const targetPhotoId = pool[index];

  return `https://images.unsplash.com/photo-${targetPhotoId}?auto=format&fit=crop&w=800&h=450&q=80`;
}

interface CyberArticleImageProps {
  title: string;
  category: string;
  articleId: string;
  featuredImage?: string | null;
  className?: string;
  priority?: boolean;
}

export default function CyberArticleImage({
  title,
  category,
  articleId,
  featuredImage,
  className = '',
  priority = false,
}: CyberArticleImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const displaySrc =
    featuredImage && !imgError ? featuredImage : generateStableIndexedUrl(category, articleId);

  // Check cache state directly on native DOM layers to circumvent edge hydration event drops
  useEffect(() => {
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth !== 0) {
        setLoaded(true);
      } else {
        if (displaySrc === featuredImage) setImgError(true);
      }
    }
  }, [displaySrc, featuredImage]);

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

      <img
        ref={imgRef}
        src={displaySrc}
        alt={title}
        className={`w-full h-full object-cover transition-all duration-700 ease-out transform ${loaded ? 'scale-100 opacity-100 filter brightness-90 contrast-115' : 'scale-105 opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (displaySrc === featuredImage) setImgError(true);
        }}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}
