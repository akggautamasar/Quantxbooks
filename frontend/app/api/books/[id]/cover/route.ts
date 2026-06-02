import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';

export const runtime = 'nodejs';

// Proxy cover images through the server (works even if stored as Telegram file_id)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book = await db.getById<db.Book>('books', params.id);
    if (!book?.cover_url) {
      return new NextResponse(null, { status: 404 });
    }

    // If cover_url looks like an external URL, redirect to it
    if (book.cover_url.startsWith('http')) {
      return NextResponse.redirect(book.cover_url);
    }

    // Otherwise treat it as a Telegram file_id and proxy
    const tgResponse = await fetchFile(book.cover_url);
    if (!tgResponse.ok) return new NextResponse(null, { status: 404 });

    return new NextResponse(tgResponse.body, {
      headers: {
        'Content-Type': tgResponse.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
