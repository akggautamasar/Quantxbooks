'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Crown, Clock, Bookmark, TrendingUp,
  User, Settings, ChevronRight, Calendar, Shield,
  Download, Star, LogOut
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageLoader } from '@/components/LoadingSpinner';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { User as UserType, ReadingHistory, Subscription } from '@/lib/types';
import { formatDate, getDaysUntilExpiry } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'history' | 'bookmarks' | 'subscription' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [profileRes, historyRes, subRes] = await Promise.all([
          fetch('/api/user/profile', { headers }),
          fetch('/api/user/reading-history', { headers }),
          fetch('/api/subscriptions', { headers }),
        ]);
        const [profileData, historyData, subData] = await Promise.all([
          profileRes.json(),
          historyRes.json(),
          subRes.json(),
        ]);
        if (profileData.success) setUser(profileData.data);
        if (historyData.success) setReadingHistory(historyData.data || []);
        if (subData.success) setSubscriptions(subData.data || []);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  if (loading) return <PageLoader />;
  if (!user) return null;

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const daysLeft = activeSub ? getDaysUntilExpiry(activeSub.expiry_date) : 0;
  const booksInProgress = readingHistory.filter((h) => h.progress_percentage < 100);
  const booksCompleted = readingHistory.filter((h) => h.progress_percentage >= 100);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'history', label: 'Reading History', icon: Clock },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {/* Dashboard header */}
        <div className="bg-dark-800/50 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-xl font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{user.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {user.is_premium ? (
                      <span className="flex items-center gap-1 premium-badge">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Free User</span>
                    )}
                    <span className="text-gray-600 text-xs">•</span>
                    <span className="text-gray-400 text-xs">+91 {user.mobile}</span>
                  </div>
                </div>
              </div>
              {!user.is_premium && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="hidden sm:flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  <Crown className="w-4 h-4" /> Upgrade to Premium
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    activeTab === id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Books Reading', value: booksInProgress.length, icon: BookOpen, color: 'text-primary-400' },
                  { label: 'Books Completed', value: booksCompleted.length, icon: Star, color: 'text-gold-400' },
                  { label: 'Total Read', value: readingHistory.length, icon: TrendingUp, color: 'text-green-400' },
                  { label: 'Days Premium', value: user.is_premium ? daysLeft : 0, icon: Crown, color: 'text-purple-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="glass rounded-xl p-4">
                    <Icon className={cn('w-6 h-6 mb-2', color)} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Premium status */}
              {user.is_premium && activeSub ? (
                <div className="glass rounded-xl p-6 border border-gold-500/20 bg-gold-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="w-8 h-8 text-gold-400" />
                      <div>
                        <h3 className="font-bold text-white">Premium Active</h3>
                        <p className="text-gray-400 text-sm">{activeSub.plan} plan • {daysLeft} days remaining</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gold-400 font-semibold">{formatDate(activeSub.expiry_date)}</div>
                      <div className="text-gray-500 text-xs">Expires</div>
                    </div>
                  </div>
                  <div className="mt-4 bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-gold-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (daysLeft / 365) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="glass rounded-xl p-6 border border-primary-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-8 h-8 text-primary-400" />
                    <div>
                      <h3 className="font-bold text-white">Upgrade to Premium</h3>
                      <p className="text-gray-400 text-sm">Unlock full access to all books</p>
                    </div>
                  </div>
                  <Link href="/pricing" className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors">
                    View Plans <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Recent reading */}
              {readingHistory.length > 0 && (
                <div>
                  <h2 className="font-bold text-white text-lg mb-4">Continue Reading</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {readingHistory.slice(0, 3).map((item) => (
                      <Link key={item.id} href={`/books/${item.book_id}`}>
                        <div className="glass rounded-xl p-4 hover:border-primary-500/50 transition-all flex gap-3">
                          <div className="w-12 h-16 rounded-lg bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                            {item.book?.cover_url ? (
                              <Image src={`/api/books/${item.book_id}/cover`} alt="" width={48} height={64} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-primary-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">{item.book?.title || 'Unknown'}</h4>
                            <p className="text-gray-400 text-xs mt-0.5">Page {item.last_page}</p>
                            <div className="mt-2 bg-dark-700 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${item.progress_percentage}%` }} />
                            </div>
                            <p className="text-gray-500 text-xs mt-1">{item.progress_percentage}% complete</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reading History tab */}
          {activeTab === 'history' && (
            <div>
              <h2 className="font-bold text-white text-xl mb-6">Reading History</h2>
              {readingHistory.length === 0 ? (
                <div className="text-center py-20">
                  <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No reading history yet</p>
                  <Link href="/books" className="mt-4 inline-block text-primary-400 hover:text-primary-300 text-sm">Browse Books →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {readingHistory.map((item) => (
                    <Link key={item.id} href={`/books/${item.book_id}`}>
                      <div className="glass rounded-xl p-4 hover:border-primary-500/50 transition-all flex items-center gap-4">
                        <div className="w-12 h-16 rounded-lg bg-dark-700 flex-shrink-0">
                          {item.book?.cover_url ? (
                            <Image src={`/api/books/${item.book_id}/cover`} alt="" width={48} height={64} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-5 h-5 text-gray-500" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{item.book?.title}</h4>
                          <p className="text-gray-400 text-sm">{item.book?.author}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 bg-dark-700 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${item.progress_percentage}%` }} />
                            </div>
                            <span className="text-gray-400 text-xs whitespace-nowrap">{item.progress_percentage}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-xs">Page {item.last_page}</div>
                          <div className="text-gray-600 text-xs mt-1">{new Date(item.updated_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subscription tab */}
          {activeTab === 'subscription' && (
            <div>
              <h2 className="font-bold text-white text-xl mb-6">Your Subscription</h2>
              {activeSub ? (
                <div className="glass rounded-2xl p-6 border border-gold-500/20 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="w-10 h-10 text-gold-400" />
                    <div>
                      <h3 className="font-bold text-white text-lg capitalize">{activeSub.plan} Plan</h3>
                      <p className="text-gray-400">Active until {formatDate(activeSub.expiry_date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-700 rounded-xl p-4">
                      <Calendar className="w-5 h-5 text-gray-400 mb-2" />
                      <div className="text-white font-semibold">{daysLeft} days</div>
                      <div className="text-gray-500 text-xs">remaining</div>
                    </div>
                    <div className="bg-dark-700 rounded-xl p-4">
                      <Download className="w-5 h-5 text-gray-400 mb-2" />
                      <div className="text-white font-semibold">Unlimited</div>
                      <div className="text-gray-500 text-xs">downloads</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-dark-700 rounded-xl border border-white/10 text-center">
                  <p className="text-gray-400 mb-2">No active subscription</p>
                  <p className="text-gray-500 text-sm">Choose a plan below to get started</p>
                </div>
              )}
              <h3 className="font-semibold text-white mb-4">Available Plans</h3>
              <SubscriptionPlans currentPlan={activeSub?.plan} />
            </div>
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <ProfileTab user={user} onUpdate={setUser} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProfileTab({ user, onUpdate }: { user: UserType; onUpdate: (u: UserType) => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email || '', telegram_chat_id: user.telegram_chat_id || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
        toast.success('Profile updated!');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-bold text-white text-xl mb-6">Edit Profile</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-dark-700 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Mobile</label>
          <input type="text" value={`+91 ${user.mobile}`} readOnly className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
        </div>
        <button type="submit" disabled={saving} className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
