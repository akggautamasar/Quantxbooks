import { NextRequest, NextResponse } from 'next/server';
import { initializeDb } from '@/lib/tg-db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

// POST /api/setup/db — initialize the Telegram database
// Requires admin JWT or a setup secret
export async function POST(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get('authorization'));
  const setupSecret = request.headers.get('x-setup-secret');

  // Allow either admin JWT or a one-time setup secret
  if (setupSecret !== process.env.SETUP_SECRET) {
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  const result = await initializeDb();
  return NextResponse.json({ success: result.ok, message: result.message }, {
    status: result.ok ? 200 : 500,
  });
}

// GET /api/setup/db — health check (no auth required)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'QuantXBooks API is running',
    db: 'Telegram',
    timestamp: new Date().toISOString(),
  });
}
