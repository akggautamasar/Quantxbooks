import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { uploadThumbnailAsPhoto, formatFileSize } from '@/lib/tg-storage';

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

// Auto-create a book record when a PDF/EPUB is posted directly to the storage channel
async function handleChannelPost(post: any) {
  const doc = post.document;
  if (!doc) return;

  const isPdf = doc.mime_type === 'application/pdf';
  const isEpub = doc.mime_type === 'application/epub+zip';
  if (!isPdf && !isEpub) return;

  // De-duplicate: skip if this file_id is already in the database
  const existing = await db.findOne<db.Book>('books', (b) => b.telegram_file_id === doc.file_id);
  if (existing) return;

  const rawName = doc.file_name || 'Unknown Book';
  const title = rawName.replace(/\.(pdf|epub)$/i, '').replace(/[-_]/g, ' ').trim();

  // Use Telegram's auto-generated thumbnail (first page) as the cover
  let coverFileId = '';
  const thumb = doc.thumbnail || doc.thumb;
  if (thumb?.file_id) {
    const coverResult = await uploadThumbnailAsPhoto(thumb.file_id, title);
    if (coverResult) coverFileId = coverResult.file_id;
  }

  await db.insert<db.Book>('books', {
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
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // ── Channel post: auto-add books from storage channel ──────────────────────
    const channelPost = update?.channel_post;
    if (channelPost) {
      const chatId = String(channelPost.chat?.id);
      if (chatId === String(STORAGE_CHANNEL_ID)) {
        await handleChannelPost(channelPost);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Regular user messages (OTP, commands) ─────────────────────────────────
    const message = update?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'User';

    if (text === '/start') {
      await sendMessage(chatId, `
👋 <b>Welcome to QuantXBooks Bot, ${firstName}!</b>

I help you verify your identity for QuantXBooks — India's premium digital library.

<b>Your Chat ID is: <code>${chatId}</code></b>

Use this ID when registering or logging in on QuantXBooks to receive OTP codes here.

🔐 Commands:
/myid — Get your Telegram Chat ID
/help — Show this help message

📚 Visit QuantXBooks to start your reading journey!
      `);
      return NextResponse.json({ ok: true });
    }

    if (text === '/myid') {
      await sendMessage(chatId, `
🆔 <b>Your Telegram Chat ID</b>

<code>${chatId}</code>

Copy this ID and use it when registering on QuantXBooks.
      `);
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendMessage(chatId, `
📖 <b>QuantXBooks Bot Help</b>

<b>Commands:</b>
/start — Welcome message & your Chat ID
/myid — Get your Telegram Chat ID
/help — Show this message

<b>How to use:</b>
1. Visit QuantXBooks website
2. Enter your mobile number
3. Paste your Chat ID (<code>${chatId}</code>) in the field
4. Click "Send OTP"
5. I'll send you the OTP here!
      `);
      return NextResponse.json({ ok: true });
    }

    if (/^\d{6}$/.test(text.trim())) {
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
