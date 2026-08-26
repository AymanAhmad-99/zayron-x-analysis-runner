import { eq, desc, ilike } from 'drizzle-orm';
import { getDb } from '../client';
import { tools } from '../schema';
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
    githubUrl: dbTool.githubUrl,
    stars: dbTool.stars,
    tags: dbTool.tags ? JSON.parse(dbTool.tags) : [],
    createdAt: dbTool.createdAt,
  };
}

export async function getTools(env?: any) {
  const db = getDb(env);
  const data = await db.select().from(tools).orderBy(desc(tools.stars)).execute();
  return data.map(mapTool);
}

export async function getToolBySlug(slug: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(tools).where(eq(tools.slug, slug)).limit(1).execute();
  return data.length > 0 ? mapTool(data[0]) : null;
}

export async function getToolsByCategory(category: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(tools)
    .where(ilike(tools.category, category))
    .orderBy(desc(tools.stars))
    .execute();
  return data.map(mapTool);
}

export async function getAllToolSlugs(limit = 500, env?: any) {
  const db = getDb(env);
  const data = await db.select({ slug: tools.slug })
    .from(tools)
    .orderBy(desc(tools.stars))
    .limit(limit)
    .execute();
  return data.map((r) => r.slug);
}

export async function getTopTools(limit = 4, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(tools)
    .orderBy(desc(tools.stars))
    .limit(limit)
    .execute();
  return data.map(mapTool);
}
