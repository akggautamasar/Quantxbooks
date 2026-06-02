# QuantXBooks — Premium Digital Library Platform

A full-stack premium digital library platform built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **User Authentication** — Mobile OTP login via Telegram bot
- **Book Catalog** — Grid/list view, search, category & language filters
- **Preview System** — Cover image + first 2–3 preview pages for all users
- **Reader System** — In-browser PDF reader; EPUB support; premium access control
- **Subscription System** — Monthly / Quarterly / Yearly / Lifetime plans via Cosmofeed
- **Admin Panel** — Upload books, manage users, view stats, grant/revoke premium
- **Telegram Integration** — OTP delivery bot + admin notification channel
- **Responsive UI** — Mobile-first dark theme with glass morphism

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + OTP via Telegram Bot |
| Payment | Cosmofeed |
| Hosting | Vercel (frontend + API) |

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/login          # Mobile + OTP login
│   ├── (auth)/register       # User registration
│   ├── books/                # Book catalog + book details + PDF reader
│   ├── categories/           # Browse by category/language
│   ├── dashboard/            # User dashboard (history, subscriptions, profile)
│   ├── pricing/              # Subscription plans
│   ├── admin/                # Admin panel (books, users, stats)
│   └── api/                  # REST API routes
│       ├── auth/             # register, send-otp, verify-otp
│       ├── books/            # List & detail endpoints
│       ├── subscriptions/    # Manage subscriptions
│       ├── user/             # Profile & reading history
│       ├── admin/            # Admin-only endpoints
│       ├── telegram/         # Bot webhook & setup
│       └── webhook/          # Cosmofeed payment webhook
├── components/               # Reusable UI components
├── lib/                      # Types, utils, Supabase client, auth helpers
└── supabase/migrations/      # PostgreSQL schema
```

## Setup

### 1. Clone & Install

```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required values:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (keep secret)
- `JWT_SECRET` — random 32+ character string
- `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
- `TELEGRAM_ADMIN_CHAT_ID` — your Telegram chat ID for admin notifications

### 3. Run Database Migrations

Apply `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor or via the Supabase CLI:

```bash
supabase db push
```

### 4. Setup Telegram Bot

After starting the app, call the setup endpoint:

```bash
curl -X POST https://your-domain.com/api/telegram/setup
```

This sets the webhook URL and bot commands automatically.

### 5. Development

```bash
npm run dev
```

### 6. Production Build

```bash
npm run build
npm start
```

## Admin Setup

To make a user an admin, update their role in the database:

```sql
UPDATE users SET role = 'admin' WHERE mobile = '9876543210';
```

## Subscription Plans

| Plan | Price | Duration |
|---|---|---|
| Monthly | ₹199 | 30 days |
| Quarterly | ₹499 | 90 days |
| Yearly | ₹1,499 | 365 days |
| Lifetime | ₹4,999 | Forever |

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard before deploying.
