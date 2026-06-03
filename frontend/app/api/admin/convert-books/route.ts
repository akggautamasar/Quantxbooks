// Background endpoint that converts un-processed books (those with pdf_url but
// no preview_pages) to page images.
//
// Called by:
//   - Vercel Cron Job every 5 minutes  (set up in /vercel.json)
//   - Admin panel "Process Pending" button
//
// For files ≤ 20 MB the Bot API is used.
// For files > 20 MB MTProto is used (TELEGRAM_API_ID + TELEGRAM_API_HASH required).

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile, uploadFile } from '@/lib/tg-storage';
import { pdfToJpegPages } from '@/lib/pdf-to-images';
import * as mtproto from '@/lib/tg-mtproto';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 300; // Vercel Pro / Enterprise — process several books per run

const CRON_SECRET = process.env.CRON_SECRET;

async function getPdfBytes(fileId: string, fileSizeBytes: number, messageId?: number): Promise<ArrayBuffer | null> {
  const TWENTY_MB = 20 * 1024 * 1024;
  if (fileSizeBytes <= TWENTY_MB || !messageId) {
    // Try Bot API first (works for ≤ 20 MB and for files with no messageId)
    try {
      const res = await fetchFile(fileId);
      if (res.ok) return res.arrayBuffer();
    } catch {
      // fall through
    }
  }
  // Large file — need MTProto
  if (messageId && mtproto.isAvailable()) {
    try {
      const buf = await mtproto.downloadByMessageId(messageId);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch (err) {
      console.error('[convert-books] MTProto download failed:', err);
    }
  }
  return null;
}

async function processBook(book: db.Book): Promise<boolean> {
  const fileId = book.pdf_url || book.telegram_file_id;
  if (!fileId) return false;

  // Parse size string back to bytes (rough estimate — just to branch logic)
  const sizeStr = book.file_size || '';
  const sizeMatch = sizeStr.match(/([\d.]+)\s*(MB|KB|B)/i);
  let fileSizeBytes = 0;
  if (sizeMatch) {
    const v = parseFloat(sizeMatch[1]);
    const u = sizeMatch[2].toUpperCase();
    fileSizeBytes = u === 'MB' ? v * 1024 * 1024 : u === 'KB' ? v * 1024 : v;
  }

  const pdfData = await getPdfBytes(fileId, fileSizeBytes, book.telegram_message_id);
  if (!pdfData) return false;

  const jpegs = await pdfToJpegPages(pdfData, 1.5, 0.8);
  if (jpegs.length === 0) return false;

  const fileIds: string[] = [];
  for (let i = 0; i < jpegs.length; i++) {
    const blob = new Blob([new Uint8Array(jpegs[i])], { type: 'image/jpeg' });
    const result = await uploadFile(blob, `${book.id}-p${i + 1}.jpg`, 'preview');
    fileIds.push(result.file_id);
  }

  await db.update<db.Book>('books', book.id, {
    preview_pages: fileIds,
    cover_url: fileIds[0],
    pdf_url: '',
    total_pages: fileIds.length,
  });

  return true;
}

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || '';
  // Vercel cron secret
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true;
  // Admin JWT
  const token = getTokenFromHeader(auth);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.role === 'admin') return true;
  }
  // Allow unauthenticated if no CRON_SECRET configured (self-hosted / dev)
  if (!CRON_SECRET) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allBooks = await db.getAll<db.Book>('books');
    const pending = allBooks.filter(
      (b) => (b.pdf_url || b.telegram_file_id) && (!b.preview_pages || b.preview_pages.length === 0)
    );

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No pending books' });
    }

    let processed = 0;
    let failed = 0;

    for (const book of pending) {
      try {
        const ok = await processBook(book);
        if (ok) processed++;
        else failed++;
      } catch (err) {
        console.error('[convert-books] Failed to process book', book.id, err);
        failed++;
      }
    }

    return NextResponse.json({ ok: true, processed, failed, pending: pending.length });
  } catch (err: any) {
    console.error('[convert-books] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Also allow POST so the admin panel can call it with a fetch
export async function POST(request: NextRequest) {
  return GET(request);
}
