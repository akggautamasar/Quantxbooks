import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateOTP } from '@/lib/utils';
import { OTP_EXPIRY_MINUTES } from '@/lib/constants';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId: string | number, text: string, parseMode = 'HTML') {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    const message = update?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'User';

    if (text === '/start') {
      await sendMessage(chatId, `
👋 <b>Welcome to QuantXBooks Bot, ${firstName}!</b>

I help you verify your identity for QuantXBooks — India's premium digital library.

<b>Your Chat ID is: <code>${chatId}</code></b>

Use this ID when registering or logging in on QuantXBooks to receive OTP codes here.

🔐 Commands:
/myid — Get your Telegram Chat ID
/help — Show this help message

📚 Visit QuantXBooks to start your reading journey!
      `);
      return NextResponse.json({ ok: true });
    }

    if (text === '/myid') {
      await sendMessage(chatId, `
🆔 <b>Your Telegram Chat ID</b>

<code>${chatId}</code>

Copy this ID and use it when registering on QuantXBooks.
      `);
      return NextResponse.json({ ok: true });
    }

    if (text === '/help') {
      await sendMessage(chatId, `
📖 <b>QuantXBooks Bot Help</b>

<b>Commands:</b>
/start — Welcome message & your Chat ID
/myid — Get your Telegram Chat ID
/help — Show this message

<b>How to use:</b>
1. Visit QuantXBooks website
2. Enter your mobile number
3. Paste your Chat ID (<code>${chatId}</code>) in the field
4. Click "Send OTP"
5. I'll send you the OTP here!

🌐 Visit QuantXBooks to get started.
      `);
      return NextResponse.json({ ok: true });
    }

    // Check if it's a 6-digit OTP attempt
    if (/^\d{6}$/.test(text.trim())) {
      await sendMessage(chatId, `
⚠️ Please don't send OTP codes here.
Enter the OTP on the QuantXBooks website to verify your account.
      `);
      return NextResponse.json({ ok: true });
    }

    // Default response
    await sendMessage(chatId, `
👋 Hi ${firstName}!

Your Chat ID is: <code>${chatId}</code>

Use /help to see available commands.
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Verification endpoint for Telegram
export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true, service: 'QuantXBooks Telegram Bot' });
}
