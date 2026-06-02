import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'newest';
    const offset = (page - 1) * limit;

    const supabase = getServiceSupabase();
    let query = supabase.from('books').select('*', { count: 'exact' });

    if (category) query = query.eq('category', category);
    if (language) query = query.eq('language', language);
    if (featured === 'true') query = query.eq('is_featured', true);
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (sort === 'popular') query = query.order('view_count', { ascending: false });
    else if (sort === 'title') query = query.order('title', { ascending: true });

    query = query.range(offset, offset + limit - 1);

    const { data: books, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: books,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Books fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
