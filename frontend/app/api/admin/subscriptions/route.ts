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

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const [subs, users] = await Promise.all([
      db.getAll<db.Subscription>('subscriptions'),
      db.getAll<db.User>('users'),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const enriched = subs.map((s) => ({ ...s, user: userMap.get(s.user_id) }));
    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return NextResponse.json({ success: true, data: enriched });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
