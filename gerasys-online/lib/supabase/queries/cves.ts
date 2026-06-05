import { getSupabaseClient, getSupabaseAdmin } from '../client';
import type { CVE } from '@/lib/types';

function mapCVE(dbCVE: any): CVE {
  if (!dbCVE) return null as any;
  return {
    id: dbCVE.id,
    cveId: dbCVE.cve_id,
    title: dbCVE.title,
    description: dbCVE.description,
    severity: dbCVE.severity,
    cvssScore: dbCVE.cvss_score,
    cvssVector: dbCVE.cvss_vector,
    affectedProduct: dbCVE.affected_product,
    vendor: dbCVE.vendor,
    status: dbCVE.status,
    publishedDate: dbCVE.published_date,
    createdAt: dbCVE.created_at,
  };
}

export async function getCVEs(page = 1, pageSize = 25, env?: any) {
  const supabase = getSupabaseClient(env);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .order('published_date', { ascending: false })
    .range(from, to);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function getCVEById(cveId: string, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .eq('cve_id', cveId.toUpperCase())
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapCVE(data[0]);
}

export async function getCVEsBySeverity(severity: string, limit = 10, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .ilike('severity', severity)
    .order('cvss_score', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function getCriticalCVEs(limit = 5, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .ilike('severity', 'critical')
    .order('published_date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function getCVEsByVendor(vendor: string, limit = 20, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .ilike('vendor', `%${vendor}%`)
    .order('cvss_score', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function searchCVEs(query: string, limit = 20, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .or(`cve_id.ilike.%${query}%,description.ilike.%${query}%`)
    .order('cvss_score', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function getCVECount(env?: any) {
  const supabase = getSupabaseClient(env);
  const { count, error } = await supabase
    .from('cves')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getCVESeverityDistribution(env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('severity');
  if (error) return [];
  
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const sev = row.severity || 'Unknown';
    counts[sev] = (counts[sev] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentCVEs(limit = 20, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('*')
    .order('published_date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapCVE);
}

export async function getAllCVEIds(limit = 1000, env?: any) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('cves')
    .select('cve_id')
    .order('published_date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => r.cve_id);
}

export async function updateCVE(id: string, data: any, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const dbData: any = {};
  const mappings: Record<string, string> = {
    cveId: 'cve_id',
    title: 'title',
    description: 'description',
    severity: 'severity',
    cvssScore: 'cvss_score',
    cvssVector: 'cvss_vector',
    affectedProduct: 'affected_product',
    vendor: 'vendor',
    status: 'status',
    publishedDate: 'published_date',
  };
  for (const [key, val] of Object.entries(data)) {
    const dbKey = mappings[key] || key;
    dbData[dbKey] = val;
  }
  const { data: result, error } = await supabase
    .from('cves')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCVE(result);
}

export async function deleteCVE(id: string, env?: any) {
  const supabase = getSupabaseAdmin(env);
  const { error } = await supabase
    .from('cves')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Export aliases
export { getCVEs as getCves, getCVEById as getCveById, getCVECount as getCveCount };
