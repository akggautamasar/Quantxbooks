import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book = await db.getById<db.Book>('books', params.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    // Increment view count (non-blocking)
    db.update<db.Book>('books', book.id, { view_count: book.view_count + 1 } as any).catch(() => {});

    // Check premium status
    const token = getTokenFromHeader(request.headers.get('authorization'));
    let isPremiumUser = false;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await db.getById<db.User>('users', decoded.userId);
        isPremiumUser =
          user?.is_premium === true &&
          (!user.premium_expiry || user.premium_expiry > new Date().toISOString());
      }
    }

    // Strip sensitive URLs for non-premium users
    const bookData = { ...book };
    if (!isPremiumUser && book.is_premium) {
      delete bookData.pdf_url;
      delete bookData.epub_url;
      delete bookData.telegram_file_id;
    }

    return NextResponse.json({ success: true, data: bookData, isPremiumUser });
  } catch (err) {
    console.error('Book fetch error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch book' }, { status: 500 });
  }
}
