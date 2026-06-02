import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { CheckCircle } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, Transparent <span className="gradient-text">Pricing</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
              Choose a plan that fits your reading habits. All plans include full access to our library.
            </p>
          </div>

          <SubscriptionPlans />

          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold text-white mb-8">All Plans Include</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                'Access to 10,000+ books',
                'PDF & EPUB reader',
                'Mobile & desktop access',
                'Reading history tracking',
                'Bookmark pages',
                'All categories & languages',
                'Customer support',
                'Regular new additions',
                'Cancel anytime',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
