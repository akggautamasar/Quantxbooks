import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { generateOTP, isValidMobile } from '@/lib/utils';
import { OTP_EXPIRY_MINUTES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { mobile, telegramChatId } = await request.json();

    if (!mobile || !isValidMobile(mobile)) {
      return NextResponse.json({ success: false, error: 'Invalid mobile number' }, { status: 400 });
    }

    // Rate limit: max 3 OTPs per 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentOtps = await db.findMany<db.OTPRecord>(
      'otps',
      (o) => o.mobile === mobile && o.created_at >= tenMinsAgo
    );
    if (recentOtps.length >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Wait 10 minutes.' },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await db.insert<db.OTPRecord>('otps', {
      mobile,
      otp,
      expires_at: expiresAt,
      verified: false,
      attempts: 0,
    } as any);

    // Persist telegram_chat_id to user record if provided
    if (telegramChatId) {
      const user = await db.findOne<db.User>('users', (u) => u.mobile === mobile);
      if (user) {
        db.update<db.User>('users', user.id, { telegram_chat_id: telegramChatId } as any).catch(() => {});
      }
    }

    // Send OTP via Telegram
    let otpSent = false;
    if (telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      const msg = `🔐 <b>QuantXBooks OTP</b>\n\nYour code: <b>${otp}</b>\n\nExpires in ${OTP_EXPIRY_MINUTES} minutes.\nDo not share this with anyone.`;
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text: msg, parse_mode: 'HTML' }),
        }
      );
      const data = await res.json();
      otpSent = data.ok;
    }

    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json({
      success: true,
      message: otpSent ? 'OTP sent via Telegram' : 'OTP generated (configure Telegram to receive it)',
      ...(isDev && { otp }),
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}
