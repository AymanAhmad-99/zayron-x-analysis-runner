import { eq, desc, and, like, or, not, ilike, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { articles } from '../schema';
import type { Article } from '@zayron/types';

function mapArticle(dbArticle: any): Article {
  if (!dbArticle) return null as any;
  return {
    id: dbArticle.id,
    title: dbArticle.title,
    slug: dbArticle.slug,
    urlHash: dbArticle.urlHash,
    subtitle: dbArticle.subtitle,
    author: dbArticle.author,
    category: dbArticle.category,
    tags: dbArticle.tags ? JSON.parse(dbArticle.tags) : [],
    content: dbArticle.content,
    excerpt: dbArticle.excerpt,
    imageUrl: dbArticle.imageUrl,
    image_url: dbArticle.imageUrl,
    readTime: dbArticle.readTime,
    views: dbArticle.views,
    isPublished: dbArticle.isPublished,
    isFeatured: dbArticle.isFeatured,
    isBreaking: dbArticle.isBreaking,
    financialExposure: dbArticle.financialExposure,
    regulatoryRisk: dbArticle.regulatoryRisk,
    mitigationImpact: dbArticle.mitigationImpact,
    yaraRule: dbArticle.yaraRule,
    imageTag: dbArticle.imageTag,
    fbrScore: dbArticle.fbrScore,
    mitreTtps: dbArticle.mitreTtps ? JSON.parse(dbArticle.mitreTtps) : [],
    iocsJson: dbArticle.iocsJson ? JSON.parse(dbArticle.iocsJson) : null,
    sourceChannel: dbArticle.sourceChannel,
    cvssV4Score: dbArticle.cvssV4Score,
    publishedAt: dbArticle.publishedAt,
    createdAt: dbArticle.createdAt,
    updatedAt: dbArticle.updatedAt,
  };
}

export async function getArticleBySlug(slug: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.isPublished, true)))
    .limit(1)
    .execute();
  return data.length > 0 ? mapArticle(data[0]) : null;
}

export async function getArticleById(id: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(eq(articles.id, id), eq(articles.isPublished, true)))
    .limit(1)
    .execute();
  return data.length > 0 ? mapArticle(data[0]) : null;
}

export async function getArticles(page = 1, pageSize = 12, env?: any) {
  const db = getDb(env);
  const offset = (page - 1) * pageSize;
  const data = await db.select().from(articles)
    .where(eq(articles.isPublished, true))
    .orderBy(desc(articles.publishedAt))
    .limit(pageSize)
    .offset(offset)
    .execute();
  return data.map(mapArticle);
}

export async function getFeaturedArticles(limit = 6, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(eq(articles.isPublished, true), eq(articles.isFeatured, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function getBreakingArticles(limit = 5, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(eq(articles.isPublished, true), eq(articles.isBreaking, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function getArticlesByCategory(category: string, page = 1, pageSize = 12, env?: any) {
  const db = getDb(env);
  const offset = (page - 1) * pageSize;
  const data = await db.select().from(articles)
    .where(and(eq(articles.isPublished, true), ilike(articles.category, category)))
    .orderBy(desc(articles.publishedAt))
    .limit(pageSize)
    .offset(offset)
    .execute();
  return data.map(mapArticle);
}

export async function getTrendingArticles(limit = 5, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(eq(articles.isPublished, true))
    .orderBy(desc(articles.views))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function getRelatedArticles(category: string, excludeSlug: string, limit = 3, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(
      eq(articles.isPublished, true),
      eq(articles.category, category),
      not(eq(articles.slug, excludeSlug))
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function getCategoriesWithCounts(env?: any) {
  const db = getDb(env);
  const data = await db.select({ category: articles.category }).from(articles)
    .where(eq(articles.isPublished, true))
    .execute();
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.category) {
      counts[row.category] = (counts[row.category] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function searchArticles(query: string, limit = 20, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(and(
      eq(articles.isPublished, true),
      or(ilike(articles.title, `%${query}%`), ilike(articles.excerpt, `%${query}%`))
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function incrementArticleViews(idOrSlug: string, env?: any) {
  try {
    const db = getDb(env);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    if (isUuid) {
      const dbArticle = await db.select({ views: articles.views }).from(articles).where(eq(articles.id, idOrSlug)).limit(1).execute();
      if (dbArticle.length > 0) {
        await db.update(articles)
          .set({ views: (dbArticle[0].views || 0) + 1 })
          .where(eq(articles.id, idOrSlug))
          .execute();
      }
    } else {
      const dbArticle = await db.select({ views: articles.views }).from(articles).where(eq(articles.slug, idOrSlug)).limit(1).execute();
      if (dbArticle.length > 0) {
        await db.update(articles)
          .set({ views: (dbArticle[0].views || 0) + 1 })
          .where(eq(articles.slug, idOrSlug))
          .execute();
      }
    }
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
}

export async function getAllArticleSlugs(limit = 1000, env?: any) {
  const db = getDb(env);
  const data = await db.select({ slug: articles.slug, category: articles.category })
    .from(articles)
    .where(eq(articles.isPublished, true))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data;
}

export async function getArticleCount(env?: any) {
  const db = getDb(env);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.isPublished, true))
    .execute();
  return result[0]?.count || 0;
}

export async function getRecentArticles(limit = 10, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(articles)
    .where(eq(articles.isPublished, true))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .execute();
  return data.map(mapArticle);
}

export async function getAllArticlesAdmin(page = 1, pageSize = 50, env?: any) {
  const db = getDb(env);
  const offset = (page - 1) * pageSize;
  const data = await db.select().from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(pageSize)
    .offset(offset)
    .execute();
  return data.map(mapArticle);
}

export async function updateArticle(id: string, data: Record<string, any>, env?: any) {
  const db = getDb(env);
  const dbData: Record<string, any> = {};
  
  // Drizzle column names match keys of 'articles' object
  for (const [key, val] of Object.entries(data)) {
    dbData[key] = val; // Assuming mapping was already handled, but we need to verify.
    // Wait, earlier Supabase had snake_case mappings. Drizzle handles this through schema.
    // In Drizzle, we update the object properties directly as defined in schema.ts
    // Ex: dbData.title = val; dbData.imageUrl = val;
    // We should stringify tags/JSON if present
    if (key === 'tags' || key === 'mitreTtps' || key === 'iocsJson') {
      dbData[key] = val ? JSON.stringify(val) : null;
    }
  }
  
  dbData.updatedAt = new Date().toISOString();
  
  const result = await db.update(articles).set(dbData).where(eq(articles.id, id)).returning().execute();
  return mapArticle(result[0]);
}

export async function deleteArticle(id: string, env?: any) {
  const db = getDb(env);
  await db.delete(articles).where(eq(articles.id, id)).execute();
}

export async function getAllTags(env?: any) {
  const db = getDb(env);
  const data = await db.select({ tags: articles.tags }).from(articles).where(eq(articles.isPublished, true)).execute();
  const counts: Record<string, number> = {};
  
  for (const row of data) {
    if (row.tags) {
      const parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
      for (const tag of parsedTags) {
        if (tag && tag.trim().length > 0) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
  }
  
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

export async function createArticle(data: Record<string, any>, env?: any) {
  const db = getDb(env);
  const dbData: Record<string, any> = { ...data };
  
  if (dbData.tags) dbData.tags = JSON.stringify(dbData.tags);
  if (dbData.mitreTtps) dbData.mitreTtps = JSON.stringify(dbData.mitreTtps);
  if (dbData.iocsJson) dbData.iocsJson = JSON.stringify(dbData.iocsJson);
  
  const result = await db.insert(articles).values(dbData as any).returning().execute();
  return mapArticle(result[0]);
}

export async function getArticlesCountByCategory(category: string, env?: any) {
  const db = getDb(env);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(eq(articles.isPublished, true), ilike(articles.category, category)))
    .execute();
  return result[0]?.count || 0;
}
