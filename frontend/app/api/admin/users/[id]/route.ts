import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const updateData: Partial<db.User> & Record<string, any> = {};

    if ('is_premium' in body) {
      updateData.is_premium = body.is_premium;
      updateData.premium_expiry = body.is_premium
        ? new Date(Date.now() + 30 * 86_400_000).toISOString()
        : undefined;
    }
    if ('role' in body) updateData.role = body.role;
    updateData.updated_at = new Date().toISOString();

    const user = await db.update<db.User>('users', params.id, updateData as any);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
