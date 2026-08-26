import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://zayron-x.co';

  // Core static routes
  const staticRoutes = [
    '',
    '/threats',
    '/intelligence',
    '/vulnerabilities',
    '/actors',
    '/malware',
    '/campaigns',
    '/iocs',
    '/reports',
    '/knowledge',
    '/sources',
    '/regulations',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));


  // Fetch dynamic articles and threats from the API
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [articlesRes, threatsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/articles`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/v1/feed`, { next: { revalidate: 3600 } }),
    ]);

    if (articlesRes.ok) {
      const articlesData = await articlesRes.json();
      const articles = articlesData?.data || [];
      const articleRoutes = articles.map((article: any) => ({
        url: `${baseUrl}/articles/${article.slug}`,
        lastModified: new Date(article.updated_at || article.published_at || new Date()),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
      dynamicRoutes = [...dynamicRoutes, ...articleRoutes];
    }

    if (threatsRes.ok) {
      const threatsData = await threatsRes.json();
      const threats = threatsData?.data || [];
      const threatRoutes = threats.map((threat: any) => ({
        url: `${baseUrl}/threats/${threat.id}`,
        lastModified: new Date(threat.last_updated_at || threat.first_seen_at || new Date()),
        changeFrequency: 'hourly' as const,
        priority: 0.9,
      }));
      dynamicRoutes = [...dynamicRoutes, ...threatRoutes];
    }
  } catch (err) {
    console.error('Failed to fetch dynamic routes for sitemap', err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
