import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isValidMobile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { name, mobile, email } = await request.json();

    if (!name || !mobile) {
      return NextResponse.json(
        { success: false, error: 'Name and mobile are required' },
        { status: 400 }
      );
    }

    if (!isValidMobile(mobile)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mobile number' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, mobile')
      .eq('mobile', mobile)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Mobile number already registered' },
        { status: 409 }
      );
    }

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, mobile, email: email || null })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please verify your mobile.',
      data: { userId: user.id },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
