'use client';

import { useState } from 'react';
import { RefreshCw, Send, CheckCircle, BookOpen, ArrowRight, MessageCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SyncPage() {
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookDone, setWebhookDone] = useState(false);

  const setupWebhook = async () => {
    setWebhookLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWebhookDone(true);
        toast.success('Webhook registered! New channel uploads will auto-sync.');
      } else {
        toast.error(data.message || 'Failed to set up webhook');
      }
    } catch {
      toast.error('Failed to connect to Telegram');
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Sync from Telegram</h1>
        <p className="text-gray-400">Add books you've already uploaded to your storage channel.</p>
      </div>

      {/* Step 1 — Register webhook */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-900/50 border border-primary-500/40 rounded-full flex items-center justify-center text-sm font-bold text-primary-400">1</div>
          <h2 className="font-semibold text-white">Register the Webhook</h2>
          {webhookDone && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
        </div>
        <p className="text-gray-400 text-sm">
          This tells Telegram to notify QuantXBooks every time a new PDF is added to your storage channel.
          Do this once — new uploads will appear automatically after this.
        </p>
        <button
          onClick={setupWebhook}
          disabled={webhookLoading || webhookDone}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          {webhookLoading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
            : webhookDone
            ? <><CheckCircle className="w-4 h-4" /> Webhook Active</>
            : <><Zap className="w-4 h-4" /> Activate Auto-Sync</>}
        </button>
      </div>

      {/* Step 2 — Forward old PDFs */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-900/50 border border-primary-500/40 rounded-full flex items-center justify-center text-sm font-bold text-primary-400">2</div>
          <h2 className="font-semibold text-white">Add Already-Uploaded PDFs</h2>
        </div>
        <p className="text-gray-400 text-sm">
          For PDFs you sent to the channel <em>before</em> setting up the webhook, forward them to the bot — it will add them to the library instantly.
        </p>

        <div className="space-y-3">
          {[
            { step: 'Open Telegram and go to your storage channel', icon: MessageCircle },
            { step: 'Select a PDF/EPUB → tap Forward', icon: ArrowRight },
            { step: 'Forward it to your QuantXBooks bot', icon: Send },
            { step: 'Bot replies "✅ Added to library" and the book appears on the site', icon: CheckCircle },
          ].map(({ step, icon: Icon }, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 bg-dark-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3 h-3 text-primary-400" />
              </div>
              <span className="text-gray-300">{step}</span>
            </div>
          ))}
        </div>

        <div className="bg-dark-700 rounded-xl p-4 text-xs text-gray-400 space-y-1 border border-white/5">
          <p className="text-white font-medium text-sm mb-2">What gets auto-filled:</p>
          <p>• <span className="text-gray-300">Title</span> — extracted from the filename</p>
          <p>• <span className="text-gray-300">Cover</span> — first page of PDF (Telegram thumbnail)</p>
          <p>• <span className="text-gray-300">File size</span> — from Telegram metadata</p>
          <p>• Category is set to "Uncategorized" — edit in <a href="/admin/books" className="text-primary-400 hover:underline">Admin → Books</a></p>
        </div>
      </div>

      {/* Future uploads */}
      <div className="glass rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary-400" />
          <h2 className="font-semibold text-white">Going Forward</h2>
        </div>
        <p className="text-gray-400 text-sm">
          After the webhook is active, any PDF or EPUB you send to your storage channel will automatically
          appear on the website within seconds — no forwarding needed.
        </p>
      </div>
    </div>
  );
}
