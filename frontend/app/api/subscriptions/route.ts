import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

function auth(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const subs = await db.findMany<db.Subscription>(
      'subscriptions',
      (s) => s.user_id === decoded.userId
    );
    subs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return NextResponse.json({ success: true, data: subs });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = auth(request);
    if (!decoded) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { plan, paymentId } = await request.json();
    const planDetails = SUBSCRIPTION_PLANS.find((p) => p.plan === plan);
    if (!planDetails) return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });

    // Cancel existing active subs
    await db.updateMany<db.Subscription>(
      'subscriptions',
      (s) => s.user_id === decoded.userId && s.status === 'active',
      { status: 'cancelled' } as any
    );

    const now = new Date();
    const expiry = new Date(now.getTime() + planDetails.duration_days * 86_400_000);

    const sub = await db.insert<db.Subscription>('subscriptions', {
      user_id: decoded.userId,
      plan: planDetails.plan,
      amount: planDetails.price,
      start_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      status: 'active',
      payment_id: paymentId,
    } as any);

    // Update user premium status
    await db.update<db.User>('users', decoded.userId, {
      is_premium: true,
      premium_expiry: expiry.toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // Notify admin
    const user = await db.getById<db.User>('users', decoded.userId);
    if (user && process.env.TELEGRAM_ADMIN_CHAT_ID && process.env.TELEGRAM_BOT_TOKEN) {
      const msg = `💰 <b>New Subscription</b>\nUser: ${user.name}\nPlan: ${planDetails.name}\nAmount: ₹${planDetails.price}\nExpiry: ${expiry.toLocaleDateString('en-IN')}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text: msg, parse_mode: 'HTML' }),
      });
    }

    return NextResponse.json({ success: true, message: 'Subscription activated!', data: sub });
  } catch (err) {
    console.error('Subscription error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 });
  }
}
