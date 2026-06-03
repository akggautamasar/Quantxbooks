import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { FREE_PREVIEW_PAGES } from '@/lib/constants';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book = await db.getById<db.Book>('books', params.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    // Check auth — fall back to cookie so iframe requests work
    const token =
      getTokenFromHeader(request.headers.get('authorization')) ||
      request.cookies.get('token')?.value ||
      null;
    let isPremium = false;
    let isAdmin = false;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        isAdmin = decoded.role === 'admin';
        const user = await db.getById<db.User>('users', decoded.userId);
        isPremium =
          isAdmin ||
          (user?.is_premium === true &&
            (!user.premium_expiry || user.premium_expiry > new Date().toISOString()));
      }
    }

    // Determine which file to serve
    const needsPremium = book.is_premium && !isPremium;

    if (needsPremium) {
      // Non-premium: only allow if book has preview pages (handled client-side)
      return NextResponse.json(
        { success: false, error: 'Premium subscription required', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      );
    }

    // Get the file_id to stream
    const fileId = book.pdf_url || book.telegram_file_id;
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'No readable file available' }, { status: 404 });
    }

    // Proxy the file from Telegram
    const tgResponse = await fetchFile(fileId);
    if (!tgResponse.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch book file' }, { status: 502 });
    }

    // Always force application/pdf — Telegram returns application/octet-stream
    // which causes browsers to download instead of display inline.
    const contentLength = tgResponse.headers.get('content-length');
    const safeTitle = book.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'book';

    // Update read count (non-blocking)
    db.update<db.Book>('books', book.id, { view_count: book.view_count + 1 } as any).catch(() => {});

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    return new NextResponse(tgResponse.body, { status: 200, headers });
  } catch (err: any) {
    console.error('Read error:', err);
    const msg: string = err?.message || '';
    if (msg.includes('file is too big') || msg.includes('too big')) {
      return NextResponse.json(
        { success: false, error: 'This PDF exceeds Telegram\'s 20 MB streaming limit. The admin needs to re-upload it via a larger storage provider.' },
        { status: 413 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to stream book' }, { status: 500 });
  }
}
