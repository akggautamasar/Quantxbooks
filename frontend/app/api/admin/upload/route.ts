import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, uploadThumbnailAsPhoto, formatFileSize, FileType } from '@/lib/tg-storage';
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

    // Size limits
    const maxSizes: Record<FileType, number> = {
      pdf: 50 * 1024 * 1024,
      epub: 50 * 1024 * 1024,
      cover: 5 * 1024 * 1024,
      preview: 5 * 1024 * 1024,
    };

    if (file.size > maxSizes[fileType]) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size: ${formatFileSize(maxSizes[fileType])}` },
        { status: 400 }
      );
    }

    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const result = await uploadFile(blob, file.name, fileType, `📚 ${bookTitle} [${fileType.toUpperCase()}]`);

    // For PDFs and EPUBs, Telegram auto-generates a thumbnail from the first page.
    // Download it and re-upload as a cover photo automatically.
    let autoCover: { file_id: string; file_name: string } | null = null;
    if ((fileType === 'pdf' || fileType === 'epub') && result.thumbnail_file_id) {
      const baseName = file.name.replace(/\.(pdf|epub)$/i, '');
      const coverResult = await uploadThumbnailAsPhoto(result.thumbnail_file_id, baseName);
      if (coverResult) {
        autoCover = { file_id: coverResult.file_id, file_name: coverResult.file_name };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        file_id: result.file_id,
        file_unique_id: result.file_unique_id,
        file_name: result.file_name,
        file_size: formatFileSize(result.file_size),
        message_id: result.message_id,
        auto_cover: autoCover, // populated when Telegram generated a first-page thumbnail
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
