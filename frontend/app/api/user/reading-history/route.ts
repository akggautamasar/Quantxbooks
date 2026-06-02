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
    const { data } = await supabase
      .from('reading_history')
      .select('*, book:books(*)')
      .eq('user_id', decoded.userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reading history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const { bookId, lastPage, totalPages } = await request.json();
    const progressPercentage = totalPages > 0 ? Math.round((lastPage / totalPages) * 100) : 0;

    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('reading_history')
      .upsert({
        user_id: decoded.userId,
        book_id: bookId,
        last_page: lastPage,
        total_pages: totalPages,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update reading history' }, { status: 500 });
  }
}
