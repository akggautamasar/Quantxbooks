'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Phone, Shield, ChevronRight, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidMobile } from '@/lib/utils';

type Step = 'mobile' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMobile(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, telegramChatId: telegramChatId || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(data.message || 'OTP sent!');
      if (data.otp) {
        // Dev mode: show OTP
        toast(`Dev OTP: ${data.otp}`, { icon: '🔑', duration: 10000 });
      }
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      toast.success('Welcome back!');
      router.push(data.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-dark-800 to-primary-950 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl gradient-text">QuantXBooks</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Welcome back to your digital library
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Continue your reading journey. Thousands of books are waiting for you.
          </p>
        </div>

        <div className="relative flex items-center gap-4 text-gray-400 text-sm">
          <Shield className="w-5 h-5 text-primary-400" />
          Secure login with OTP verification
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">QuantXBooks</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Login</h1>
          <p className="text-gray-400 mb-8">
            {step === 'mobile'
              ? 'Enter your mobile number to receive an OTP'
              : `Enter the OTP sent to +91 ${mobile}`}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 'mobile' ? 'bg-primary-600 text-white' : 'bg-primary-600 text-white'}`}>
              1
            </div>
            <div className={`h-0.5 flex-1 transition-colors ${step === 'otp' ? 'bg-primary-600' : 'bg-white/10'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 'otp' ? 'bg-primary-600 text-white' : 'bg-white/10 text-gray-400'}`}>
              2
            </div>
          </div>

          {step === 'mobile' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-dark-700 border border-r-0 border-white/20 rounded-l-xl text-gray-400 text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 bg-dark-700 border border-white/20 rounded-r-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telegram Chat ID{' '}
                  <span className="text-gray-500 font-normal">(for OTP delivery)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-gray-500 absolute ml-3" />
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Your Telegram Chat ID"
                    className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Message @QuantXBooksBot on Telegram to get your Chat ID
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send OTP <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors text-center text-2xl tracking-widest font-mono"
                  required
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  OTP valid for 10 minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Verify & Login'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('mobile')}
                className="w-full text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Change mobile number
              </button>
            </form>
          )}

          <p className="text-center text-gray-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
