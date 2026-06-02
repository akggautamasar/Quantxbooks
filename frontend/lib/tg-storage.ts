const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const STORAGE_CHANNEL = process.env.TELEGRAM_STORAGE_CHANNEL_ID!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TG_FILE = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

export type FileType = 'pdf' | 'epub' | 'cover' | 'preview';

export interface UploadResult {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  message_id: number;
  file_name: string;
  thumbnail_file_id?: string; // Telegram auto-generated thumbnail (first page for PDFs)
}

// Upload a file (Blob or ArrayBuffer) to the Telegram storage channel
export async function uploadFile(
  fileData: Blob | ArrayBuffer,
  fileName: string,
  fileType: FileType,
  caption?: string
): Promise<UploadResult> {
  const blob = fileData instanceof Blob
    ? fileData
    : new Blob([fileData], { type: getMimeType(fileType) });

  const form = new FormData();
  form.append('chat_id', STORAGE_CHANNEL);
  form.append('disable_notification', 'true');
  form.append('caption', caption || `[${fileType.toUpperCase()}] ${fileName}`);

  let method: string;
  let fieldName: string;

  if (fileType === 'cover' || fileType === 'preview') {
    method = 'sendPhoto';
    fieldName = 'photo';
  } else {
    method = 'sendDocument';
    fieldName = 'document';
  }

  form.append(fieldName, blob, fileName);

  const res = await fetch(`${TG_API}/${method}`, { method: 'POST', body: form });
  const data = await res.json();

  if (!data.ok) throw new Error(`Telegram upload failed: ${data.description}`);

  const msg = data.result;
  const fileObj = msg.document || msg.photo?.[msg.photo.length - 1];

  // Telegram auto-generates a thumbnail for PDFs — usually the first page
  const thumbObj = msg.document?.thumbnail || msg.document?.thumb;

  return {
    file_id: fileObj.file_id,
    file_unique_id: fileObj.file_unique_id,
    file_size: fileObj.file_size || 0,
    message_id: msg.message_id,
    file_name: fileName,
    thumbnail_file_id: thumbObj?.file_id,
  };
}

// Download a Telegram thumbnail and re-upload it as a cover photo to the storage channel
export async function uploadThumbnailAsPhoto(
  thumbnailFileId: string,
  baseName: string
): Promise<UploadResult | null> {
  try {
    const filePath = await getFilePath(thumbnailFileId);
    const res = await fetch(`${TG_FILE}/${filePath}`);
    if (!res.ok) return null;
    const blob = new Blob([await res.arrayBuffer()], { type: 'image/jpeg' });
    return await uploadFile(blob, `${baseName}-cover.jpg`, 'cover', `[COVER] ${baseName}`);
  } catch {
    return null;
  }
}

// Get the Telegram download path for a file_id
export async function getFilePath(fileId: string): Promise<string> {
  const res = await fetch(`${TG_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`getFile failed: ${data.description}`);
  return data.result.file_path;
}

// Fetch the file content from Telegram (for proxying to users)
export async function fetchFile(fileId: string): Promise<Response> {
  const filePath = await getFilePath(fileId);
  return fetch(`${TG_FILE}/${filePath}`);
}

// Delete a file message from the storage channel
export async function deleteFile(messageId: number): Promise<boolean> {
  const res = await fetch(`${TG_API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: STORAGE_CHANNEL, message_id: messageId }),
  });
  const data = await res.json();
  return data.ok;
}

function getMimeType(fileType: FileType): string {
  switch (fileType) {
    case 'pdf': return 'application/pdf';
    case 'epub': return 'application/epub+zip';
    case 'cover':
    case 'preview': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
