import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const supabase = getServiceSupabase();
    const { data: users } = await supabase
      .from('users')
      .select('id, name, mobile, email, is_premium, premium_expiry, role, created_at')
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
