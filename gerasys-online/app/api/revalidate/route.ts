import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

function getSafePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path || path.length > 200) return null;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) return null;
  return path;
}

function getSafeSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim();
  if (!slug || slug.length > 120) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
  return slug;
}

function getSafeCategory(value: unknown, fallback?: string): string | null {
  if (value == null) return fallback ?? null;
  if (typeof value !== 'string') return null;
  const category = value.trim();
  if (!category || category.length > 80) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(category)) return null;
  return category;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secret = request.headers.get('x-revalidate-secret');

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const { path, slug, category } = body;
    const safePath = path == null ? null : getSafePath(path);
    const safeSlug = slug == null ? null : getSafeSlug(slug);
    const safeCategory = getSafeCategory(category, 'threat-intelligence');

    if ((path != null && !safePath) || (slug != null && !safeSlug) || !safeCategory) {
      return NextResponse.json({ error: 'Invalid revalidation target' }, { status: 400 });
    }

    if (safeSlug) {
      revalidatePath(`/intelligence/${safeCategory}/${safeSlug}`);
      // Also revalidate old route for any remaining references
      revalidatePath(`/article/${safeSlug}`);
    }

    if (safePath) {
      revalidatePath(safePath);
    }

    // Always revalidate homepage and category pages
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      revalidated: [
        safePath,
        safeSlug ? `/intelligence/${safeCategory}/${safeSlug}` : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('API /revalidate error:', error);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
