import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import { isValidMobile } from '@/lib/utils';
import { notifyNewUser } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { mobile, otp } = await request.json();

    if (!mobile || !otp || !isValidMobile(mobile)) {
      return NextResponse.json(
        { success: false, error: 'Mobile and OTP are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Find latest unverified OTP
    const { data: otpRecord } = await supabase
      .from('otp_records')
      .select('*')
      .eq('mobile', mobile)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Increment attempt count
    await supabase
      .from('otp_records')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    if (otpRecord.otp !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_records')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Get or create user
    let user;
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (existingUser) {
      user = existingUser;
    } else {
      // Auto-create user on first OTP verification (login flow)
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ name: 'User', mobile })
        .select()
        .single();
      if (error) throw error;
      user = newUser;
      await notifyNewUser(user.name, mobile);
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { token, user },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
