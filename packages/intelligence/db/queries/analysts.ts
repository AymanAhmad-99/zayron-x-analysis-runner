import { desc } from 'drizzle-orm';
import { getDb } from '../client';
import { analysts } from '../schema';
import type { Analyst } from '@zayron/types';

function mapAnalyst(dbAnalyst: any): Analyst {
  if (!dbAnalyst) return null as any;
  return {
    id: dbAnalyst.id,
    name: dbAnalyst.name,
    title: dbAnalyst.title,
    bio: dbAnalyst.bio,
    nationality: dbAnalyst.nationality,
    specializations: dbAnalyst.specializations ? (typeof dbAnalyst.specializations === 'string' ? JSON.parse(dbAnalyst.specializations) : dbAnalyst.specializations) : [],
    articleCount: dbAnalyst.articleCount || 0,
    createdAt: dbAnalyst.createdAt,
    updatedAt: dbAnalyst.updatedAt || dbAnalyst.createdAt,
  };
}

export async function getAnalysts(env?: any) {
  const db = getDb(env);
  const data = await db.select().from(analysts)
    .orderBy(desc(analysts.articleCount))
    .execute();
  return data.map(mapAnalyst);
}
