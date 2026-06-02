import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceSupabase();
    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !book) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from('books')
      .update({ view_count: book.view_count + 1 })
      .eq('id', params.id);

    // Check user premium status
    const token = getTokenFromHeader(request.headers.get('authorization'));
    let isPremiumUser = false;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const { data: user } = await supabase
          .from('users')
          .select('is_premium, premium_expiry')
          .eq('id', decoded.userId)
          .single();

        isPremiumUser =
          user?.is_premium === true &&
          (!user.premium_expiry || new Date(user.premium_expiry) > new Date());
      }
    }

    // For non-premium users, hide the full PDF/EPUB URL
    const bookData = { ...book };
    if (!isPremiumUser && book.is_premium) {
      delete bookData.pdf_url;
      delete bookData.epub_url;
      delete bookData.telegram_file_id;
    }

    return NextResponse.json({ success: true, data: bookData, isPremiumUser });
  } catch (error) {
    console.error('Book fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}
