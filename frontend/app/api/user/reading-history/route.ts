import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

function auth(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const history = await db.findMany<db.ReadingHistory>(
      'reading_history',
      (h) => h.user_id === decoded.userId
    );
    history.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    // Attach book data
    const books = await db.getAll<db.Book>('books');
    const bookMap = new Map(books.map((b) => [b.id, b]));
    const enriched = history.map((h) => ({ ...h, book: bookMap.get(h.book_id) }));

    return NextResponse.json({ success: true, data: enriched.slice(0, 20) });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { bookId, lastPage, totalPages } = await request.json();
    const progress = totalPages > 0 ? Math.round((lastPage / totalPages) * 100) : 0;

    const record = await db.upsert<db.ReadingHistory>(
      'reading_history',
      (h) => h.user_id === decoded.userId && h.book_id === bookId,
      {
        user_id: decoded.userId,
        book_id: bookId,
        last_page: lastPage,
        total_pages: totalPages,
        progress_percentage: progress,
        updated_at: new Date().toISOString(),
      } as any
    );

    return NextResponse.json({ success: true, data: record });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update history' }, { status: 500 });
  }
}
