import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const supabase = getServiceSupabase();

    const updateData: Record<string, any> = {};
    if ('is_premium' in body) {
      updateData.is_premium = body.is_premium;
      if (body.is_premium) {
        updateData.premium_expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        updateData.premium_expiry = null;
      }
    }
    if ('role' in body) updateData.role = body.role;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
