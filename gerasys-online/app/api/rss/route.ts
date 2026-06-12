import { getRecentArticles } from '@/lib/supabase/queries/articles';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // 1 hour

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zayron-x.com';

  let articles: Awaited<ReturnType<typeof getRecentArticles>> = [];
  try {
    articles = await getRecentArticles(20);
  } catch {
    // DB unavailable — return empty feed
  }

  const buildDate = new Date().toUTCString();

  const items = articles
    .map((a) => {
      const url = `${siteUrl}/intelligence/${(a.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${a.slug}`;
      const pubDate = a.createdAt ? new Date(a.createdAt).toUTCString() : buildDate;
      const desc = escapeXml(a.excerpt ?? a.content.substring(0, 300));
      const title = escapeXml(a.title);
      const cat = escapeXml(a.category ?? 'Intelligence');

      return `    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${cat}</category>
      <description>${desc}</description>
      <author>intelligence@zayron-x.com (${escapeXml(a.author ?? 'Zayron Intel')})</author>
      ${a.imageUrl ? `<enclosure url="${escapeXml(a.imageUrl)}" type="image/jpeg" length="0" />` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ZAYRON-X — Cyber Threat Intelligence</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml" />
    <description>Nation-state grade cyber threat intelligence. Real-time CVE tracking, APT analysis, and global threat reporting from 60+ monitored channels.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <managingEditor>intelligence@zayron-x.com (ZAYRON-X)</managingEditor>
    <ttl>60</ttl>
    <image>
      <url>${siteUrl}/logo.svg</url>
      <title>ZAYRON-X</title>
      <link>${siteUrl}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
    },
  });
}
