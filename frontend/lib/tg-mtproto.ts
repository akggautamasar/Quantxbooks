// MTProto client — used ONLY for server-side download of Telegram files that
// exceed the Bot API 20 MB limit.  It is NEVER used to stream content to users.
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
  const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, {
    connectionRetries: 3,
  });
  await client.start({ botAuthToken: BOT_TOKEN });
  _client = client;
  return client;
}

/** Download any file from the storage channel by message ID. */
export async function downloadByMessageId(messageId: number): Promise<Buffer> {
  if (!isAvailable()) {
    throw new Error('MTProto not configured (TELEGRAM_API_ID / TELEGRAM_API_HASH missing)');
  }
  const client = await getClient();
  const entity = await client.getInputEntity(STORAGE_CHANNEL);
  const [msg] = await client.getMessages(entity, { ids: [messageId] });
  if (!msg?.media) throw new Error(`No media at message ${messageId}`);
  const result = await client.downloadMedia(msg, {});
  if (!result) throw new Error('downloadMedia returned empty');
  return Buffer.isBuffer(result) ? result : Buffer.from(result as any);
}
