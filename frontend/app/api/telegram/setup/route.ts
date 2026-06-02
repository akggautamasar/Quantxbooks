import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

    if (!BOT_TOKEN || !APP_URL) {
      return NextResponse.json(
        { success: false, error: 'Bot token or app URL not configured' },
        { status: 400 }
      );
    }

    const webhookUrl = `${APP_URL}/api/telegram/webhook`;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'],
      }),
    });

    const data = await response.json();

    // Set bot commands
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Start and get your Chat ID' },
          { command: 'myid', description: 'Get your Telegram Chat ID' },
          { command: 'help', description: 'Show help message' },
        ],
      }),
    });

    return NextResponse.json({
      success: data.ok,
      message: data.ok ? `Webhook set to ${webhookUrl}` : data.description,
      webhookUrl,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to setup webhook' }, { status: 500 });
  }
}
