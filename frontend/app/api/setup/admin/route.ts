import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/tg-db';

// POST /api/setup/admin — create or promote an admin user
// Requires x-setup-secret header matching SETUP_SECRET env var
// Use this once after first deploy to create your admin account
export async function POST(request: NextRequest) {
  const setupSecret = request.headers.get('x-setup-secret');
  if (!setupSecret || setupSecret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ success: false, error: 'Invalid setup secret' }, { status: 403 });
  }

  try {
    const { mobile, name, email } = await request.json();
    if (!mobile || !name) {
      return NextResponse.json({ success: false, error: 'mobile and name are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.findOne<db.User>('users', (u) => u.mobile === mobile);

    if (existing) {
      // Promote existing user to admin
      const updated = await db.update<db.User>('users', existing.id, { role: 'admin' });
      return NextResponse.json({
        success: true,
        message: `User ${existing.name} promoted to admin`,
        data: { id: updated!.id, name: updated!.name, mobile: updated!.mobile, role: updated!.role },
      });
    }

    // Create new admin user
    const user = await db.insert<db.User>('users', {
      name: name.trim(),
      mobile,
      email: email?.trim() || undefined,
      is_premium: true,
      role: 'admin',
      updated_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Admin user created. You can now log in with this mobile number.',
      data: { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
