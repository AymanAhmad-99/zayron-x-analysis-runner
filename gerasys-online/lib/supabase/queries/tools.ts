import { getSupabaseClient } from '../client';
import type { Tool } from '@/lib/types';

function mapTool(dbTool: any): Tool {
  if (!dbTool) return null as any;
  return {
    id: dbTool.id,
    name: dbTool.name,
    slug: dbTool.slug,
    category: dbTool.category,
    description: dbTool.description,
    rating: dbTool.rating,
    githubUrl: dbTool.github_url,
    stars: dbTool.stars,
    tags: dbTool.tags || [],
    createdAt: dbTool.created_at,
  };
}

export async function getTools(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .order('stars', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapTool);
}

export async function getToolBySlug(slug: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', slug)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapTool(data[0]);
}

export async function getToolsByCategory(category: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .ilike('category', category)
    .order('stars', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapTool);
}

export async function getAllToolSlugs(limit = 500, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('tools')
    .select('slug')
    .order('stars', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => r.slug);
}

export async function getTopTools(limit = 4, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .order('stars', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapTool);
}
