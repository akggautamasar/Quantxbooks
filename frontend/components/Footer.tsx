import Link from 'next/link';
import { BookOpen, Github, Twitter, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl gradient-text">QuantXBooks</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Your gateway to infinite knowledge. Access thousands of premium books across all categories with our digital library platform.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Send className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Library</h4>
            <ul className="space-y-2">
              {['All Books', 'Categories', 'Featured', 'New Arrivals'].map((item) => (
                <li key={item}>
                  <Link href="/books" className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Account</h4>
            <ul className="space-y-2">
              {[
                { label: 'Login', href: '/login' },
                { label: 'Register', href: '/register' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} QuantXBooks. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
