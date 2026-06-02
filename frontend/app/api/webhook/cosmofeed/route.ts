import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { notifyNewSubscription } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.COSMOFEED_WEBHOOK_SECRET) {
      return NextResponse.json({ success: false, error: 'Invalid webhook secret' }, { status: 401 });
    }

    const { event, data } = body;

    if (event === 'payment.success') {
      const { userId, plan, paymentId, amount } = data;
      const planDetails = SUBSCRIPTION_PLANS.find((p) => p.plan === plan);
      if (!planDetails) return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });

      const supabase = getServiceSupabase();
      const expiryDate = new Date(Date.now() + planDetails.duration_days * 24 * 60 * 60 * 1000);

      // Cancel existing subscriptions
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      // Create new subscription
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan,
        amount,
        expiry_date: expiryDate.toISOString(),
        status: 'active',
        payment_id: paymentId,
        payment_provider: 'cosmofeed',
      });

      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (user) {
        await notifyNewSubscription(user.name, planDetails.name, amount);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cosmofeed webhook error:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
