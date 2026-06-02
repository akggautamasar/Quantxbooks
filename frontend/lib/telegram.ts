const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}

export async function sendOTP(mobile: string, otp: string, telegramChatId?: string): Promise<boolean> {
  if (!telegramChatId) return false;

  const message = `
🔐 <b>QuantXBooks Verification</b>

Your OTP is: <b>${otp}</b>

This code expires in 10 minutes.
Do not share this with anyone.

— QuantXBooks Team`;

  return sendTelegramMessage(telegramChatId, message);
}

export async function notifyAdmin(message: string): Promise<void> {
  if (!TELEGRAM_ADMIN_CHAT_ID) return;
  await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
}

export async function notifyNewUser(userName: string, mobile: string): Promise<void> {
  const message = `
📚 <b>New User Registration</b>

Name: <b>${userName}</b>
Mobile: ${mobile.slice(0, 5)}XXXXX
Time: ${new Date().toLocaleString('en-IN')}`;

  await notifyAdmin(message);
}

export async function notifyNewSubscription(
  userName: string,
  plan: string,
  amount: number
): Promise<void> {
  const message = `
💰 <b>New Subscription!</b>

User: <b>${userName}</b>
Plan: ${plan}
Amount: ₹${amount}
Time: ${new Date().toLocaleString('en-IN')}`;

  await notifyAdmin(message);
}
