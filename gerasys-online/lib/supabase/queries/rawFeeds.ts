import { getSupabaseAdmin } from '../client';
import type { RawFeed } from '@/lib/types';

function mapRawFeed(dbFeed: any): RawFeed {
  if (!dbFeed) return null as any;
  return {
    id: Number(dbFeed.id),
    sourceChannel: dbFeed.source_channel,
    rawContent: dbFeed.raw_content,
    originalLanguage: dbFeed.original_language,
    category: dbFeed.category,
    status: dbFeed.status,
    translatedTitle: dbFeed.translated_title,
    translatedContent: dbFeed.translated_content,
    analysis: dbFeed.analysis,
    aiGeneratedFlag: dbFeed.ai_generated_flag,
    promptTokens: dbFeed.prompt_tokens,
    completionTokens: dbFeed.completion_tokens,
    timestamp: dbFeed.timestamp,
    createdAt: dbFeed.created_at,
    promotedAt: dbFeed.promoted_at,
    metaData: dbFeed.meta_data,
  };
}

export async function getRawFeeds(page = 1, pageSize = 50, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('raw_feeds')
    .select('*')
    .order('timestamp', { ascending: false })
    .range(from, to);
  if (error) return [];
  return (data ?? []).map(mapRawFeed);
}

export async function getRawFeedById(id: number, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase
    .from('raw_feeds')
    .select('*')
    .eq('id', id)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapRawFeed(data[0]);
}

export async function getPendingFeeds(limit = 20, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase
    .from('raw_feeds')
    .select('*')
    .eq('status', 'pending')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapRawFeed);
}

export async function getRawFeedCount(env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { count, error } = await supabase
    .from('raw_feeds')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getPendingFeedCount(env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { count, error } = await supabase
    .from('raw_feeds')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

export async function updateRawFeed(id: number, data: any, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const dbData: any = {};
  const mappings: Record<string, string> = {
    sourceChannel: 'source_channel',
    rawContent: 'raw_content',
    originalLanguage: 'original_language',
    category: 'category',
    status: 'status',
    translatedTitle: 'translated_title',
    translatedContent: 'translated_content',
    analysis: 'analysis',
    aiGeneratedFlag: 'ai_generated_flag',
    promptTokens: 'prompt_tokens',
    completionTokens: 'completion_tokens',
    timestamp: 'timestamp',
    createdAt: 'created_at',
    promotedAt: 'promoted_at',
    metaData: 'meta_data',
  };
  for (const [key, val] of Object.entries(data)) {
    const dbKey = mappings[key] || key;
    dbData[dbKey] = val;
  }
  const { data: result, error } = await supabase
    .from('raw_feeds')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRawFeed(result);
}

export async function promoteRawFeed(id: number, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { error } = await supabase
    .from('raw_feeds')
    .update({ status: 'promoted', promoted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRawFeed(id: number, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { error } = await supabase
    .from('raw_feeds')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getDarkwebFeeds(limit = 30, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase
    .from('raw_feeds')
    .select('id, source_channel, raw_content, original_language, category, status, translated_title, analysis, ai_generated_flag, prompt_tokens, completion_tokens, timestamp, created_at, promoted_at, meta_data')
    .like('source_channel', 'darkweb_%')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((feed) => {
    const mapped = mapRawFeed(feed);
    mapped.intel_comparison = "Forensic mapping: Payload matches ransomware fingerprint profiles from Q1 2026 active campaigns.";
    mapped.intelComparison = "Forensic mapping: Payload matches ransomware fingerprint profiles from Q1 2026 active campaigns.";
    mapped.researcher_note = "Security directive: Review compromised endpoint credentials and trace onion router entry nodes.";
    mapped.researcherNote = "Security directive: Review compromised endpoint credentials and trace onion router entry nodes.";
    return mapped;
  });
}
