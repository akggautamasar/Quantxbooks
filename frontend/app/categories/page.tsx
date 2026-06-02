import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BOOK_CATEGORIES } from '@/lib/constants';

const CATEGORY_ICONS: Record<string, string> = {
  'Fiction': '📖',
  'Non-Fiction': '📰',
  'Science & Technology': '🔬',
  'Business & Finance': '💼',
  'Self-Help': '🌱',
  'History': '🏛️',
  'Philosophy': '🤔',
  'Religion & Spirituality': '🙏',
  'Health & Wellness': '💪',
  'Education': '🎓',
  'Arts & Culture': '🎨',
  'Travel': '✈️',
  'Children': '🧒',
  'Comics & Manga': '🦸',
  'Biographies': '👤',
};

const CATEGORY_COLORS = [
  'from-blue-500/20 to-primary-600/20 border-blue-500/30 hover:border-blue-500/60',
  'from-green-500/20 to-teal-600/20 border-green-500/30 hover:border-green-500/60',
  'from-purple-500/20 to-pink-600/20 border-purple-500/30 hover:border-purple-500/60',
  'from-gold-500/20 to-orange-500/20 border-gold-500/30 hover:border-gold-500/60',
  'from-red-500/20 to-rose-600/20 border-red-500/30 hover:border-red-500/60',
  'from-cyan-500/20 to-blue-600/20 border-cyan-500/30 hover:border-cyan-500/60',
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Browse by <span className="gradient-text">Category</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Explore our vast collection organized across {BOOK_CATEGORIES.length} categories
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {BOOK_CATEGORIES.map((category, index) => (
              <Link
                key={category}
                href={`/books?category=${encodeURIComponent(category)}`}
                className={`relative rounded-2xl p-6 border bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} transition-all hover:-translate-y-1 group`}
              >
                <div className="text-3xl mb-3">{CATEGORY_ICONS[category] || '📚'}</div>
                <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-primary-300 transition-colors">
                  {category}
                </h3>
              </Link>
            ))}
          </div>

          {/* Languages section */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Browse by <span className="gradient-text">Language</span>
              </h2>
              <p className="text-gray-400">Find books in your preferred language</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {[
                { lang: 'English', flag: '🇬🇧' },
                { lang: 'Hindi', flag: '🇮🇳' },
                { lang: 'Bengali', flag: '🇮🇳' },
                { lang: 'Tamil', flag: '🇮🇳' },
                { lang: 'Telugu', flag: '🇮🇳' },
                { lang: 'Marathi', flag: '🇮🇳' },
                { lang: 'Gujarati', flag: '🇮🇳' },
                { lang: 'Kannada', flag: '🇮🇳' },
                { lang: 'Malayalam', flag: '🇮🇳' },
                { lang: 'Punjabi', flag: '🇮🇳' },
                { lang: 'Urdu', flag: '🇵🇰' },
              ].map(({ lang, flag }) => (
                <Link
                  key={lang}
                  href={`/books?language=${encodeURIComponent(lang)}`}
                  className="flex items-center gap-2 glass rounded-full px-4 py-2 hover:border-primary-500/50 transition-all group"
                >
                  <span className="text-lg">{flag}</span>
                  <span className="text-gray-300 group-hover:text-white text-sm font-medium transition-colors">{lang}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
