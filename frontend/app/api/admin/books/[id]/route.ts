import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

function checkAdmin(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!checkAdmin(request)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const ok = await db.remove('books', params.id);
    if (!ok) return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Book deleted' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete book' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!checkAdmin(request)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const book = await db.update<db.Book>('books', params.id, { ...body, updated_at: new Date().toISOString() } as any);
    if (!book) return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: book });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update book' }, { status: 500 });
  }
}
