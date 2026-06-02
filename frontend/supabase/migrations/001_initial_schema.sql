-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(255),
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expiry TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  telegram_chat_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  book_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  epub_url TEXT,
  preview_pages TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  language VARCHAR(50) DEFAULT 'English',
  total_pages INTEGER,
  file_size VARCHAR(20),
  is_premium BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  telegram_file_id TEXT,
  telegram_cover_file_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP records table
CREATE TABLE IF NOT EXISTS otp_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly', 'lifetime')),
  amount DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_id VARCHAR(255),
  payment_provider VARCHAR(50) DEFAULT 'cosmofeed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading history table
CREATE TABLE IF NOT EXISTS reading_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  last_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, page_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
CREATE INDEX IF NOT EXISTS idx_books_is_premium ON books(is_premium);
CREATE INDEX IF NOT EXISTS idx_books_is_featured ON books(is_featured);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_records(mobile);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_books_fts ON books USING GIN(
  to_tsvector('english', title || ' ' || COALESCE(author, '') || ' ' || COALESCE(description, ''))
);

-- Trigger to update users.is_premium based on active subscriptions
CREATE OR REPLACE FUNCTION update_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE users
    SET is_premium = TRUE, premium_expiry = NEW.expiry_date, updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('expired', 'cancelled') THEN
    -- Check if user has any other active subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = NEW.user_id
      AND status = 'active'
      AND expiry_date > NOW()
      AND id != NEW.id
    ) THEN
      UPDATE users
      SET is_premium = FALSE, premium_expiry = NULL, updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_premium_trigger
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_premium_status();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default categories
INSERT INTO categories (name, slug, description, icon) VALUES
('Fiction', 'fiction', 'Novels and fictional stories', '📖'),
('Non-Fiction', 'non-fiction', 'Real-world topics and facts', '📰'),
('Science & Technology', 'science-technology', 'STEM books', '🔬'),
('Business & Finance', 'business-finance', 'Business and money management', '💼'),
('Self-Help', 'self-help', 'Personal development', '🌱'),
('History', 'history', 'Historical events and civilizations', '🏛️'),
('Philosophy', 'philosophy', 'Philosophy and ethics', '🤔'),
('Religion & Spirituality', 'religion-spirituality', 'Religious texts and spiritual guides', '🙏'),
('Health & Wellness', 'health-wellness', 'Health and fitness', '💪'),
('Education', 'education', 'Educational resources', '🎓'),
('Arts & Culture', 'arts-culture', 'Art, music, and culture', '🎨'),
('Travel', 'travel', 'Travel guides and stories', '✈️'),
('Children', 'children', 'Books for young readers', '🧒'),
('Comics & Manga', 'comics-manga', 'Comics and manga', '🦸'),
('Biographies', 'biographies', 'Life stories of notable people', '👤')
ON CONFLICT (slug) DO NOTHING;
