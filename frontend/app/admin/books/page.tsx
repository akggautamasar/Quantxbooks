'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Edit, Trash2, Plus, Crown, Eye, Download, Search } from 'lucide-react';
import { Book } from '@/lib/types';
import { truncateText } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setBooks(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/books/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBooks(books.filter((b) => b.id !== id));
        toast.success('Book deleted');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to delete book');
    }
  };

  const filtered = books.filter((b) =>
    search ? b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Books</h1>
          <p className="text-gray-400 text-sm">{books.length} books in library</p>
        </div>
        <Link
          href="/admin/books/upload"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Add Book
        </Link>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books..."
          className="w-full bg-dark-700 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl h-20 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No books found</p>
          <Link href="/admin/books/upload" className="mt-4 inline-block text-primary-400 hover:text-primary-300 text-sm">Upload your first book →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((book) => (
            <div key={book.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-14 rounded-lg overflow-hidden bg-dark-700 flex-shrink-0">
                {book.cover_url ? (
                  <Image src={book.cover_url} alt={book.title} width={40} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white truncate">{book.title}</h3>
                  {book.is_premium && <Crown className="w-3 h-3 text-gold-400 flex-shrink-0" />}
                  {book.is_featured && <span className="text-xs bg-primary-900/50 text-primary-300 px-2 py-0.5 rounded-full">Featured</span>}
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{book.author} • {book.category} • {book.language}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-500 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{book.view_count}</span>
                  <span className="text-gray-500 text-xs flex items-center gap-1"><Download className="w-3 h-3" />{book.download_count}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/books/${book.id}/edit`}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(book.id, book.title)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
