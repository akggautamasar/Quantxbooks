import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { viewCounts } from '@/lib/view-counts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book = await db.getById<db.Book>('books', params.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    // Auth — fall back to cookie so iframe requests work
    const token =
      getTokenFromHeader(request.headers.get('authorization')) ||
      request.cookies.get('token')?.value ||
      null;
    let isPremium = false;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const isAdmin = decoded.role === 'admin';
        const user = await db.getById<db.User>('users', decoded.userId);
        isPremium =
          isAdmin ||
          (user?.is_premium === true &&
            (!user.premium_expiry || user.premium_expiry > new Date().toISOString()));
      }
    }

    if (book.is_premium && !isPremium) {
      return NextResponse.json(
        { success: false, error: 'Premium subscription required', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      );
    }

    // Books uploaded via admin panel or auto-converted are served as page images
    // through /api/books/[id]/cover?page=N — this route is only a fallback for
    // legacy channel-uploaded books that still have a pdf_url.
    const fileId = book.pdf_url || book.telegram_file_id;
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This book has no streamable file. If the cover shows pages, try reloading — it may still be processing.',
        },
        { status: 404 }
      );
    }

    viewCounts.set(book.id, (viewCounts.get(book.id) ?? (book.view_count || 0)) + 1);

    const safeTitle = book.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'book';
    const buildHeaders = (contentLength?: string | null): Record<string, string> => {
      const h: Record<string, string> = {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      };
      if (contentLength) h['Content-Length'] = contentLength;
      return h;
    };

    try {
      const tgResponse = await fetchFile(fileId);
      if (tgResponse.ok) {
        return new NextResponse(tgResponse.body, {
          status: 200,
          headers: buildHeaders(tgResponse.headers.get('content-length')),
        });
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('file is too big') || msg.includes('too big')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This file is too large to stream. Please ask the admin to re-upload it via Admin → Upload so it is stored as page images.',
          },
          { status: 413 }
        );
      }
      throw err;
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch file from Telegram' },
      { status: 502 }
    );
  } catch (err: any) {
    console.error('Read error:', err);
    const msg = err?.message || '';
    if (msg.includes('getChat') || msg.includes('getFile')) {
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable — please retry in a moment' },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to stream book' }, { status: 500 });
  }
}
