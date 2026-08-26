import { eq, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { programmingLangs } from '../schema';
import type { ProgrammingLang } from '@/lib/types';

function mapProgrammingLang(dbLang: any): ProgrammingLang {
  if (!dbLang) return null as any;
  return {
    id: dbLang.id,
    name: dbLang.name,
    slug: dbLang.slug,
    description: dbLang.description,
    paradigm: dbLang.paradigm,
    useCase: dbLang.useCase,
    codeSnippet: dbLang.codeSnippet,
    securityFeatures: dbLang.securityFeatures ? JSON.parse(dbLang.securityFeatures) : [],
    articleCount: dbLang.articleCount,
    createdAt: dbLang.createdAt,
  };
}

export async function getProgrammingLanguages(env?: any) {
  const db = getDb(env);
  const data = await db.select().from(programmingLangs).orderBy(desc(programmingLangs.articleCount)).execute();
  return data.map(mapProgrammingLang);
}

export async function getProgrammingLangBySlug(slug: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(programmingLangs).where(eq(programmingLangs.slug, slug)).limit(1).execute();
  return data.length > 0 ? mapProgrammingLang(data[0]) : null;
}

export async function getAllProgrammingLangSlugs(limit = 100, env?: any) {
  const db = getDb(env);
  const data = await db.select({ slug: programmingLangs.slug }).from(programmingLangs).limit(limit).execute();
  return data.map((r) => r.slug);
}
