import Link from 'next/link';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-12 h-12 text-gray-500" />
        </div>
        <h1 className="text-6xl font-extrabold gradient-text mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-glow"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            href="/books"
            className="flex items-center justify-center gap-2 glass border border-white/20 hover:border-primary-500 text-white font-medium px-6 py-3 rounded-xl transition-all"
          >
            <BookOpen className="w-4 h-4" /> Browse Books
          </Link>
        </div>
      </div>
    </div>
  );
}
