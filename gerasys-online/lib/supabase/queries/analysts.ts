import { getSupabaseClient } from '../client';
import type { Analyst } from '@/lib/types';

function mapAnalyst(dbAnalyst: any): Analyst {
  if (!dbAnalyst) return null as any;
  return {
    id: dbAnalyst.id,
    name: dbAnalyst.name,
    title: dbAnalyst.title,
    bio: dbAnalyst.bio,
    nationality: dbAnalyst.nationality,
    specializations: dbAnalyst.specializations || [],
    articleCount: dbAnalyst.article_count,
    createdAt: dbAnalyst.created_at,
  };
}

export async function getAnalysts(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('analysts')
    .select('*')
    .order('article_count', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapAnalyst);
}
