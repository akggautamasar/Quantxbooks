import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { signToken } from '@/lib/auth';
import { isValidMobile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { mobile, otp } = await request.json();

    if (!mobile || !otp || !isValidMobile(mobile)) {
      return NextResponse.json({ success: false, error: 'Mobile and OTP required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Find latest valid OTP
    const otpRecords = await db.findMany<db.OTPRecord>(
      'otps',
      (o) => o.mobile === mobile && !o.verified && o.expires_at > now
    );
    if (!otpRecords.length) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Request a new one.' },
        { status: 400 }
      );
    }

    // Use the latest one
    const record = otpRecords.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    if (record.attempts >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Request a new OTP.' },
        { status: 400 }
      );
    }

    // Increment attempts
    await db.update<db.OTPRecord>('otps', record.id, { attempts: record.attempts + 1 } as any);

    if (record.otp !== otp) {
      return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 });
    }

    // Mark as verified
    await db.update<db.OTPRecord>('otps', record.id, { verified: true } as any);

    // Get or create user
    let user = await db.findOne<db.User>('users', (u) => u.mobile === mobile);
    if (!user) {
      user = await db.insert<db.User>('users', {
        name: 'User',
        mobile,
        is_premium: false,
        role: 'user',
        updated_at: new Date().toISOString(),
      } as any);

      // Notify admin
      if (process.env.TELEGRAM_ADMIN_CHAT_ID && process.env.TELEGRAM_BOT_TOKEN) {
        const msg = `📚 <b>New User</b>\nMobile: ${mobile.slice(0, 5)}XXXXX\nTime: ${new Date().toLocaleString('en-IN')}`;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text: msg, parse_mode: 'HTML' }),
        });
      }
    }

    const token = signToken({ userId: user.id, mobile: user.mobile, role: user.role });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { token, user },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
