'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen, Crown, Eye, ArrowLeft, Globe, Tag,
  Lock, Play, Star, Clock
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageLoader } from '@/components/LoadingSpinner';
import { Book } from '@/lib/types';
import { formatDate, truncateText } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const PDFReader = dynamic(() => import('@/components/PDFReader'), { ssr: false });

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [activePreview, setActivePreview] = useState(0);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/books/${params.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          setBook(data.data);
          setIsPremiumUser(data.isPremiumUser);
        } else {
          toast.error('Book not found');
          router.push('/books');
        }
      } catch {
        toast.error('Failed to load book');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [params.id, router]);

  const handleRead = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast('Please login to read books', { icon: '🔒' });
      router.push('/login');
      return;
    }
    if (book?.is_premium && !isPremiumUser) {
      toast('Upgrade to Premium to read this book', { icon: '👑' });
      router.push('/pricing');
      return;
    }
    setShowReader(true);
  };

  if (loading) return <PageLoader />;
  if (!book) return null;

  const canRead = !book.is_premium || isPremiumUser;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {/* Back button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </div>

        {/* Book hero */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Cover + Actions */}
            <div className="lg:col-span-1">
              <div className="relative rounded-2xl overflow-hidden aspect-[2/3] max-w-xs mx-auto lg:mx-0 shadow-2xl">
                {book.cover_url ? (
                  <Image src={`/api/books/${book.id}/cover`} alt={book.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-900 to-dark-700 flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-primary-400/30" />
                  </div>
                )}
                {book.is_premium && (
                  <div className="absolute top-3 right-3">
                    <span className="premium-badge flex items-center gap-1">
                      <Crown className="w-3 h-3" /> PREMIUM
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 space-y-3 max-w-xs mx-auto lg:mx-0">
                <button
                  onClick={handleRead}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                    canRead
                      ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow'
                      : 'bg-dark-700 border border-white/10 text-gray-300 hover:border-primary-500'
                  )}
                >
                  {canRead ? (
                    <><Play className="w-4 h-4" /> Read Now</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Unlock Premium</>
                  )}
                </button>

                {!isPremiumUser && book.is_premium && (
                  <Link
                    href="/pricing"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 font-semibold text-sm transition-all"
                  >
                    <Crown className="w-4 h-4" /> Get Premium
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto lg:mx-0">
                <div className="glass rounded-xl p-3 text-center">
                  <Eye className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <div className="text-white font-semibold text-sm">{book.view_count}</div>
                  <div className="text-gray-500 text-xs">Views</div>
                </div>
                {book.total_pages && (
                  <div className="glass rounded-xl p-3 text-center">
                    <BookOpen className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-white font-semibold text-sm">{book.total_pages}</div>
                    <div className="text-gray-500 text-xs">Pages</div>
                  </div>
                )}
                {book.file_size && (
                  <div className="glass rounded-xl p-3 text-center">
                    <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-white font-semibold text-sm">{book.file_size}</div>
                    <div className="text-gray-500 text-xs">Size</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-primary-900/50 text-primary-300 text-xs px-3 py-1 rounded-full border border-primary-500/30">
                  {book.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Globe className="w-3 h-3" /> {book.language}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                {book.title}
              </h1>
              <p className="text-primary-400 text-lg mb-4">by {book.author}</p>

              <p className="text-gray-300 leading-relaxed mb-6 text-sm sm:text-base">
                {book.description || 'No description available.'}
              </p>

              {book.tags && book.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {book.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs text-gray-400 bg-dark-700 px-2 py-1 rounded-full">
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-gray-500 text-xs mb-8">
                Added on {formatDate(book.created_at)}
              </div>

              {/* Preview pages */}
              {book.preview_pages && book.preview_pages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary-400" />
                    Preview Pages
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {book.preview_pages.map((pageUrl, index) => (
                      <button
                        key={index}
                        onClick={() => setActivePreview(index)}
                        className={cn(
                          'flex-shrink-0 w-32 h-44 rounded-lg overflow-hidden border-2 transition-all',
                          activePreview === index ? 'border-primary-500' : 'border-white/10'
                        )}
                      >
                        <Image src={pageUrl} alt={`Page ${index + 1}`} width={128} height={176} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {book.preview_pages[activePreview] && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-white/10 max-h-96">
                      <Image
                        src={book.preview_pages[activePreview]}
                        alt={`Preview page ${activePreview + 1}`}
                        width={800}
                        height={600}
                        className="w-full object-contain"
                      />
                    </div>
                  )}
                  {!canRead && (
                    <div className="mt-4 p-4 bg-dark-700 rounded-xl border border-white/10 text-center">
                      <Lock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">
                        Subscribe to read the full book beyond the preview
                      </p>
                      <Link href="/pricing" className="mt-3 inline-flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-500 transition-colors">
                        <Crown className="w-4 h-4" /> Upgrade Now
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PDF Reader Modal */}
        {showReader && book && (
          <PDFReader
            bookId={book.id as string}
            title={book.title}
            author={book.author}
            previewPages={book.preview_pages || []}
            onClose={() => setShowReader(false)}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
