'use client';

import { useState, useEffect } from 'react';
import { Users, Crown, Search, Shield, UserCheck } from 'lucide-react';
import { User } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_premium: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map((u) => u.id === userId ? { ...u, is_premium: !currentStatus } : u));
        toast.success(`Premium ${!currentStatus ? 'granted' : 'revoked'}`);
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const filtered = users.filter((u) =>
    search ? u.name.toLowerCase().includes(search.toLowerCase()) || u.mobile.includes(search) : true
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">{users.length} total users</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or mobile..."
          className="w-full bg-dark-700 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass rounded-xl h-16 shimmer" />)}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">User</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase hidden sm:table-cell">Mobile</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-900/50 rounded-full flex items-center justify-center text-xs font-bold text-primary-300">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{user.name}</div>
                        {user.email && <div className="text-gray-500 text-xs">{user.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-300 text-sm font-mono">+91 {user.mobile}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-400 text-xs">{formatDate(user.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.is_premium ? (
                        <span className="flex items-center gap-1 text-xs text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">Free</span>
                      )}
                      {user.role === 'admin' && (
                        <span className="flex items-center gap-1 text-xs text-primary-400 bg-primary-900/30 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleTogglePremium(user.id, user.is_premium)}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1 rounded-lg transition-all"
                    >
                      {user.is_premium ? 'Revoke' : 'Grant'} Premium
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
