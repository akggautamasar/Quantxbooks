import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [users, books, subscriptions] = await Promise.all([
      db.getAll<db.User>('users'),
      db.getAll<db.Book>('books'),
      db.getAll<db.Subscription>('subscriptions'),
    ]);

    const premiumUsers = users.filter((u) => u.is_premium).length;
    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;
    const newUsersThisMonth = users.filter((u) => u.created_at >= monthStart).length;
    const revenueThisMonth = subscriptions
      .filter((s) => s.status === 'active' && s.created_at >= monthStart)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        total_users: users.length,
        premium_users: premiumUsers,
        total_books: books.length,
        total_subscriptions: activeSubscriptions,
        revenue_this_month: revenueThisMonth,
        new_users_this_month: newUsersThisMonth,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
