'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Crown, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SubWithUser {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  start_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_id?: string;
  created_at: string;
  user?: { name: string; mobile: string; email?: string };
}

const STATUS_CONFIG = {
  active: { label: 'Active', icon: CheckCircle, className: 'text-green-400 bg-green-500/10' },
  expired: { label: 'Expired', icon: Clock, className: 'text-gray-400 bg-dark-600' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-red-400 bg-red-500/10' },
};

const PLAN_COLORS: Record<string, string> = {
  monthly: 'text-blue-400',
  quarterly: 'text-purple-400',
  yearly: 'text-gold-400',
  lifetime: 'text-green-400',
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/subscriptions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSubs(data.data || []);
        else toast.error(data.error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();
  }, []);

  const filtered = subs.filter((s) => {
    const matchesSearch = search
      ? s.user?.name.toLowerCase().includes(search.toLowerCase()) ||
        s.user?.mobile.includes(search)
      : true;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
  const activeCount = subs.filter((s) => s.status === 'active').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-gray-400 text-sm">{subs.length} total · {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-xl px-4 py-2">
          <Crown className="w-4 h-4 text-gold-400" />
          <span className="text-gold-400 font-semibold text-sm">₹{totalRevenue.toLocaleString()}</span>
          <span className="text-gray-500 text-xs">active revenue</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or mobile..."
            className="w-full bg-dark-700 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'expired', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all',
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-gray-400 hover:text-white border border-white/10'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-xl h-16 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CreditCard className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No subscriptions found</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((sub) => {
              const { label, icon: Icon, className } = STATUS_CONFIG[sub.status];
              return (
                <div key={sub.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-white text-sm font-medium">{sub.user?.name || 'Unknown'}</div>
                      <div className="text-gray-400 text-xs">+91 {sub.user?.mobile}</div>
                    </div>
                    <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', className)}>
                      <Icon className="w-3 h-3" /> {label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium capitalize', PLAN_COLORS[sub.plan] || 'text-gray-300')}>{sub.plan}</span>
                    <span className="text-white font-semibold">₹{sub.amount}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">Expires {formatDate(sub.expiry_date)}</div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">User</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase hidden md:table-cell">Expires</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((sub) => {
                  const { label, icon: Icon, className } = STATUS_CONFIG[sub.status];
                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">{sub.user?.name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">+91 {sub.user?.mobile}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-medium capitalize', PLAN_COLORS[sub.plan] || 'text-gray-300')}>
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold text-sm">₹{sub.amount}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">{formatDate(sub.expiry_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit', className)}>
                          <Icon className="w-3 h-3" /> {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
