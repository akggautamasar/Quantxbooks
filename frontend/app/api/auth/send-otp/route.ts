import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateOTP, isValidMobile } from '@/lib/utils';
import { OTP_EXPIRY_MINUTES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { mobile, telegramChatId } = await request.json();

    if (!mobile || !isValidMobile(mobile)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mobile number' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check rate limit - max 3 OTPs per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('otp_records')
      .select('*', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gte('created_at', tenMinutesAgo);

    if (count && count >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please wait 10 minutes.' },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store OTP
    await supabase.from('otp_records').insert({
      mobile,
      otp,
      expires_at: expiresAt,
    });

    // Send OTP via Telegram if chat ID is provided
    let otpSent = false;
    if (telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      const message = `🔐 <b>QuantXBooks OTP</b>\n\nYour verification code: <b>${otp}</b>\n\nExpires in ${OTP_EXPIRY_MINUTES} minutes.\nDo not share this with anyone.`;

      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      );
      const data = await res.json();
      otpSent = data.ok;
    }

    // In dev mode, return OTP directly
    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: true,
      message: otpSent
        ? 'OTP sent via Telegram'
        : 'OTP generated (Telegram not configured)',
      ...(isDev && { otp }), // Only in dev
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
