import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { notifyNewSubscription } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const supabase = getServiceSupabase();
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: subscriptions });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const { plan, paymentId } = await request.json();
    const planDetails = SUBSCRIPTION_PLANS.find((p) => p.plan === plan);

    if (!planDetails) {
      return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + planDetails.duration_days * 24 * 60 * 60 * 1000);

    // Expire existing active subscriptions
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', decoded.userId)
      .eq('status', 'active');

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: decoded.userId,
        plan,
        amount: planDetails.price,
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        status: 'active',
        payment_id: paymentId,
      })
      .select()
      .single();

    if (error) throw error;

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', decoded.userId)
      .single();

    if (user) {
      await notifyNewSubscription(user.name, planDetails.name, planDetails.price);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      data: subscription,
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 });
  }
}
