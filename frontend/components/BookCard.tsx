'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Crown, BookOpen, Eye, Download } from 'lucide-react';
import { Book } from '@/lib/types';
import { truncateText } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BookCardProps {
  book: Book;
  view?: 'grid' | 'list';
}

export default function BookCard({ book, view = 'grid' }: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  if (view === 'list') {
    return (
      <Link href={`/books/${book.id}`}>
        <div className="flex gap-4 glass rounded-xl p-4 hover:border-primary-500/50 transition-all group book-card">
          <div className="w-16 h-22 flex-shrink-0 rounded-lg overflow-hidden bg-dark-700">
            {book.cover_url && !imageError ? (
              <Image
                src={book.cover_url}
                alt={book.title}
                width={64}
                height={88}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-900/50">
                <BookOpen className="w-6 h-6 text-primary-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                {book.title}
              </h3>
              {book.is_premium && (
                <span className="premium-badge flex-shrink-0">
                  <Crown className="w-3 h-3 inline mr-1" />PREMIUM
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{book.author}</p>
            <p className="text-gray-500 text-xs mt-2 line-clamp-2">
              {truncateText(book.description || '', 120)}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-primary-400 bg-primary-900/30 px-2 py-0.5 rounded-full">
                {book.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Eye className="w-3 h-3" />{book.view_count}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/books/${book.id}`}>
      <div className="book-card group relative rounded-xl overflow-hidden bg-dark-700 border border-white/10 hover:border-primary-500/50 transition-all">
        {/* Cover Image */}
        <div className="relative aspect-[2/3] bg-dark-600">
          {book.cover_url && !imageError ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary-900/50 to-dark-700">
              <BookOpen className="w-12 h-12 text-primary-400/50" />
              <p className="text-xs text-gray-500 px-2 text-center">{book.title}</p>
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 book-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <div className="space-y-1 w-full">
              <p className="text-white text-xs font-medium line-clamp-2">{book.title}</p>
              <p className="text-gray-300 text-xs">{book.author}</p>
            </div>
          </div>

          {/* Premium badge */}
          {book.is_premium && (
            <div className="absolute top-2 right-2">
              <span className="premium-badge flex items-center gap-1">
                <Crown className="w-3 h-3" />PRO
              </span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-black/60 text-gray-300 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
              {book.category}
            </span>
          </div>
        </div>

        {/* Card footer */}
        <div className="p-3">
          <h3 className="font-semibold text-white text-sm truncate group-hover:text-primary-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{book.author}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Eye className="w-3 h-3" />{book.view_count}
            </span>
            {book.download_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Download className="w-3 h-3" />{book.download_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
