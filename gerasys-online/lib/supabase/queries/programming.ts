import { getSupabaseClient } from '../client';
import type { ProgrammingLang } from '@/lib/types';

function mapProgrammingLang(dbLang: any): ProgrammingLang {
  if (!dbLang) return null as any;
  return {
    id: dbLang.id,
    name: dbLang.name,
    slug: dbLang.slug,
    description: dbLang.description,
    paradigm: dbLang.paradigm,
    useCase: dbLang.use_case,
    codeSnippet: dbLang.code_snippet,
    securityFeatures: dbLang.security_features || [],
    articleCount: dbLang.article_count,
    createdAt: dbLang.created_at,
  };
}

export async function getProgrammingLanguages(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('programming_langs')
    .select('*')
    .order('article_count', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapProgrammingLang);
}

export async function getProgrammingLangBySlug(slug: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('programming_langs')
    .select('*')
    .eq('slug', slug)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapProgrammingLang(data[0]);
}

export async function getAllProgrammingLangSlugs(limit = 100, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('programming_langs')
    .select('slug')
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => r.slug);
}
