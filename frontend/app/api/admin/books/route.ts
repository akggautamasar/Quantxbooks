import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

async function checkAdmin(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const supabase = getServiceSupabase();

    const { data: book, error } = await supabase
      .from('books')
      .insert({
        title: body.title,
        author: body.author,
        description: body.description,
        cover_url: body.cover_url,
        pdf_url: body.pdf_url,
        epub_url: body.epub_url,
        category: body.category,
        tags: body.tags || [],
        language: body.language || 'English',
        total_pages: body.total_pages,
        file_size: body.file_size,
        is_premium: body.is_premium !== false,
        is_featured: body.is_featured || false,
        telegram_file_id: body.telegram_file_id,
        preview_pages: body.preview_pages || [],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: book }, { status: 201 });
  } catch (error) {
    console.error('Admin create book error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create book' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

    const supabase = getServiceSupabase();
    const { data: books, count } = await supabase
      .from('books')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: books, total: count });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch books' }, { status: 500 });
  }
}
