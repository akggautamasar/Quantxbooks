'use client';

import { useState, useEffect, useCallback } from 'react';
import { Grid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookCard from '@/components/BookCard';
import { BookCardSkeleton } from '@/components/LoadingSpinner';
import { Book } from '@/lib/types';
import { BOOK_CATEGORIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort,
        ...(search && { search }),
        ...(category && { category }),
        ...(language && { language }),
      });
      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();
      if (data.success) {
        setBooks(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, category, language, sort]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setLanguage('');
    setSort('newest');
    setPage(1);
  };

  const hasFilters = search || category || language || sort !== 'newest';

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {/* Search bar */}
        <div className="border-b border-white/10 bg-dark-800/50 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by title, author..."
                  className="w-full bg-dark-700 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  showFilters || hasFilters
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-white/10 text-gray-300 hover:border-white/30'
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:block">Filters</span>
                {hasFilters && <span className="w-2 h-2 bg-gold-400 rounded-full" />}
              </button>

              <div className="flex border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={cn('p-2.5 transition-colors', view === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white')}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={cn('p-2.5 transition-colors', view === 'list' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-3">
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Categories</option>
                  {BOOK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <select
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
                  className="bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Languages</option>
                  {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                </select>

                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-primary-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="title">Title A-Z</option>
                </select>

                {hasFilters && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors">
                    <X className="w-4 h-4" /> Clear All
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Books grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-400 text-sm">
              {loading ? 'Loading...' : `${total} books found`}
            </p>
          </div>

          {loading ? (
            <div className={cn(
              view === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'flex flex-col gap-3'
            )}>
              {Array.from({ length: 12 }).map((_, i) => <BookCardSkeleton key={i} />)}
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No books found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
              <button onClick={clearFilters} className="mt-4 text-primary-400 hover:text-primary-300 text-sm">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={cn(
              view === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'flex flex-col gap-3'
            )}>
              {books.map((book) => (
                <BookCard key={book.id} book={book} view={view} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'border border-white/10 text-gray-300 hover:border-white/30'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
