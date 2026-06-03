import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const STORAGE_CHANNEL = process.env.TELEGRAM_STORAGE_CHANNEL_ID || '';

let _client: TelegramClient | null = null;

export function isAvailable(): boolean {
  return !!(API_ID && API_HASH && BOT_TOKEN && STORAGE_CHANNEL);
}

async function getClient(): Promise<TelegramClient> {
  if (_client?.connected) return _client;

  const session = new StringSession('');
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({ botAuthToken: BOT_TOKEN });
  _client = client;
  return client;
}

// 80 MB hard limit — larger files time out Vercel's 60s function limit.
const MAX_MTPROTO_BYTES = 80 * 1024 * 1024;

export async function downloadByMessageId(messageId: number): Promise<Buffer> {
  if (!isAvailable()) {
    throw new Error('MTProto not configured: TELEGRAM_API_ID and TELEGRAM_API_HASH env vars required');
  }

  const client = await getClient();
  const entity = await client.getInputEntity(STORAGE_CHANNEL);
  const messages = await client.getMessages(entity, { ids: [messageId] });

  if (!messages.length || !messages[0]) {
    throw new Error(`Message ${messageId} not found in storage channel`);
  }

  const msg = messages[0];
  if (!msg.media) throw new Error('No media found in message');

  // Fail fast for files that would exceed Vercel's function timeout.
  const fileSize: number = (msg.media as any)?.document?.size ?? 0;
  if (fileSize > MAX_MTPROTO_BYTES) {
    throw new Error(
      `FILE_TOO_LARGE:${fileSize}`
    );
  }

  const result = await client.downloadMedia(msg, {});
  if (!result) throw new Error('downloadMedia returned empty result');

  return Buffer.isBuffer(result) ? result : Buffer.from(result as any);
}
