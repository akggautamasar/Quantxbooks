import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { count: premiumUsers },
      { count: totalBooks },
      { count: totalSubscriptions },
      { count: newUsersThisMonth },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thisMonth.toISOString()),
    ]);

    const { data: revenueData } = await supabase
      .from('subscriptions')
      .select('amount')
      .eq('status', 'active')
      .gte('created_at', thisMonth.toISOString());

    const revenueThisMonth = revenueData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        premium_users: premiumUsers || 0,
        total_books: totalBooks || 0,
        total_subscriptions: totalSubscriptions || 0,
        revenue_this_month: revenueThisMonth,
        new_users_this_month: newUsersThisMonth || 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
