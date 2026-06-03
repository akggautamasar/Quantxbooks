import { v4 as uuidv4 } from 'uuid';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const DB_CHAT_ID = process.env.TELEGRAM_DB_CHAT_ID!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TG_FILE = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  is_premium: boolean;
  premium_expiry?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  telegram_chat_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  pdf_url?: string;
  epub_url?: string;
  preview_pages: string[];
  category: string;
  tags: string[];
  language: string;
  total_pages?: number;
  file_size?: string;
  is_premium: boolean;
  is_featured: boolean;
  download_count: number;
  view_count: number;
  telegram_file_id?: string;
  telegram_message_id?: number;
  telegram_source_chat_id?: string; // chat where the file actually lives (DM or storage channel)
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  amount: number;
  start_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_id?: string;
  created_at: string;
}

export interface OTPRecord {
  id: string;
  mobile: string;
  otp: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
  created_at: string;
}

export interface ReadingHistory {
  id: string;
  user_id: string;
  book_id: string;
  last_page: number;
  total_pages: number;
  progress_percentage: number;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  note?: string;
  created_at: string;
}

export interface TGDatabase {
  users: User[];
  books: Book[];
  subscriptions: Subscription[];
  otps: OTPRecord[];
  reading_history: ReadingHistory[];
  bookmarks: Bookmark[];
  _version: number;
}

type CollectionKey = 'users' | 'books' | 'subscriptions' | 'otps' | 'reading_history' | 'bookmarks';

// ─── In-memory cache ──────────────────────────────────────────────────────────

let _cache: TGDatabase | null = null;
let _cacheTs = 0;
let _pinnedMsgId: number | null = null;
let _writeQueue: Promise<void> = Promise.resolve();

const CACHE_TTL = 20_000; // 20 seconds

function emptyDb(): TGDatabase {
  return {
    users: [],
    books: [],
    subscriptions: [],
    otps: [],
    reading_history: [],
    bookmarks: [],
    _version: 0,
  };
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────

async function tgGet(method: string, params: Record<string, string> = {}) {
  const url = new URL(`${TG_API}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function tgPost(method: string, body: Record<string, any>) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Database I/O ─────────────────────────────────────────────────────────────

async function loadDb(forceFresh = false): Promise<TGDatabase> {
  // Return cache if fresh — unless the caller demands the canonical copy from
  // Telegram. Writes always force a fresh load so concurrent serverless
  // instances can't overwrite each other's recently-added records.
  if (!forceFresh && _cache && Date.now() - _cacheTs < CACHE_TTL) return _cache;

  try {
    // Get the pinned message from the DB chat
    const chatRes = await tgGet('getChat', { chat_id: DB_CHAT_ID });
    if (!chatRes.ok) throw new Error(chatRes.description);

    const pinned = chatRes.result?.pinned_message;
    if (!pinned?.document?.file_id) {
      // No database yet - return empty
      _cache = emptyDb();
      _cacheTs = Date.now();
      return _cache;
    }

    _pinnedMsgId = pinned.message_id;

    // Get the file path
    const fileRes = await tgGet('getFile', { file_id: pinned.document.file_id });
    if (!fileRes.ok) throw new Error(fileRes.description);

    // Download the file
    const content = await fetch(`${TG_FILE}/${fileRes.result.file_path}`);
    const db: TGDatabase = await content.json();

    _cache = db;
    _cacheTs = Date.now();
    return db;
  } catch (err) {
    console.error('[tg-db] loadDb error:', err);
    // Serve stale cache rather than pretending the DB is empty. An empty DB
    // causes every lookup to silently return null ("Book not found") when in
    // reality Telegram is temporarily unavailable.
    if (_cache) return _cache;
    throw err; // no cache — let the caller surface the real error
  }
}

async function saveDb(db: TGDatabase): Promise<void> {
  db._version += 1;

  const json = JSON.stringify(db);
  const blob = new Blob([json], { type: 'application/json' });
  const form = new FormData();

  if (_pinnedMsgId) {
    // Edit the existing pinned message's document
    form.append('chat_id', DB_CHAT_ID);
    form.append('message_id', _pinnedMsgId.toString());
    form.append('media', JSON.stringify({ type: 'document', media: 'attach://db' }));
    form.append('db', blob, 'quantxbooks-db.json');

    const res = await fetch(`${TG_API}/editMessageMedia`, { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(`editMessageMedia failed: ${data.description}`);
  } else {
    // First time: send a new document and pin it
    form.append('chat_id', DB_CHAT_ID);
    form.append('document', blob, 'quantxbooks-db.json');
    form.append('caption', '📚 QuantXBooks Database — do not delete or unpin');
    form.append('disable_notification', 'true');

    const res = await fetch(`${TG_API}/sendDocument`, { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(`sendDocument failed: ${data.description}`);

    _pinnedMsgId = data.result.message_id;

    // Pin the message
    await tgPost('pinChatMessage', {
      chat_id: DB_CHAT_ID,
      message_id: _pinnedMsgId,
      disable_notification: true,
    });
  }

  _cache = db;
  _cacheTs = Date.now();
}

// Serialize writes to avoid race conditions.
// Each write recovers from previous failures so a single Telegram hiccup
// (rate limit, transient error) doesn't permanently block the queue.
async function write(fn: (db: TGDatabase) => void | TGDatabase): Promise<void> {
  _writeQueue = _writeQueue
    .catch(() => {}) // previous failure must not block future writes
    .then(async () => {
      // Force a fresh load from Telegram before mutating. Without this, an
      // instance holding a 20s-stale cache would save its outdated snapshot and
      // wipe books that other instances added in the meantime.
      const snapshot = await loadDb(true);
      // Deep-clone so fn() never mutates _cache before a successful save.
      // Without this, a failed saveDb leaves the cache ahead of Telegram,
      // causing books to appear on the site but not be found on read.
      const db: TGDatabase = JSON.parse(JSON.stringify(snapshot));
      const result = fn(db);
      await saveDb(result !== undefined ? result : db);
    });
  return _writeQueue;
}

// ─── Public CRUD API ─────────────────────────────────────────────────────────

export async function getAll<T>(collection: CollectionKey): Promise<T[]> {
  const db = await loadDb();
  return [...(db[collection] as unknown as T[])];
}

export async function getById<T extends { id: string }>(
  collection: CollectionKey,
  id: string
): Promise<T | null> {
  let db = await loadDb();
  let found = (db[collection] as unknown as T[]).find((item) => item.id === id);
  if (!found) {
    // Miss can mean either (a) this lambda's cache predates a recent write, or
    // (b) Telegram's editMessageMedia hasn't propagated yet to other instances.
    // Wait 800 ms so Telegram has time to propagate the write, then retry once
    // with a forced fresh load before declaring the record absent.
    await new Promise((r) => setTimeout(r, 800));
    db = await loadDb(true);
    found = (db[collection] as unknown as T[]).find((item) => item.id === id);
  }
  return found ?? null;
}

export async function findOne<T>(
  collection: CollectionKey,
  predicate: (item: T) => boolean
): Promise<T | null> {
  const db = await loadDb();
  const arr = db[collection] as unknown as T[];
  return arr.find(predicate) ?? null;
}

export async function findMany<T>(
  collection: CollectionKey,
  predicate: (item: T) => boolean
): Promise<T[]> {
  const db = await loadDb();
  const arr = db[collection] as unknown as T[];
  return arr.filter(predicate);
}

export async function insert<T extends { id: string; created_at: string }>(
  collection: CollectionKey,
  data: Omit<T, 'id' | 'created_at'>
): Promise<T> {
  const now = new Date().toISOString();
  const record = { ...data, id: uuidv4(), created_at: now } as unknown as T;
  await write((db) => {
    (db[collection] as unknown[]).push(record);
  });
  return record;
}

export async function update<T extends { id: string }>(
  collection: CollectionKey,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  let updated: T | null = null;
  await write((db) => {
    const arr = db[collection] as unknown as T[];
    const idx = arr.findIndex((item) => item.id === id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...data, id, updated_at: new Date().toISOString() } as T;
      updated = arr[idx];
    }
  });
  return updated;
}

export async function upsert<T extends { id: string }>(
  collection: CollectionKey,
  matcher: (item: T) => boolean,
  data: Partial<T> & { id?: string; created_at?: string }
): Promise<T> {
  let record: T | null = null;
  await write((db) => {
    const arr = db[collection] as unknown as T[];
    const idx = arr.findIndex(matcher);
    const now = new Date().toISOString();
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...data, updated_at: now } as T;
      record = arr[idx];
    } else {
      const newRecord = { ...data, id: data.id || uuidv4(), created_at: data.created_at || now, updated_at: now } as unknown as T;
      arr.push(newRecord);
      record = newRecord;
    }
  });
  return record!;
}

export async function remove(collection: CollectionKey, id: string): Promise<boolean> {
  let removed = false;
  await write((db) => {
    const arr = db[collection] as { id: string }[];
    const idx = arr.findIndex((item) => item.id === id);
    if (idx !== -1) {
      arr.splice(idx, 1);
      removed = true;
    }
  });
  return removed;
}

export async function count(collection: CollectionKey, predicate?: (item: any) => boolean): Promise<number> {
  const db = await loadDb();
  const arr = db[collection] as unknown[];
  return predicate ? arr.filter(predicate).length : arr.length;
}

export async function updateMany<T extends { id: string }>(
  collection: CollectionKey,
  matcher: (item: T) => boolean,
  data: Partial<T>
): Promise<number> {
  let n = 0;
  await write((db) => {
    const arr = db[collection] as unknown as T[];
    const now = new Date().toISOString();
    arr.forEach((item, idx) => {
      if (matcher(item)) {
        arr[idx] = { ...item, ...data, updated_at: now };
        n++;
      }
    });
  });
  return n;
}

// Force invalidate the cache (useful after writes from other processes)
export function invalidateCache() {
  _cache = null;
  _cacheTs = 0;
}

// Initialize the database (call once on setup)
export async function initializeDb(): Promise<{ ok: boolean; message: string }> {
  try {
    if (!BOT_TOKEN || !DB_CHAT_ID) {
      return { ok: false, message: 'TELEGRAM_BOT_TOKEN and TELEGRAM_DB_CHAT_ID must be set' };
    }
    // Reset pinned msg id to force re-check
    _pinnedMsgId = null;
    const db = emptyDb();
    await saveDb(db);
    return { ok: true, message: 'Database initialized and pinned in Telegram chat' };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}
