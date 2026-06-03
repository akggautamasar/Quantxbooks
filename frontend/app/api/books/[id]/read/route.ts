import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { downloadByMessageId, isAvailable as isMTProtoAvailable } from '@/lib/tg-mtproto';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    const needsPremium = book.is_premium && !isPremium;
    if (needsPremium) {
      return NextResponse.json(
        { success: false, error: 'Premium subscription required', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      );
    }

    const fileId = book.pdf_url || book.telegram_file_id;
    if (!fileId && !book.telegram_message_id) {
      return NextResponse.json({ success: false, error: 'No readable file available' }, { status: 404 });
    }

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

    // Update read count (non-blocking)
    db.update<db.Book>('books', book.id, { view_count: book.view_count + 1 } as any).catch(() => {});

    // Try Bot API first (works for files ≤ 20 MB)
    if (fileId) {
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
        if (!(msg.includes('file is too big') || msg.includes('too big'))) {
          throw err;
        }
        // Fall through to MTProto for large files
      }
    }

    // MTProto fallback for files > 20 MB
    if (book.telegram_message_id) {
      if (!isMTProtoAvailable()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This PDF is larger than 20 MB. MTProto streaming is not configured on this server — the admin needs to set TELEGRAM_API_ID and TELEGRAM_API_HASH.',
          },
          { status: 413 }
        );
      }
      const buffer = await downloadByMessageId(book.telegram_message_id);
      return new NextResponse(buffer, {
        status: 200,
        headers: buildHeaders(buffer.byteLength.toString()),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "This PDF exceeds Telegram's 20 MB streaming limit. The admin needs to re-upload it so the message ID is stored for MTProto streaming.",
      },
      { status: 413 }
    );
  } catch (err: any) {
    console.error('Read error:', err);
    return NextResponse.json({ success: false, error: 'Failed to stream book' }, { status: 500 });
  }
}
