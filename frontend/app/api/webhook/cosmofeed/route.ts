import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.COSMOFEED_WEBHOOK_SECRET) {
      return NextResponse.json({ success: false, error: 'Invalid webhook secret' }, { status: 401 });
    }

    const { event, data } = await request.json();

    if (event === 'payment.success') {
      const { userId, plan, paymentId, amount } = data;
      const planDetails = SUBSCRIPTION_PLANS.find((p) => p.plan === plan);
      if (!planDetails) return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });

      // Cancel existing active subs
      await db.updateMany<db.Subscription>(
        'subscriptions',
        (s) => s.user_id === userId && s.status === 'active',
        { status: 'cancelled' } as any
      );

      const expiry = new Date(Date.now() + planDetails.duration_days * 86_400_000);
      await db.insert<db.Subscription>('subscriptions', {
        user_id: userId,
        plan,
        amount,
        start_date: new Date().toISOString(),
        expiry_date: expiry.toISOString(),
        status: 'active',
        payment_id: paymentId,
      } as any);

      await db.update<db.User>('users', userId, {
        is_premium: true,
        premium_expiry: expiry.toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const user = await db.getById<db.User>('users', userId);
      if (user && process.env.TELEGRAM_ADMIN_CHAT_ID && process.env.TELEGRAM_BOT_TOKEN) {
        const msg = `💰 <b>Payment Received</b>\nUser: ${user.name}\nPlan: ${planDetails.name}\nAmount: ₹${amount}`;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text: msg, parse_mode: 'HTML' }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cosmofeed webhook error:', err);
    return NextResponse.json({ success: false, error: 'Webhook failed' }, { status: 500 });
  }
}
