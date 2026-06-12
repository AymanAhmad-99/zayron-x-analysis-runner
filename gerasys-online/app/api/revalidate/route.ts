import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secret = request.headers.get('x-revalidate-secret');

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const { path, slug, category } = body;

    if (slug) {
      const cat = (category ?? 'threat-intelligence').toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/intelligence/${cat}/${slug}`);
      // Also revalidate old route for any remaining references
      revalidatePath(`/article/${slug}`);
    }

    if (path) {
      revalidatePath(path);
    }

    // Always revalidate homepage and category pages
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      revalidated: [
        path,
        slug
          ? `/intelligence/${(category ?? 'threat-intelligence').toLowerCase().replace(/\s+/g, '-')}/${slug}`
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('API /revalidate error:', error);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
