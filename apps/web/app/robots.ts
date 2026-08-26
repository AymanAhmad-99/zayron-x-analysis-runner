import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/alerts', '/watchlists', '/search', '/api/'],
    },
    sitemap: 'https://zayron-x.co/sitemap.xml',
  };
}
