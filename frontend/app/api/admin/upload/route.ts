import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, formatFileSize, FileType } from '@/lib/tg-storage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

function checkAdmin(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = (formData.get('type') as FileType) || 'pdf';
    const bookTitle = (formData.get('title') as string) || 'Unknown';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes: Record<FileType, string[]> = {
      pdf: ['application/pdf'],
      epub: ['application/epub+zip', 'application/octet-stream'],
      cover: ['image/jpeg', 'image/png', 'image/webp'],
      preview: ['image/jpeg', 'image/png', 'image/webp'],
    };

    const allowed = allowedTypes[fileType];
    if (allowed && !allowed.some((t) => file.type.includes(t.split('/')[1]))) {
      // Be lenient — just warn, don't block
      console.warn(`Unexpected MIME type ${file.type} for ${fileType}`);
    }

    // Size limits
    const maxSizes: Record<FileType, number> = {
      pdf: 50 * 1024 * 1024,   // 50 MB
      epub: 50 * 1024 * 1024,  // 50 MB
      cover: 5 * 1024 * 1024,  // 5 MB
      preview: 5 * 1024 * 1024, // 5 MB
    };

    if (file.size > maxSizes[fileType]) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size: ${formatFileSize(maxSizes[fileType])}` },
        { status: 400 }
      );
    }

    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const result = await uploadFile(blob, file.name, fileType, `📚 ${bookTitle} [${fileType.toUpperCase()}]`);

    return NextResponse.json({
      success: true,
      data: {
        file_id: result.file_id,
        file_unique_id: result.file_unique_id,
        file_name: result.file_name,
        file_size: formatFileSize(result.file_size),
        message_id: result.message_id,
      },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
