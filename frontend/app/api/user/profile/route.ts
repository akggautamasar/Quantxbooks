import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

function auth(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await db.getById<db.User>('users', decoded.userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { name, email, telegram_chat_id } = await request.json();
    const user = await db.update<db.User>('users', decoded.userId, {
      ...(name && { name }),
      ...(email !== undefined && { email }),
      ...(telegram_chat_id !== undefined && { telegram_chat_id }),
      updated_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
