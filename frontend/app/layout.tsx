import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'QuantXBooks — Premium Digital Library',
    template: '%s | QuantXBooks',
  },
  description:
    'Discover, preview, and read thousands of digital books. Access premium content with our subscription plans.',
  keywords: ['digital library', 'ebooks', 'online reading', 'pdf reader', 'epub reader'],
  openGraph: {
    title: 'QuantXBooks — Premium Digital Library',
    description: 'Your gateway to infinite knowledge',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-900 text-white antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
