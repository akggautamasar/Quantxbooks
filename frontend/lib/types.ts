export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  is_premium: boolean;
  premium_expiry?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  pdf_url?: string;
  epub_url?: string;
  preview_pages: string[];
  category: string;
  tags: string[];
  language: string;
  total_pages?: number;
  file_size?: string;
  is_premium: boolean;
  is_featured: boolean;
  download_count: number;
  view_count: number;
  telegram_file_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  book_count: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  amount: number;
  start_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_id?: string;
  created_at: string;
}

export interface ReadingHistory {
  id: string;
  user_id: string;
  book_id: string;
  last_page: number;
  total_pages: number;
  progress_percentage: number;
  updated_at: string;
  book?: Book;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  note?: string;
  created_at: string;
  book?: Book;
}

export interface OTPRecord {
  id: string;
  mobile: string;
  otp: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  price: number;
  duration_days: number;
  features: string[];
  is_popular: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthToken {
  userId: string;
  mobile: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface BookFilters {
  category?: string;
  language?: string;
  search?: string;
  is_premium?: boolean;
  sort?: 'newest' | 'popular' | 'title';
  page?: number;
  limit?: number;
}

export interface AdminStats {
  total_users: number;
  premium_users: number;
  total_books: number;
  total_subscriptions: number;
  revenue_this_month: number;
  new_users_this_month: number;
}
