'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, BookOpen, CreditCard, TrendingUp, Crown, ArrowUpRight, Upload, Eye } from 'lucide-react';
import { AdminStats } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'from-blue-500 to-primary-600', change: `+${stats.new_users_this_month} this month` },
    { label: 'Premium Users', value: stats.premium_users.toLocaleString(), icon: Crown, color: 'from-gold-500 to-orange-500', change: `${((stats.premium_users / Math.max(stats.total_users, 1)) * 100).toFixed(1)}% conversion` },
    { label: 'Total Books', value: stats.total_books.toLocaleString(), icon: BookOpen, color: 'from-green-500 to-teal-600', change: 'in library' },
    { label: 'Monthly Revenue', value: formatPrice(stats.revenue_this_month), icon: TrendingUp, color: 'from-purple-500 to-pink-600', change: 'this month' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome to QuantXBooks admin panel</p>
        </div>
        <Link
          href="/admin/books/upload"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-glow"
        >
          <Upload className="w-4 h-4" /> Upload Book
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-6 h-28 shimmer" />
            ))
          : statCards.map(({ label, value, icon: Icon, color, change }) => (
              <div key={label} className="glass rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-gray-400 text-xs mt-0.5">{label}</div>
                <div className="text-gray-500 text-xs mt-1">{change}</div>
              </div>
            ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h2 className="font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/books/upload', label: 'Upload Book', icon: Upload, color: 'text-primary-400' },
              { href: '/admin/books', label: 'Manage Books', icon: BookOpen, color: 'text-green-400' },
              { href: '/admin/users', label: 'Manage Users', icon: Users, color: 'text-blue-400' },
              { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-gold-400' },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors">
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="text-white text-xs font-medium text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-bold text-white mb-4">Platform Overview</h2>
          {stats && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Premium conversion rate</span>
                <span className="text-white font-medium">
                  {((stats.premium_users / Math.max(stats.total_users, 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-dark-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${(stats.premium_users / Math.max(stats.total_users, 1)) * 100}%` }}
                />
              </div>

              <div className="flex justify-between text-sm mt-4">
                <span className="text-gray-400">Active subscriptions</span>
                <span className="text-white font-medium">{stats.total_subscriptions}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">New users this month</span>
                <span className="text-white font-medium">{stats.new_users_this_month}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Books in library</span>
                <span className="text-white font-medium">{stats.total_books}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
