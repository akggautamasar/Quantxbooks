import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const supabase = getServiceSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, mobile, email, is_premium, premium_expiry, avatar_url, role, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const { name, email, telegram_chat_id } = await request.json();
    const supabase = getServiceSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .update({ name, email, telegram_chat_id })
      .eq('id', decoded.userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
