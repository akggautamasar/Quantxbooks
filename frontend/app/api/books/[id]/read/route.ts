import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { viewCounts } from '@/lib/view-counts';
import * as mtproto from '@/lib/tg-mtproto';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Parse an HTTP Range header into inclusive [start, end] bytes. */
function parseRange(
  rangeHeader: string | null,
  fileSize: number,
): { start: number; end: number; isRange: boolean } {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return { start: 0, end: fileSize - 1, isRange: false };
  }
  const spec = rangeHeader.slice(6);
  let start = 0;
  let end = fileSize - 1;

  try {
    if (spec.startsWith('-')) {
      start = Math.max(0, fileSize - parseInt(spec.slice(1)));
      end = fileSize - 1;
    } else if (spec.endsWith('-')) {
      start = parseInt(spec);
      end = fileSize - 1;
    } else {
      const [s, e] = spec.split('-');
      start = parseInt(s);
      end = e ? parseInt(e) : fileSize - 1;
    }
  } catch {
    return { start: 0, end: fileSize - 1, isRange: false };
  }

  start = Math.max(0, Math.min(start, fileSize - 1));
  end = Math.max(start, Math.min(end, fileSize - 1));
  return { start, end, isRange: true };
}

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

    const fileId = book.pdf_url || book.telegram_file_id;
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'No file attached to this book.' },
        { status: 404 }
      );
    }

    viewCounts.set(book.id, (viewCounts.get(book.id) ?? (book.view_count || 0)) + 1);

    const safeTitle =
      book.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'book';

    // ── MTProto chunked streaming (preferred for any file if message_id is available) ──
    if (book.telegram_message_id && mtproto.isAvailable()) {
      const sourceChatId =
        book.telegram_source_chat_id || process.env.TELEGRAM_STORAGE_CHANNEL_ID!;

      // Get file size for Range header; getFileInfo is a lightweight getMessages call
      const fileInfo = await mtproto.getFileInfo(sourceChatId, book.telegram_message_id);
      const fileSize = fileInfo.size;

      if (fileSize === 0) {
        return NextResponse.json(
          { success: false, error: 'File is empty or unavailable.' },
          { status: 404 }
        );
      }

      const rangeHeader = request.headers.get('range');
      const { start, end, isRange } = parseRange(rangeHeader, fileSize);

      if (start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const reqLength = end - start + 1;
      const mimeType =
        fileInfo.mimeType === 'application/epub+zip'
          ? 'application/epub+zip'
          : 'application/pdf';
      const ext = mimeType === 'application/epub+zip' ? 'epub' : 'pdf';

      const responseHeaders: Record<string, string> = {
        'Content-Type': mimeType,
        'Content-Length': String(reqLength),
        'Content-Disposition': `inline; filename="${safeTitle}.${ext}"`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      };
      if (isRange) {
        responseHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      }

      // Create a ReadableStream that pipes gramjs chunks to the HTTP response
      const streamGen = mtproto.streamFromChat(sourceChatId, book.telegram_message_id, start, end);
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of streamGen) {
              controller.enqueue(chunk);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new NextResponse(readable, {
        status: isRange ? 206 : 200,
        headers: responseHeaders,
      });
    }

    // ── Bot API path (≤ 20 MB, no message_id, or MTProto not configured) ──
    try {
      const tgResponse = await fetchFile(fileId);
      if (tgResponse.ok) {
        const botHeaders: Record<string, string> = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeTitle}.pdf"`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        };
        const cl = tgResponse.headers.get('content-length');
        if (cl) botHeaders['Content-Length'] = cl;
        return new NextResponse(tgResponse.body, { status: 200, headers: botHeaders });
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (!msg.includes('file is too big') && !msg.includes('too big')) throw err;
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
