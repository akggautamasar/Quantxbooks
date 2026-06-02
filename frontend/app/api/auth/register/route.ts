import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';
import { isValidMobile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { name, mobile, email } = await request.json();

    if (!name?.trim() || !mobile) {
      return NextResponse.json({ success: false, error: 'Name and mobile are required' }, { status: 400 });
    }
    if (!isValidMobile(mobile)) {
      return NextResponse.json({ success: false, error: 'Invalid mobile number (must be 10 digits starting with 6-9)' }, { status: 400 });
    }

    // Check duplicate
    const existing = await db.findOne<db.User>('users', (u) => u.mobile === mobile);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Mobile number already registered' }, { status: 409 });
    }

    const user = await db.insert<db.User>('users', {
      name: name.trim(),
      mobile,
      email: email?.trim() || undefined,
      is_premium: false,
      role: 'user',
      updated_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Registered successfully. Please verify your mobile.',
      data: { userId: user.id },
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
