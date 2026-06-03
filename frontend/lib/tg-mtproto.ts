// MTProto client — server-side only, never used to stream content directly to users.
// Handles files exceeding the Bot API 20 MB limit via gramjs.
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import bigInt from 'big-integer';

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const STORAGE_CHANNEL = process.env.TELEGRAM_STORAGE_CHANNEL_ID || '';

// 512 KB — gramjs hard cap per GetFile request
const CHUNK_SIZE = 512 * 1024;

let _client: TelegramClient | null = null;

export function isAvailable(): boolean {
  return !!(API_ID && API_HASH && BOT_TOKEN);
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

export interface TgFileInfo {
  size: number;
  mimeType: string;
  fileName: string;
}

/**
 * Fetch metadata (size, MIME type, file name) for a document message without
 * downloading the file body.
 */
export async function getFileInfo(
  chatId: string | number,
  messageId: number,
): Promise<TgFileInfo> {
  if (!isAvailable()) throw new Error('MTProto not configured');
  const client = await getClient();
  const entity = await client.getInputEntity(chatId);
  const [msg] = await client.getMessages(entity, { ids: [messageId] });
  if (!msg?.media) throw new Error(`No media at message ${messageId} in chat ${chatId}`);

  const doc = (msg.media as any).document;
  if (!doc) throw new Error('Message does not contain a document');

  const attr = (doc.attributes || []).find(
    (a: any) => a.className === 'DocumentAttributeFilename',
  );
  // doc.size may be a BigInt from the Telegram layer
  const size = typeof doc.size === 'object' ? Number(doc.size) : (doc.size as number);

  return {
    size,
    mimeType: (doc.mimeType as string) || 'application/octet-stream',
    fileName: (attr?.fileName as string) || 'file',
  };
}

/**
 * Stream a byte range [start, end] of a Telegram document via MTProto,
 * yielding 512 KB chunks (BeyondDrive-style chunk streaming).
 *
 * start and end are inclusive byte positions (like HTTP Range).
 */
export async function* streamFromChat(
  chatId: string | number,
  messageId: number,
  start: number,
  end: number,
): AsyncGenerator<Buffer> {
  if (!isAvailable()) throw new Error('MTProto not configured');
  const client = await getClient();
  const entity = await client.getInputEntity(chatId);
  const [msg] = await client.getMessages(entity, { ids: [messageId] });
  if (!msg?.media) throw new Error(`No media at message ${messageId} in chat ${chatId}`);

  const doc = (msg.media as any).document;
  if (!doc) throw new Error('Message does not contain a document');

  // Align start byte down to the nearest chunk boundary
  const alignedOffset = start - (start % CHUNK_SIZE);
  const firstPartCut = start - alignedOffset; // bytes to skip at start of first chunk
  const lastPartEnd = (end % CHUNK_SIZE) + 1; // bytes to keep from last chunk
  const reqLength = end - start + 1;
  const partCount =
    Math.ceil((end + 1) / CHUNK_SIZE) - Math.floor(alignedOffset / CHUNK_SIZE);

  const location = new Api.InputDocumentFileLocation({
    id: doc.id,
    accessHash: doc.accessHash,
    fileReference: doc.fileReference,
    thumbSize: '',
  });

  let part = 0;
  for await (const chunk of client.iterDownload({
    file: location,
    offset: bigInt(alignedOffset),
    requestSize: CHUNK_SIZE,
    limit: partCount,
  })) {
    if (!chunk || !chunk.length) break;
    part++;

    const buf: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);

    let sliced: Buffer;
    if (partCount === 1) {
      // Only chunk — slice both start and end
      sliced = buf.subarray(firstPartCut, firstPartCut + reqLength);
    } else if (part === 1) {
      // First of multiple chunks — skip bytes before `start`
      sliced = buf.subarray(firstPartCut);
    } else if (part === partCount) {
      // Last chunk — keep only up to `end`
      sliced = buf.subarray(0, lastPartEnd);
    } else {
      sliced = buf;
    }

    if (sliced.length > 0) yield sliced;
    if (part >= partCount) break;
  }
}

/**
 * Download a file from any Telegram chat by message ID (full file, legacy path).
 * Prefer streamFromChat for large files — this buffers everything in RAM.
 */
export async function downloadFromChat(
  chatId: string | number,
  messageId: number,
): Promise<Buffer> {
  if (!isAvailable()) {
    throw new Error('MTProto not configured (TELEGRAM_API_ID / TELEGRAM_API_HASH missing)');
  }
  const client = await getClient();
  const entity = await client.getInputEntity(chatId);
  const [msg] = await client.getMessages(entity, { ids: [messageId] });
  if (!msg?.media) throw new Error(`No media at message ${messageId} in chat ${chatId}`);
  const result = await client.downloadMedia(msg, {});
  if (!result) throw new Error('downloadMedia returned empty');
  return Buffer.isBuffer(result) ? result : Buffer.from(result as any);
}

/** Convenience wrapper — download from the storage channel (legacy channel uploads). */
export async function downloadByMessageId(messageId: number): Promise<Buffer> {
  return downloadFromChat(STORAGE_CHANNEL, messageId);
}
