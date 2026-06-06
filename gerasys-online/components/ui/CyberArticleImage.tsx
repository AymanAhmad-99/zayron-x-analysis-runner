"use client";

import { useState, useEffect, useRef } from 'react';

const CATEGORY_THEMES: Record<string, string> = {
  'threat_intel': 'dramatic overhead military spy photography of an underground cyber operations command bunker, glowing crimson warning monitors, tactical terminal screens flashing breach payloads',
  'osint': 'forensic extreme macro close-up of a shattered tactical smartphone screen lying on a cold stainless steel table, reflecting cascading green encrypted code arrays and decrypted data profiles',
  'vulnerabilities': 'hyper-detailed award-winning macro shot of a melted corporate server silicon microchip on a smoking hardware motherboard, sharp amber laser grid lines cutting through volumetric fog',
  'tools': 'high-contrast dramatic close-up of a backlit stealth mechanical hacker keyboard drenched in shifting binary code reflections, a custom black offensive hardware injection device attached to the side interface port',
  'default': 'cyber warfare classification dark chamber, high-contrast matrix server racks, cinematic suspense mood, sharp focus, volumetric dust particles',
};

function normalizeCategory(category: string): string {
  if (!category) return 'default';
  const c = category.toLowerCase().trim().replace(/[-\s]/g, '_');
  if (c === 'threat_intel' || c === 'threat_intelligence' || c === 'cyber_news' || c === 'cybersecurity') {
    return 'threat_intel';
  }
  if (c === 'vulnerabilities' || c === 'vulnerability' || c === 'cves' || c === 'cve') {
    return 'vulnerabilities';
  }
  if (c === 'osint') {
    return 'osint';
  }
  if (c === 'tools' || c === 'tool' || c === 'programming' || c === 'networking') {
    return 'tools';
  }
  return 'default';
}

function generateImageUrl(title: string, category: string, id: string): string {
  const normCategory = normalizeCategory(category);
  const themePrompt = CATEGORY_THEMES[normCategory] ?? CATEGORY_THEMES['default'];
  
  // 1. Clean and completely purge boilerplate words to prevent uniform collapse
  const stopWords = new Set(['strategic', 'analysis', 'assessment', 'executive', 'sitrep', 'report', 'security', 'management', 'risk', 'via', 'and', 'the', 'for', 'with']);
  const cleanKeywords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 4)
    .join(' ');

  // 2. Inject cryptographic noise string directly inside the prompt sentence text to break uniformity
  const cryptoNoise = `environmental data stream node signature hex alpha ${(id ?? '').slice(0, 8)}`;
  
  const fullPrompt = `${themePrompt}, target vector focused on [${cleanKeywords}], architectural cryptography fingerprint [${cryptoNoise}], ultra-detailed corporate threat asset photography, 8k resolution, cinematic lighting, octane render, sharp focus --v 6.0`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=450&nologo=true&enhance=true`;
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
  const imgRef = useRef<HTMLImageElement>(null);

  const normCategory = normalizeCategory(category);
  const displaySrc = (featuredImage && !imgError) ? featuredImage : generateImageUrl(title, normCategory, articleId);

  // Reset states on src change to support dynamic transitions
  useEffect(() => {
    setLoaded(false);
    setImgError(false);
  }, [displaySrc]);

  // Handle cached images: check complete status natively
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      setLoaded(true);
    }
  }, [displaySrc]);

  return (
    <div className={`relative overflow-hidden bg-neutral-950 border border-neutral-900 ${className}`}>
      {/* 2027 Premium Animated Skeleton Shimmer Layer */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 animate-pulse">
          <div className="flex justify-between items-center opacity-30">
            <span className="font-mono text-[8px] tracking-widest text-neutral-400">SYS_RECON_LOADING...</span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
          <span className="font-mono text-[7px] tracking-widest text-neutral-500 text-right uppercase">{normCategory}</span>
        </div>
      )}

      <img
        ref={imgRef}
        src={displaySrc}
        alt={title}
        className={`w-full h-full object-cover transition-all duration-700 ease-out transform ${loaded ? 'scale-100 opacity-100 filter brightness-90 contrast-110' : 'scale-105 opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (displaySrc === featuredImage) {
            setImgError(true);
          }
        }}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}
