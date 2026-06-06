const supabaseUrl = "https://xdfndojvqazffcjngglr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm5kb2p2cWF6ZmZjam5nZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ0MDQsImV4cCI6MjA5MzgyMDQwNH0.UGitfLsGYqQIATh6qK-uT-ZsTXpf7zFArE3QvR9JEYw";

const CATEGORY_SEARCH_THEMES = {
  'threat_intel': 'cyberpunk underground bunker server terminal command center neon glow',
  'osint': 'dark web surveillance data matrix screen extreme macro electronics hardware',
  'vulnerabilities': 'burnt smoking hardware microchip processor copper motherboard circuits',
  'tools': 'backlit stealth hacker mechanical keyboard glowing binary code terminal',
  'default': 'confidential high-contrast tactical digital warfare cyber tech dark security',
};

const AESTHETIC_MODIFIERS = 'cyberpunk dark photography neon high-contrast subtle cinematic lighting';

function normalizeCategory(category) {
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

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/articles?select=id,title,category,image_url&limit=3`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const articles = await res.json();
  console.log("Fetched articles:", articles);

  for (const article of articles) {
    const normCat = normalizeCategory(article.category);
    const baseTheme = CATEGORY_SEARCH_THEMES[normCat] ?? CATEGORY_SEARCH_THEMES['default'];
    
    const stopWords = new Set(['strategic', 'analysis', 'assessment', 'executive', 'sitrep', 'report', 'security', 'management', 'risk', 'via', 'and', 'the', 'for', 'with', 'post', 'driven']);
    const cleanKeywords = article.title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(' ')
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 2)
      .join(',');

    const finalQuery = `${baseTheme},${cleanKeywords},${AESTHETIC_MODIFIERS}`;
    const numericSeed = article.id.replace(/[^0-9]/g, '').slice(0, 4) || '42';

    console.log(`\n========================================`);
    console.log(`Article: "${article.title}"`);
    console.log(`Category: ${article.category} (Normalized: ${normCat})`);
    console.log(`Search Query: "${finalQuery}"`);
    console.log(`Seed: ${numericSeed}`);

    try {
      const apiRes = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(finalQuery)}&per_page=15`);
      const data = await apiRes.json();
      console.log(`Unsplash API results: ${data.results ? data.results.length : 0}`);

      let chosenUrl = "";
      if (data.results && data.results.length > 0) {
        const index = Number(numericSeed) % data.results.length;
        const imgObj = data.results[index];
        chosenUrl = `${imgObj.urls.raw}&w=800&h=450&fit=crop&auto=format&q=80`;
      } else {
        console.log("No results, testing base theme fallback...");
        const fallbackRes = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(`${baseTheme},${AESTHETIC_MODIFIERS}`)}&per_page=15`);
        const fallbackData = await fallbackRes.json();
        console.log(`Fallback results: ${fallbackData.results ? fallbackData.results.length : 0}`);
        if (fallbackData.results && fallbackData.results.length > 0) {
          const index = Number(numericSeed) % fallbackData.results.length;
          chosenUrl = `${fallbackData.results[index].urls.raw}&w=800&h=450&fit=crop&auto=format&q=80`;
        }
      }

      if (chosenUrl) {
        console.log(`Selected URL: ${chosenUrl}`);
        const headRes = await fetch(chosenUrl, { method: 'HEAD' });
        console.log(`Image Payload Status: ${headRes.status} (${headRes.headers.get('content-type')})`);
      } else {
        console.log("FAILED to find any dynamic URL!");
      }
    } catch (e) {
      console.error("Fetch failed:", e);
    }
  }
}

run();
