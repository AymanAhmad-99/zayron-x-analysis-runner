import { getAllArticleSlugs, getCategoriesWithCounts } from "@/lib/db/queries/articles";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zayron-x.com";

export default async function sitemap() {
  let allArticles: Array<{ slug: string; category: string | null }> = [];
  let categories: Array<{ category: string; count: number }> = [];
  try {
    const [articles, cats] = await Promise.all([
      getAllArticleSlugs(5000),
      getCategoriesWithCounts(),
    ]);
    allArticles = articles;
    categories = cats;
  } catch (e) {
    console.error("sitemap DB fetch failed:", e);
  }

  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 1.0 },
    { url: `${SITE_URL}/cve`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${SITE_URL}/tools`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE_URL}/analysts`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
  ];

  const articlePages = allArticles.map(({ slug, category }) => {
    const cat = (category ?? "intelligence")
      .toLowerCase()
      .replace(/\s+/g, "-");
    return {
      url: `${SITE_URL}/intelligence/${cat}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const categoryPages = categories.map((cat) => ({
    url: `${SITE_URL}/intelligence/${cat.category.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...articlePages, ...categoryPages];
}
