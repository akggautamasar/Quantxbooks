import { SubscriptionPlan } from './types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    plan: 'monthly',
    price: 199,
    duration_days: 30,
    features: [
      'Unlimited book access',
      'Download up to 5 books/month',
      'Bookmark & reading history',
      'All categories & languages',
    ],
    is_popular: false,
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    plan: 'quarterly',
    price: 499,
    duration_days: 90,
    features: [
      'Everything in Monthly',
      'Download up to 20 books/month',
      'Priority support',
      'Early access to new books',
    ],
    is_popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    plan: 'yearly',
    price: 1499,
    duration_days: 365,
    features: [
      'Everything in Quarterly',
      'Unlimited downloads',
      'Offline reading',
      'Exclusive premium titles',
    ],
    is_popular: false,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    plan: 'lifetime',
    price: 4999,
    duration_days: 36500,
    features: [
      'Everything in Yearly',
      'Lifetime access — pay once',
      'Future updates included',
      'VIP support',
    ],
    is_popular: false,
  },
];

export const BOOK_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science & Technology',
  'Business & Finance',
  'Self-Help',
  'History',
  'Philosophy',
  'Religion & Spirituality',
  'Health & Wellness',
  'Education',
  'Arts & Culture',
  'Travel',
  'Children',
  'Comics & Manga',
  'Biographies',
];

export const LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Urdu',
];

export const FREE_PREVIEW_PAGES = 3;
export const MAX_OTP_ATTEMPTS = 3;
export const OTP_EXPIRY_MINUTES = 10;
