import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { viewCounts } from '@/lib/view-counts';
import * as mtproto from '@/lib/tg-mtproto';

export const runtime = 'nodejs';
// No maxDuration cap needed on Render — persistent server handles any file size.
// Leave a generous limit for Vercel compatibility just in case.
export const maxDuration = 300;

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

    // Image-mode books are served page-by-page via /api/books/[id]/cover?page=N.
    // This route handles all other books — Bot API for ≤20 MB, MTProto for larger.
    const fileId = book.pdf_url || book.telegram_file_id;
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'No file attached to this book.' },
        { status: 404 }
      );
    }

    viewCounts.set(book.id, (viewCounts.get(book.id) ?? (book.view_count || 0)) + 1);

    const safeTitle = book.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'book';
    const pdfHeaders = (contentLength?: string | number | null): Record<string, string> => {
      const h: Record<string, string> = {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      };
      if (contentLength != null) h['Content-Length'] = String(contentLength);
      return h;
    };

    // ── Try Bot API first (works for files ≤ 20 MB) ───────────────────────────
    try {
      const tgResponse = await fetchFile(fileId);
      if (tgResponse.ok) {
        return new NextResponse(tgResponse.body, {
          status: 200,
          headers: pdfHeaders(tgResponse.headers.get('content-length')),
        });
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      // Bot API rejects files > 20 MB — fall through to MTProto below
      if (!msg.includes('file is too big') && !msg.includes('too big')) throw err;
    }

    // ── MTProto fallback for files > 20 MB ────────────────────────────────────
    // Works on any persistent server (Render, VPS, etc.).
    // telegram_source_chat_id tells us WHERE the file lives:
    //   - channel upload → storage channel ID
    //   - bot DM upload  → the user's chat ID with the bot
    if (book.telegram_message_id && mtproto.isAvailable()) {
      const sourceChatId = book.telegram_source_chat_id || process.env.TELEGRAM_STORAGE_CHANNEL_ID!;
      const buffer = await mtproto.downloadFromChat(sourceChatId, book.telegram_message_id);
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: pdfHeaders(buffer.length),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: mtproto.isAvailable()
          ? 'File source location not stored — please re-send the file to the bot.'
          : 'This file is larger than 20 MB and requires MTProto credentials (TELEGRAM_API_ID / TELEGRAM_API_HASH) to stream.',
      },
      { status: 413 }
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
