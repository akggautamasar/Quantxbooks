import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { formatFileSize } from '@/lib/tg-storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const STORAGE_CHANNEL_ID = process.env.TELEGRAM_STORAGE_CHANNEL_ID!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: string | number, text: string, parseMode = 'HTML') {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

/**
 * Forward a DM message to the storage channel.
 * Forwarding never re-uploads — Telegram just creates a pointer, so it works
 * for files of any size (even > 20 MB). MTProto can then always look in the
 * storage channel, which it can always resolve.
 * Returns the storage-channel message_id, or null on failure.
 */
async function forwardToStorageChannel(
  fromChatId: number,
  messageId: number,
): Promise<number | null> {
  const res = await fetch(`${TG_API}/forwardMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_chat_id: fromChatId,
      chat_id: STORAGE_CHANNEL_ID,
      message_id: messageId,
      disable_notification: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('[webhook] forwardMessage failed:', data.description);
    return null;
  }
  return data.result.message_id as number;
}

async function ingestDocument(
  doc: any,
  storageMessageId?: number,
): Promise<{ created: boolean; title: string }> {
  const isPdf = doc.mime_type === 'application/pdf';
  const isEpub = doc.mime_type === 'application/epub+zip';
  if (!isPdf && !isEpub) return { created: false, title: '' };

  const existing = await db.findOne<db.Book>('books', (b) => b.telegram_file_id === doc.file_id);
  if (existing) return { created: false, title: existing.title };

  const rawName = doc.file_name || 'Unknown Book';
  const title = rawName.replace(/\.(pdf|epub)$/i, '').replace(/[-_]+/g, ' ').trim();

  const thumb = doc.thumbnail || doc.thumb;

  await db.insert<db.Book>('books', {
    title,
    author: 'Unknown',
    description: '',
    cover_url: thumb?.file_id || '',
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
    // Always points to the storage channel — MTProto can reliably access it there
    telegram_message_id: storageMessageId,
    telegram_source_chat_id: storageMessageId ? String(STORAGE_CHANNEL_ID) : undefined,
    preview_pages: [],
    updated_at: new Date().toISOString(),
  } as any);

  return { created: true, title };
}

// Channel post: document uploaded directly to the storage channel
async function handleChannelPost(post: any) {
  if (!post.document) return;
  if (String(post.chat?.id) !== String(STORAGE_CHANNEL_ID)) return;
  // Already in the storage channel — message_id is ready to use
  await ingestDocument(post.document, post.message_id);
}

// Bot DM: user forwarded / sent a PDF to the bot
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

  await sendMessage(chatId, `⏳ Adding to library...`);

  // Forward to the storage channel so MTProto always finds the file in one place
  const storageMessageId = await forwardToStorageChannel(message.chat.id, message.message_id);

  const { created, title } = await ingestDocument(doc, storageMessageId ?? undefined);

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
