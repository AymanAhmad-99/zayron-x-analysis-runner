import type { Article } from '@/lib/types';
import { getSupabaseAdmin, getSupabaseClient } from '../client';

function mapArticle(dbArticle: any): Article {
  if (!dbArticle) return null as any;
  return {
    id: dbArticle.id,
    title: dbArticle.title,
    slug: dbArticle.slug,
    urlHash: dbArticle.url_hash,
    subtitle: dbArticle.subtitle,
    author: dbArticle.author,
    category: dbArticle.category,
    tags: dbArticle.tags || [],
    content: dbArticle.content,
    excerpt: dbArticle.excerpt,
    imageUrl: dbArticle.image_url,
    image_url: dbArticle.image_url,
    readTime: dbArticle.read_time,
    views: dbArticle.views,
    isPublished: dbArticle.is_published,
    isFeatured: dbArticle.is_featured,
    isBreaking: dbArticle.is_breaking,
    financialExposure: dbArticle.financial_exposure,
    regulatoryRisk: dbArticle.regulatory_risk,
    mitigationImpact: dbArticle.mitigation_impact,
    yaraRule: dbArticle.yara_rule,
    imageTag: dbArticle.image_tag,
    fbrScore: dbArticle.fbr_score,
    mitreTtps: dbArticle.mitre_ttps || [],
    iocsJson: dbArticle.iocs_json,
    sourceChannel: dbArticle.source_channel,
    cvssV4Score: dbArticle.cvss_v4_score,
    publishedAt: dbArticle.published_at,
    createdAt: dbArticle.created_at,
    updatedAt: dbArticle.updated_at,
  };
}

export async function getArticleBySlug(slug: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  if (error) return null;
  return mapArticle(data);
}

export async function getArticleById(id: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();
  if (error) return null;
  return mapArticle(data);
}

export async function getArticles(page = 1, pageSize = 12, env?: any) {
  const supabase = getSupabaseClient(env);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getFeaturedArticles(limit = 6, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getBreakingArticles(limit = 5, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('is_breaking', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getArticlesByCategory(category: string, page = 1, pageSize = 12, env?: any) {
  const supabase = getSupabaseClient(env);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .ilike('category', category)
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getTrendingArticles(limit = 5, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('views', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getRelatedArticles(
  category: string,
  excludeSlug: string,
  limit = 3,
  env?: any,
) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .neq('slug', excludeSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getCategoriesWithCounts(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('category')
    .eq('is_published', true);
  if (error) return [];

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function searchArticles(query: string, limit = 20, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function incrementArticleViews(idOrSlug: string, env?: any) {
  try {
    const supabase = getSupabaseAdmin(env);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      const { data } = await supabase.from('articles').select('views').eq('id', idOrSlug).single();
      if (data) {
        await supabase
          .from('articles')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', idOrSlug);
      }
    } else {
      await supabase.rpc('increment_views', { article_slug: idOrSlug });
    }
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
}

export async function getAllArticleSlugs(limit = 1000, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('slug, category')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

export async function getArticleCount(env?: any) {
  const supabase = getSupabaseClient(env);
  const { count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);
  if (error) return 0;
  return count ?? 0;
}

export async function getRecentArticles(limit = 10, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function getAllArticlesAdmin(page = 1, pageSize = 50, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) return [];
  return (data ?? []).map(mapArticle);
}

export async function updateArticle(id: string, data: Record<string, any>, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const dbData: Record<string, any> = {};

  const mappings: Record<string, string> = {
    title: 'title',
    slug: 'slug',
    urlHash: 'url_hash',
    subtitle: 'subtitle',
    author: 'author',
    category: 'category',
    tags: 'tags',
    content: 'content',
    excerpt: 'excerpt',
    imageUrl: 'image_url',
    readTime: 'read_time',
    views: 'views',
    isPublished: 'is_published',
    isFeatured: 'is_featured',
    isBreaking: 'is_breaking',
    financialExposure: 'financial_exposure',
    regulatoryRisk: 'regulatory_risk',
    mitigationImpact: 'mitigation_impact',
    yaraRule: 'yara_rule',
    imageTag: 'image_tag',
    fbrScore: 'fbr_score',
    mitreTtps: 'mitre_ttps',
    iocsJson: 'iocs_json',
    sourceChannel: 'source_channel',
    cvssV4Score: 'cvss_v4_score',
    publishedAt: 'published_at',
  };

  for (const [key, val] of Object.entries(data)) {
    const dbKey = mappings[key] || key;
    dbData[dbKey] = val;
  }
  dbData.updated_at = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('articles')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapArticle(result);
}

export async function deleteArticle(id: string, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllTags(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase.from('articles').select('tags').eq('is_published', true);
  if (error) return [];

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.tags && Array.isArray(row.tags)) {
      for (const tag of row.tags) {
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
  const supabase = getSupabaseAdmin(env);
  const dbData: Record<string, any> = {};

  const mappings: Record<string, string> = {
    title: 'title',
    slug: 'slug',
    urlHash: 'url_hash',
    subtitle: 'subtitle',
    author: 'author',
    category: 'category',
    tags: 'tags',
    content: 'content',
    excerpt: 'excerpt',
    imageUrl: 'image_url',
    readTime: 'read_time',
    views: 'views',
    isPublished: 'is_published',
    isFeatured: 'is_featured',
    isBreaking: 'is_breaking',
    financialExposure: 'financial_exposure',
    regulatoryRisk: 'regulatory_risk',
    mitigationImpact: 'mitigation_impact',
    yaraRule: 'yara_rule',
    imageTag: 'image_tag',
    fbrScore: 'fbr_score',
    mitreTtps: 'mitre_ttps',
    iocsJson: 'iocs_json',
    sourceChannel: 'source_channel',
    cvssV4Score: 'cvss_v4_score',
    publishedAt: 'published_at',
  };

  for (const [key, val] of Object.entries(data)) {
    const dbKey = mappings[key] || key;
    dbData[dbKey] = val;
  }

  const { data: result, error } = await supabase.from('articles').insert(dbData).select().single();
  if (error) throw error;
  return mapArticle(result);
}

export async function getArticlesCountByCategory(category: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)
    .ilike('category', category);
  if (error) return 0;
  return count ?? 0;
}
