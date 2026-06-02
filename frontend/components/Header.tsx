'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Menu, X, Search, Bell, User, LogOut, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavUser {
  name: string;
  is_premium: boolean;
  role: string;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  const navLinks = [
    { href: '/books', label: 'Library' },
    { href: '/categories', label: 'Categories' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass-dark shadow-lg' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">QuantXBooks</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary-400',
                  pathname === link.href ? 'text-primary-400' : 'text-gray-300'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/books"
              className="hidden md:flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 glass rounded-full px-3 py-1.5 hover:border-primary-500 transition-all"
                >
                  <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user.name.split(' ')[0]}</span>
                  {user.is_premium && (
                    <Crown className="w-4 h-4 text-gold-400" />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass-dark rounded-xl shadow-xl border border-white/10 py-1 z-50">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gold-400 hover:text-gold-300 hover:bg-white/5 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Crown className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="border-white/10 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-glow"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass-dark border-t border-white/10 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-gray-300 hover:text-white py-2 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <>
              <Link href="/login" className="block text-gray-300 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Login</Link>
              <Link href="/register" className="block bg-primary-600 text-white text-center py-2 rounded-lg" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
