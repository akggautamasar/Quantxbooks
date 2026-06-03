import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

function checkAdmin(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const books = await db.getAll<db.Book>('books');
    books.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ success: true, data: books, total: books.length });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAdmin(request)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const book = await db.insert<db.Book>('books', {
      title: body.title,
      author: body.author,
      description: body.description || '',
      cover_url: body.cover_url || '',
      pdf_url: body.pdf_url || '',
      epub_url: body.epub_url || '',
      category: body.category,
      tags: body.tags || [],
      language: body.language || 'English',
      total_pages: body.total_pages,
      file_size: body.file_size,
      is_premium: body.is_premium !== false,
      is_featured: body.is_featured || false,
      download_count: 0,
      view_count: 0,
      telegram_file_id: body.telegram_file_id || '',
      telegram_message_id: body.telegram_message_id || undefined,
      preview_pages: body.preview_pages || [],
      updated_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({ success: true, data: book }, { status: 201 });
  } catch (err) {
    console.error('Admin create book error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create book' }, { status: 500 });
  }
}
