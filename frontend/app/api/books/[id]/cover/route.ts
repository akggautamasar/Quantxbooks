import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageParam = new URL(request.url).searchParams.get('page');
    const book = await db.getById<db.Book>('books', params.id);
    if (!book) return new NextResponse(null, { status: 404 });

    let fileId: string | undefined;

    if (pageParam !== null) {
      // Serve a specific page image from preview_pages
      const idx = parseInt(pageParam, 10);
      fileId = book.preview_pages?.[idx];
    } else {
      fileId = book.cover_url || undefined;
    }

    if (!fileId) return new NextResponse(null, { status: 404 });

    if (fileId.startsWith('http')) return NextResponse.redirect(fileId);

    const tgResponse = await fetchFile(fileId);
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

