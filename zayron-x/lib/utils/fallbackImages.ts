// ============================================================
// ZAYRON-X — Smart Fallback Image Router
// Deterministic, category/tag-aware image resolution.
// Never shows a broken image. Zero-cost DALL-E alternative.
// ============================================================

interface ArticleLike {
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

/* ─── Tier 1: Category Enum → Premium Hero Images ─── */
const CATEGORY_IMAGES: Record<string, string> = {
  vulnerabilities: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  threat_intel: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  osint: 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=1200&q=80',
  cyber_news: 'https://images.unsplash.com/photo-1614064642639-3c7579914738?w=1200&q=80',
};

/* ─── Tier 2: Tag → Image (checked before keyword fuzzy match) ─── */
const TAG_IMAGES: Record<string, string> = {
  cve: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=1200&q=80',
  apt: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
  ransomware: 'https://images.unsplash.com/photo-1614064647598-0fe6ae3ea118?w=1200&q=80',
  malware: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80',
  exploit: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  phishing: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=1200&q=80',
  'zero-day': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  zeroday: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  osint: 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=1200&q=80',
  sigint: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  'threat-intelligence': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  'data-breach': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  'supply-chain': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  cloud: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  iot: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=1200&q=80',
  blockchain: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&q=80',
  'ai-security': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  ml: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  python: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80',
  'secure-coding': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'network-security': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  forensics: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80',
  'incident-response': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  compliance: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
};

/* ─── Tier 3: Category keyword → Image (sub-category fuzzy match) ─── */
const KEYWORD_IMAGES: Record<string, string> = {
  ransomware: 'https://images.unsplash.com/photo-1614064647598-0fe6ae3ea118?w=1200&q=80',
  malware: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80',
  apt: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
  'data-breach': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  'data breach': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
  cves: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=1200&q=80',
  'nation-state': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  'nation state': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  'ai-security': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  'ai security': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  'secure-coding': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'secure coding': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  rust: 'https://images.unsplash.com/photo-1515879218367-8466d910auj7?w=1200&q=80',
  'python-security': 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80',
  'python security': 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80',
  'go-automation': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1200&q=80',
  'go automation': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1200&q=80',
  'security-toolchain': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'security toolchain': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'protocol-deep-dives': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'protocol deep dives': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'network-hardening': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'network hardening': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'infrastructure-security':
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'infrastructure security':
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'packet-analysis': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80',
  'packet analysis': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80',
};

/* ─── Light minimalist wireframe placeholder — Built by human engineers for C-level ─── */
const ZX_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="%23FAFAFA"/>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23F3F4F6" stroke-width="1"/>
    </pattern>
    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="0.75" fill="%23E5E7EB"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="url(%23grid)"/>
  <rect width="1200" height="675" fill="url(%23dots)"/>
  <path d="M 0 0 L 1200 0 L 1200 675 L 0 675 Z" fill="none" stroke="%23E5E7EB" stroke-width="1"/>
</svg>`;

const DEFAULT_IMAGE = `data:image/svg+xml,${ZX_PLACEHOLDER_SVG}`;

/* ─── Resolution Pipeline ─── */

function normalize(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function matchFromMap(needle: string, map: Record<string, string>): string | null {
  const key = normalize(needle);
  if (map[key]) return map[key];
  for (const [k, url] of Object.entries(map)) {
    if (key.includes(k)) return url;
  }
  return null;
}

/**
 * Deterministic, multi-tier fallback image router.
 * Tier 1: article.imageUrl (real image)
 * Tier 2: category enum exact match
 * Tier 3: tag-based match (higher signal than fuzzy category)
 * Tier 4: category keyword fuzzy match
 * Tier 5: Zx branded placeholder SVG
 */
export function getSmartFallbackImage(article: ArticleLike): string {
  // Tier 1 — real image
  if (article.imageUrl) return article.imageUrl;

  // B2B Enterprise Posture: bypass all stock photography fallbacks
  // and always return the beautiful, minimalist white-space wireframe structural plan.
  return DEFAULT_IMAGE;
}

/**
 * @deprecated Use getSmartFallbackImage instead.
 */
export function getArticleImage(article: ArticleLike): string {
  return getSmartFallbackImage(article);
}
