"use client";

import { useState, useEffect, useRef } from 'react';

const CATEGORY_THEMES: Record<string, string> = {
  'threat_intel': 'dramatic overhead military spy photography of an underground cyber operations command bunker, glowing crimson warning monitors, tactical terminal screens flashing breach payloads',
  'osint': 'forensic extreme macro close-up of a shattered tactical smartphone screen lying on a cold stainless steel table, reflecting cascading green encrypted code arrays and decrypted data profiles',
  'vulnerabilities': 'hyper-detailed award-winning macro shot of a melted corporate server silicon microchip on a smoking hardware motherboard, sharp amber laser grid lines cutting through volumetric fog',
  'tools': 'high-contrast dramatic close-up of a backlit stealth mechanical hacker keyboard drenched in shifting binary code reflections, a custom black offensive hardware injection device attached to the side interface port',
  'default': 'cyber warfare classification dark chamber, high-contrast matrix server racks, cinematic suspense mood, sharp focus, volumetric dust particles',
};

const UNSPLASH_FALLBACKS: Record<string, string> = {
  'threat_intel': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  'vulnerabilities': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  'osint': 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&q=80',
  'tools': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
};

const SVG_GRID_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23050505"/><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="%23151515" stroke-width="0.5"/></pattern></defs><rect width="800" height="450" fill="url(%23grid)"/><line x1="0" y1="0" x2="800" y2="450" stroke="%231e1b4b" stroke-width="0.5" opacity="0.3"/><line x1="800" y1="0" x2="0" y2="450" stroke="%231e1b4b" stroke-width="0.5" opacity="0.3"/></svg>`;

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
  
  const stopWords = new Set(['strategic', 'analysis', 'assessment', 'executive', 'sitrep', 'report', 'security', 'management', 'risk', 'via', 'and', 'the', 'for', 'with']);
  const cleanKeywords = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 4)
    .join(' ') || 'cyber operations';

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
  const [sourceTier, setSourceTier] = useState<'featured' | 'ai' | 'unsplash' | 'svg'>('featured');
  const imgRef = useRef<HTMLImageElement>(null);

  const normCategory = normalizeCategory(category);

  // Initialize or reset source tier based on featured image availability
  useEffect(() => {
    if (featuredImage) {
      setSourceTier('featured');
    } else {
      setSourceTier('ai');
    }
    setLoaded(false);
  }, [featuredImage, title, category, articleId]);

  // Determine display source based on current active tier
  let displaySrc = '';
  if (sourceTier === 'featured') {
    displaySrc = featuredImage || '';
  } else if (sourceTier === 'ai') {
    displaySrc = generateImageUrl(title, normCategory, articleId);
  } else if (sourceTier === 'unsplash') {
    displaySrc = UNSPLASH_FALLBACKS[normCategory] ?? UNSPLASH_FALLBACKS['default'] ?? '';
  } else {
    displaySrc = SVG_GRID_PLACEHOLDER;
  }

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !displaySrc) return;

    let active = true;

    const handleLoad = () => {
      if (!active) return;
      setLoaded(true);
    };

    const handleError = () => {
      if (!active) return;
      // Advance to next tier on failure
      setSourceTier((prev) => {
        if (prev === 'featured') return 'ai';
        if (prev === 'ai') return 'unsplash';
        return 'svg';
      });
      setLoaded(false);
    };

    // Native tracking checks for cached/immediate delivery
    if (img.complete) {
      if (img.naturalWidth > 0) {
        handleLoad();
      } else {
        handleError();
      }
    }

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      active = false;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
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
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}
