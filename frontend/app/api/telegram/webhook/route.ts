import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { fetchFile, uploadFile, formatFileSize } from '@/lib/tg-storage';
import { pdfToJpegPages } from '@/lib/pdf-to-images';

export const runtime = 'nodejs';
// Allow up to 60 s so page-image conversion can complete for most books.
export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STORAGE_CHANNEL_ID = process.env.TELEGRAM_STORAGE_CHANNEL_ID;

async function sendMessage(chatId: string | number, text: string, parseMode = 'HTML') {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

// Download the PDF (Bot API, ≤ 20 MB), render every page to JPEG, upload each
// page as a Telegram photo, then update the book record with preview_pages.
async function convertBookToPageImages(bookId: string, fileId: string, fileSizeBytes: number) {
  const TWENTY_MB = 20 * 1024 * 1024;
  if (fileSizeBytes > TWENTY_MB) return; // Bot API cannot download files >20 MB

  try {
    const tgRes = await fetchFile(fileId);
    if (!tgRes.ok) return;
    const pdfData = await tgRes.arrayBuffer();

    const jpegs = await pdfToJpegPages(pdfData, 1.5, 0.8);
    if (jpegs.length === 0) return;

    const fileIds: string[] = [];
    for (let i = 0; i < jpegs.length; i++) {
      const blob = new Blob([new Uint8Array(jpegs[i])], { type: 'image/jpeg' });
      const result = await uploadFile(blob, `${bookId}-p${i + 1}.jpg`, 'preview');
      fileIds.push(result.file_id);
    }

    await db.update<db.Book>('books', bookId, {
      preview_pages: fileIds,
      cover_url: fileIds[0],
      pdf_url: '',
      total_pages: fileIds.length,
    });
  } catch (err) {
    console.error('[webhook] page-image conversion failed for book', bookId, err);
  }
}

// Create a book record from a Telegram document object and convert it to page images.
async function ingestDocument(
  doc: any,
): Promise<{ created: boolean; title: string }> {
  const isPdf = doc.mime_type === 'application/pdf';
  const isEpub = doc.mime_type === 'application/epub+zip';
  if (!isPdf && !isEpub) return { created: false, title: '' };

  // De-duplicate by file_id
  const existing = await db.findOne<db.Book>('books', (b) => b.telegram_file_id === doc.file_id);
  if (existing) return { created: false, title: existing.title };

  const rawName = doc.file_name || 'Unknown Book';
  const title = rawName.replace(/\.(pdf|epub)$/i, '').replace(/[-_]+/g, ' ').trim();

  const thumb = doc.thumbnail || doc.thumb;
  const coverFileId = thumb?.file_id || '';

  const record = await db.insert<db.Book>('books', {
    title,
    author: 'Unknown',
    description: '',
    cover_url: coverFileId,
    pdf_url: isPdf ? doc.file_id : '',
    epub_url: isEpub ? doc.file_id : '',
    category: 'Uncategorized',
    tags: [],
    language: 'English',
    total_pages: undefined,
    file_size: formatFileSize(doc.file_size || 0),
    is_premium: true,
    is_featured: false,
    download_count: 0,
    view_count: 0,
    telegram_file_id: doc.file_id,
    preview_pages: [],
    updated_at: new Date().toISOString(),
  } as any);

  // Convert PDF to page images synchronously (within the 60 s function window).
  // EPUBs are served from pdf_url / epub_url and do not need page conversion.
  if (isPdf) {
    await convertBookToPageImages(record.id, doc.file_id, doc.file_size || 0);
  }

  return { created: true, title };
}

// Handle new document posted directly to the storage channel
async function handleChannelPost(post: any) {
  if (!post.document) return;
  const chatId = String(post.chat?.id);
  if (chatId !== String(STORAGE_CHANNEL_ID)) return;
  await ingestDocument(post.document);
}

// Handle any user forwarding a PDF/EPUB to the bot
async function handleDocumentMessage(message: any) {
  const doc = message.document;
  if (!doc) return false;

  const isPdf = doc.mime_type === 'application/pdf';
  const isEpub = doc.mime_type === 'application/epub+zip';
  if (!isPdf && !isEpub) return false;

  const chatId = message.chat.id;
  const existing = await db.findOne<db.Book>('books', (b) => b.telegram_file_id === doc.file_id);
  if (existing) {
    await sendMessage(chatId, `⚠️ Already in library: <b>${existing.title}</b>`);
    return true;
  }

  const TWENTY_MB = 20 * 1024 * 1024;
  const tooBig = isPdf && (doc.file_size || 0) > TWENTY_MB;
  await sendMessage(
    chatId,
    tooBig
      ? `⏳ Adding to library... (file is &gt;20 MB — please also upload via Admin → Upload for page-image reading)`
      : `⏳ Adding to library and converting pages…`
  );

  const { created, title } = await ingestDocument(doc);
  if (created) {
    await sendMessage(chatId, `✅ Added: <b>${title}</b>\n\nEdit title/author/category at /admin/books`);
  } else {
    await sendMessage(chatId, `❌ Could not add — file type not supported.`);
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    if (update?.channel_post) {
      await handleChannelPost(update.channel_post);
      return NextResponse.json({ ok: true });
    }

    const message = update?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const firstName = message.from?.first_name || 'User';

    if (await handleDocumentMessage(message)) {
      return NextResponse.json({ ok: true });
    }

    if (text === '/start') {
      await sendMessage(chatId, `👋 <b>Welcome to QuantXBooks Bot, ${firstName}!</b>

I help you verify your identity for QuantXBooks — India's premium digital library.

<b>Your Chat ID is: <code>${chatId}</code></b>

Use this ID when registering or logging in on QuantXBooks to receive OTP codes here.

🔐 Commands:
/myid — Get your Telegram Chat ID
/help — Show this help message`);
      return NextResponse.json({ ok: true });
    }

    if (text === '/myid') {
      await sendMessage(chatId, `🆔 <b>Your Telegram Chat ID</b>\n\n<code>${chatId}</code>\n\nCopy this ID and use it when registering on QuantXBooks.`);
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendMessage(chatId, `📖 <b>QuantXBooks Bot Help</b>

/start — Welcome message & your Chat ID
/myid — Get your Telegram Chat ID

<b>How to log in:</b>
1. Visit QuantXBooks website
2. Enter your mobile number
3. Paste your Chat ID (<code>${chatId}</code>)
4. Click "Send OTP" — I'll send it here!`);
      return NextResponse.json({ ok: true });
    }

    if (/^\d{6}$/.test(text)) {
      await sendMessage(chatId, `⚠️ Please don't send OTP codes here. Enter the OTP on the QuantXBooks website.`);
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, `👋 Hi ${firstName}! Your Chat ID is: <code>${chatId}</code>\n\nUse /help to see available commands.`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'QuantXBooks Telegram Bot' });
}
