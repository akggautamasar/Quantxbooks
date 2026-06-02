import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Must be authenticated — fall back to cookie for browser requests
    const token =
      getTokenFromHeader(request.headers.get('authorization')) ||
      request.cookies.get('token')?.value ||
      null;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = decoded.role === 'admin';
    const user = await db.getById<db.User>('users', decoded.userId);
    const isPremium =
      isAdmin ||
      (user?.is_premium === true &&
        (!user.premium_expiry || user.premium_expiry > new Date().toISOString()));

    if (!isPremium) {
      return NextResponse.json(
        { success: false, error: 'Premium subscription required to download', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      );
    }

    const book = await db.getById<db.Book>('books', params.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    const fileId = book.pdf_url || book.epub_url || book.telegram_file_id;
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'No downloadable file available' }, { status: 404 });
    }

    // Determine format preference from query param
    const format = new URL(request.url).searchParams.get('format') || 'pdf';
    const preferredFileId = format === 'epub' && book.epub_url ? book.epub_url : (book.pdf_url || book.telegram_file_id);

    const tgResponse = await fetchFile(preferredFileId!);
    if (!tgResponse.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch file' }, { status: 502 });
    }

    const contentType = format === 'epub' ? 'application/epub+zip' : 'application/pdf';
    const ext = format === 'epub' ? 'epub' : 'pdf';
    const safeTitle = book.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');

    // Increment download count (non-blocking)
    db.update<db.Book>('books', book.id, { download_count: book.download_count + 1 } as any).catch(() => {});

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
      'Cache-Control': 'private, no-store',
    };

    const contentLength = tgResponse.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    return new NextResponse(tgResponse.body, { status: 200, headers });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 });
  }
}
