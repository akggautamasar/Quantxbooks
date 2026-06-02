'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Phone, Mail, Shield, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidMobile } from '@/lib/utils';

type Step = 'details' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState({ name: '', mobile: '', email: '', telegramChatId: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (!isValidMobile(form.mobile)) return toast.error('Enter a valid 10-digit mobile number');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, mobile: form.mobile, email: form.email || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Send OTP
      const otpRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: form.mobile,
          telegramChatId: form.telegramChatId || undefined,
        }),
      });
      const otpData = await otpRes.json();
      if (!otpData.success) throw new Error(otpData.error);

      toast.success('OTP sent! Please verify your number.');
      if (otpData.otp) {
        toast(`Dev OTP: ${otpData.otp}`, { icon: '🔑', duration: 10000 });
      }
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter a 6-digit OTP');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: form.mobile, otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      toast.success('Welcome to QuantXBooks! 🎉');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-glow">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl gradient-text">QuantXBooks</span>
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1 text-center">Create Account</h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            {step === 'details' ? 'Start your reading journey today' : 'Verify your mobile number'}
          </p>

          {step === 'details' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full bg-dark-700 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Mobile Number *</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-dark-600 border border-r-0 border-white/20 rounded-l-xl text-gray-400 text-sm">+91</span>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    className="flex-1 bg-dark-700 border border-white/20 rounded-r-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-gray-500 font-normal">(optional)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full bg-dark-700 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Telegram Chat ID <span className="text-gray-500 font-normal">(for OTP)</span></label>
                <input
                  type="text"
                  value={form.telegramChatId}
                  onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
                  placeholder="e.g. 123456789"
                  className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
                <p className="text-gray-500 text-xs mt-1">Message @QuantXBooksBot on Telegram to get your ID</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Register & Send OTP <ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center p-4 bg-primary-900/30 rounded-xl border border-primary-500/20">
                <Shield className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">OTP sent to +91 {form.mobile}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors text-center text-3xl tracking-widest font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Verify & Create Account'}
              </button>
              <button type="button" onClick={() => setStep('details')} className="w-full text-gray-400 hover:text-white text-sm transition-colors">
                ← Go back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
