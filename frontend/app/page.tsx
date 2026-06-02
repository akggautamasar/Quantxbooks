'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Crown, Download, Shield, Search, Smartphone, Star, ArrowRight, Play, CheckCircle, Users, TrendingUp, Library } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STATS = [
  { icon: Library, label: 'Books Available', value: '10,000+' },
  { icon: Users, label: 'Active Readers', value: '50,000+' },
  { icon: TrendingUp, label: 'Books Read Daily', value: '5,000+' },
  { icon: Star, label: 'Average Rating', value: '4.9/5' },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Vast Library',
    description: 'Access thousands of books across 15+ categories in multiple languages.',
    color: 'from-blue-500 to-primary-600',
  },
  {
    icon: Crown,
    title: 'Premium Access',
    description: 'Affordable subscription plans starting at just ₹199/month.',
    color: 'from-gold-500 to-orange-500',
  },
  {
    icon: Download,
    title: 'Offline Reading',
    description: 'Download books and read them anywhere, even without internet.',
    color: 'from-green-500 to-teal-600',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your reading data is protected with enterprise-grade security.',
    color: 'from-purple-500 to-pink-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Seamlessly read on any device — phone, tablet, or desktop.',
    color: 'from-red-500 to-rose-600',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find books instantly by title, author, category, or keyword.',
    color: 'from-cyan-500 to-blue-600',
  },
];

const TESTIMONIALS = [
  {
    name: 'Arjun Sharma',
    role: 'Engineering Student',
    text: 'QuantXBooks completely changed how I study. The PDF reader is smooth and the book selection is incredible.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'Software Developer',
    text: 'I\'ve read over 50 books this year thanks to QuantXBooks. Best investment in my knowledge journey.',
    rating: 5,
  },
  {
    name: 'Rahul Gupta',
    role: 'Entrepreneur',
    text: 'The business and finance collection is top-notch. Definitely worth the yearly subscription.',
    rating: 5,
  },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-900/50 border border-primary-500/30 rounded-full px-4 py-1.5 mb-8">
              <Crown className="w-4 h-4 text-gold-400" />
              <span className="text-primary-300 text-sm font-medium">Premium Digital Library Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Your Gateway to{' '}
              <span className="gradient-text">Infinite Knowledge</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
              Discover, preview, and read thousands of premium digital books. Access content from every category with our affordable subscription plans.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-glow hover:shadow-xl hover:-translate-y-0.5"
              >
                Start Reading Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/books"
                className="flex items-center gap-2 glass border border-white/20 hover:border-primary-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all"
              >
                <Play className="w-5 h-5" />
                Browse Library
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 border-2 border-dark-900 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm ml-2">
                Join <span className="text-white font-semibold">50,000+</span> readers worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-8 h-8 text-primary-400 mx-auto mb-3" />
                <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
                <div className="text-gray-400 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Read More</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A complete reading platform built for book lovers who want seamless access to knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="glass rounded-2xl p-6 hover:border-white/20 transition-all group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in <span className="gradient-text">3 Simple Steps</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Register', desc: 'Sign up with your mobile number in seconds', icon: Smartphone },
              { step: '02', title: 'Choose Plan', desc: 'Pick a subscription that fits your reading goals', icon: Crown },
              { step: '03', title: 'Start Reading', desc: 'Access thousands of books instantly', icon: BookOpen },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 bg-primary-900/50 border-2 border-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-primary-400" />
                </div>
                <div className="text-primary-500 font-bold text-sm mb-2">{step}</div>
                <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
                <p className="text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Loved by <span className="gradient-text">Thousands of Readers</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-900 to-dark-700 border border-primary-500/30 p-12 text-center">
            <div className="absolute inset-0 bg-gradient-radial from-primary-600/20 to-transparent" />
            <div className="relative">
              <Crown className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start Your Premium Journey Today
              </h2>
              <p className="text-gray-300 mb-8 text-lg">
                Get unlimited access to our entire library. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="bg-white text-dark-900 font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-colors">
                  Get Started Free
                </Link>
                <Link href="/pricing" className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:border-white/60 transition-colors">
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
