'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, Crown, CreditCard, BarChart2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { AdminStats } from '@/lib/types';

interface PlanBreakdown {
  plan: string;
  count: number;
  revenue: number;
}

interface CategoryStat {
  category: string;
  count: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, subsRes, booksRes] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/subscriptions', { headers }),
          fetch('/api/admin/books', { headers }),
        ]);

        const [statsData, subsData, booksData] = await Promise.all([
          statsRes.json(),
          subsRes.json(),
          booksRes.json(),
        ]);

        if (statsData.success) setStats(statsData.data);

        if (subsData.success) {
          const planMap = new Map<string, PlanBreakdown>();
          for (const sub of subsData.data || []) {
            const existing = planMap.get(sub.plan) || { plan: sub.plan, count: 0, revenue: 0 };
            planMap.set(sub.plan, {
              ...existing,
              count: existing.count + 1,
              revenue: existing.revenue + sub.amount,
            });
          }
          const breakdown = Array.from(planMap.values()).sort((a, b) => b.revenue - a.revenue);
          setPlanBreakdown(breakdown);
        }

        if (booksData.success) {
          const catMap = new Map<string, number>();
          for (const book of booksData.data || []) {
            catMap.set(book.category, (catMap.get(book.category) || 0) + 1);
          }
          const cats = Array.from(catMap.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
          setCategoryStats(cats);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const maxCategoryCount = categoryStats[0]?.count || 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Platform overview and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users, color: 'from-blue-500 to-primary-600' },
          { label: 'Premium Users', value: stats?.premium_users ?? '—', icon: Crown, color: 'from-gold-500 to-orange-500' },
          { label: 'Total Books', value: stats?.total_books ?? '—', icon: BookOpen, color: 'from-green-500 to-teal-600' },
          { label: 'Active Subs', value: stats?.total_subscriptions ?? '—', icon: CreditCard, color: 'from-purple-500 to-pink-600' },
          { label: 'Monthly Revenue', value: stats ? formatPrice(stats.revenue_this_month) : '—', icon: TrendingUp, color: 'from-red-500 to-rose-600' },
          { label: 'New This Month', value: stats?.new_users_this_month ?? '—', icon: Users, color: 'from-cyan-500 to-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`glass rounded-xl p-5 ${loading ? 'shimmer' : ''}`}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-white">{loading ? '—' : value}</div>
            <div className="text-gray-400 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-400" /> Revenue by Plan
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-dark-700 rounded-lg shimmer" />)}
            </div>
          ) : planBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm">No subscription data yet</p>
          ) : (
            <div className="space-y-3">
              {planBreakdown.map(({ plan, count, revenue }) => (
                <div key={plan} className="flex items-center gap-3">
                  <div className="w-20 text-gray-400 text-xs capitalize shrink-0">{plan}</div>
                  <div className="flex-1 bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (revenue / (planBreakdown[0]?.revenue || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white text-xs font-medium">₹{revenue.toLocaleString()}</div>
                    <div className="text-gray-500 text-xs">{count} sub{count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Books by Category */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-400" /> Books by Category
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-dark-700 rounded-lg shimmer" />)}
            </div>
          ) : categoryStats.length === 0 ? (
            <p className="text-gray-500 text-sm">No books uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map(({ category, count }) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-28 text-gray-400 text-xs truncate shrink-0">{category}</div>
                  <div className="flex-1 bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-white text-xs font-medium w-6 text-right shrink-0">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversion funnel */}
      {stats && (
        <div className="glass rounded-xl p-6 mt-6">
          <h2 className="font-bold text-white mb-5">Conversion Funnel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Registered', value: stats.total_users, pct: 100, color: 'bg-blue-500' },
              { label: 'Premium', value: stats.premium_users, pct: Math.round((stats.premium_users / Math.max(stats.total_users, 1)) * 100), color: 'bg-gold-500' },
              { label: 'Active Subs', value: stats.total_subscriptions, pct: Math.round((stats.total_subscriptions / Math.max(stats.total_users, 1)) * 100), color: 'bg-green-500' },
            ].map(({ label, value, pct, color }) => (
              <div key={label} className="bg-dark-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{value}</div>
                <div className="text-gray-400 text-sm mb-3">{label}</div>
                <div className="bg-dark-600 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-gray-500 text-xs mt-1">{pct}% of total users</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
