import Image from 'next/image';
import { useState } from 'react';

const CATEGORY_PROMPTS: Record<string, string> = {
  'threat_intel': 'cyber threat intelligence dark holographic network map glowing red nodes',
  'osint': 'dark web reconnaissance deep internet tunnel neon blue surveillance',
  'vulnerabilities': 'vulnerability analysis binary code explosion red orange technical',
  'tools': 'cyber operations command center digital warfare matrix green code',
  'default': 'cybersecurity abstract digital fortress dark technology futuristic',
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

function generateImageUrl(title: string, category: string, seed: string): string {
  const normCategory = normalizeCategory(category);
  const categoryPrompt = CATEGORY_PROMPTS[normCategory] ?? CATEGORY_PROMPTS['default'];
  const titleKeywords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 5).join(' ');
  const fullPrompt = `${categoryPrompt} ${titleKeywords} cinematic dark professional`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const numericSeed = (seed ?? '').replace(/[^a-f0-9]/g, '').slice(0, 8);
  const seedNumber = parseInt(numericSeed, 16) || 42;
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=450&seed=${seedNumber}&nologo=true&enhance=true`;
}

function CyberFallbackSVG({ category }: { category: string }) {
  const colors: Record<string, [string, string, string]> = {
    'threat_intel':    ['#0f1923', '#ff3366', '#ff6b35'],
    'osint':           ['#0a0f1e', '#00d4ff', '#0066ff'],
    'tools':           ['#0a1a0a', '#00ff88', '#00cc44'],
    'vulnerabilities': ['#1a0a0a', '#ff6600', '#ff3300'],
    'default':          ['#0f0f1a', '#4444ff', '#2222cc'],
  };
  const normCategory = normalizeCategory(category);
  const [bg, c1, c2] = (colors[normCategory] ?? colors['default']) as [string, string, string];
  const id = `grad-${normCategory}`;
  const displayLabel = normCategory === 'default' ? 'CYBERSECURITY' : normCategory.toUpperCase().replace('_', ' ');

  return (
    <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={bg} />
          <stop offset="50%" stopColor={c1} stopOpacity="0.3" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill={`url(#${id})`} />
      {Array.from({ length: 12 }, (_, i) => Array.from({ length: 7 }, (_, j) => (
        <circle key={`${i}-${j}`} cx={i * 70 + 25} cy={j * 70 + 25} r="1.5" fill={c1} opacity="0.4" />
      )))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`h-${i}`} x1="0" y1={i * 90 + 45} x2="800" y2={i * 90 + 45} stroke={c1} strokeWidth="0.5" opacity="0.15" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v-${i}`} x1={i * 100 + 50} y1="0" x2={i * 100 + 50} y2="450" stroke={c1} strokeWidth="0.5" opacity="0.15" />
      ))}
      <circle cx="400" cy="225" r="80" fill="none" stroke={c1} strokeWidth="1" opacity="0.3" />
      <circle cx="400" cy="225" r="50" fill="none" stroke={c2} strokeWidth="0.5" opacity="0.5" />
      <circle cx="400" cy="225" r="8" fill={c1} opacity="0.8" />
      <text x="400" y="340" textAnchor="middle" fill={c1} fontSize="11" fontFamily="monospace" opacity="0.6" letterSpacing="4">
        {displayLabel}
      </text>
    </svg>
  );
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
  const [imgError, setImgError] = useState(false);
  const [aiError, setAiError] = useState(false);

  if (featuredImage && !imgError) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={featuredImage} alt={title} fill className="object-cover" priority={priority} onError={() => setImgError(true)} />
      </div>
    );
  }

  const normalizedCat = normalizeCategory(category);

  if (!aiError) {
    const aiUrl = generateImageUrl(title, normalizedCat, articleId);
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={aiUrl} alt={title} className="w-full h-full object-cover" onError={() => setAiError(true)} loading={priority ? 'eager' : 'lazy'} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <CyberFallbackSVG category={normalizedCat} />
    </div>
  );
}
