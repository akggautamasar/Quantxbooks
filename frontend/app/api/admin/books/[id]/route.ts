import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

async function checkAdmin(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('books').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Book deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete book' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const supabase = getServiceSupabase();
    const { data: book, error } = await supabase
      .from('books')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: book });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update book' }, { status: 500 });
  }
}
