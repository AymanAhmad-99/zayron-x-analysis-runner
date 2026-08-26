import { getSupabaseClient } from '../client';

export async function getSubscriberCount(env?: any) {
  const supabase = getSupabaseClient(env);
  const { count, error } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  if (error) return 0;
  return count ?? 0;
}

export async function getTotalViews(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase.from('articles').select('views');
  if (error) return 0;

  let total = 0;
  for (const row of data ?? []) {
    total += row.views || 0;
  }
  return total;
}

export async function getViewsToday(env?: any) {
  const supabase = getSupabaseClient(env);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('articles')
    .select('views')
    .gte('created_at', today.toISOString());
  if (error) return 0;

  let total = 0;
  for (const row of data ?? []) {
    total += row.views || 0;
  }
  return total;
}
