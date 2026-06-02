import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const language = searchParams.get('language') || '';
    const search = searchParams.get('search') || '';
    const featured = searchParams.get('featured') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '12'));
    const sort = searchParams.get('sort') || 'newest';

    let books = await db.getAll<db.Book>('books');

    // Filter
    if (category) books = books.filter((b) => b.category === category);
    if (language) books = books.filter((b) => b.language === language);
    if (featured) books = books.filter((b) => b.is_featured);
    if (search) {
      const q = search.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'newest') books.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === 'popular') books.sort((a, b) => b.view_count - a.view_count);
    else if (sort === 'title') books.sort((a, b) => a.title.localeCompare(b.title));

    const total = books.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = books.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    console.error('Books fetch error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch books' }, { status: 500 });
  }
}
