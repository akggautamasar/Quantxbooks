'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, BookOpen, Link as LinkIcon, Image as ImageIcon, FileText, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { BOOK_CATEGORIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function UploadBookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    pdf_url: '',
    epub_url: '',
    category: '',
    language: 'English',
    tags: '',
    total_pages: '',
    file_size: '',
    is_premium: true,
    is_featured: false,
    telegram_file_id: '',
    preview_pages: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.category) {
      toast.error('Title, author, and category are required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          total_pages: form.total_pages ? parseInt(form.total_pages) : undefined,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          preview_pages: form.preview_pages ? form.preview_pages.split('\n').map((p) => p.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Book uploaded successfully!');
      router.push('/admin/books');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload book');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = 'text', placeholder, icon: Icon, required = false }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}{required && ' *'}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
        <input
          type={type}
          value={(form as any)[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={placeholder}
          required={required}
          className={cn(
            'w-full bg-dark-700 border border-white/10 rounded-xl py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm transition-colors',
            Icon ? 'pl-10 pr-4' : 'px-4'
          )}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-900/50 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Book</h1>
          <p className="text-gray-400 text-sm">Add a new book to the library</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-400" /> Book Information
          </h2>
          <InputField label="Title" name="title" placeholder="Book title" icon={BookOpen} required />
          <InputField label="Author" name="author" placeholder="Author name" required />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Book description..."
              rows={4}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
              >
                <option value="">Select category</option>
                {BOOK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
              >
                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Total Pages" name="total_pages" type="number" placeholder="e.g. 320" />
            <InputField label="File Size" name="file_size" placeholder="e.g. 5.2 MB" />
          </div>

          <InputField label="Tags (comma-separated)" name="tags" placeholder="fiction, adventure, thriller" icon={Tag} />
        </div>

        {/* Media URLs */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary-400" /> Media & Files
          </h2>
          <InputField label="Cover Image URL" name="cover_url" placeholder="https://example.com/cover.jpg" icon={ImageIcon} />
          <InputField label="PDF URL" name="pdf_url" placeholder="https://example.com/book.pdf" icon={FileText} />
          <InputField label="EPUB URL" name="epub_url" placeholder="https://example.com/book.epub" icon={FileText} />
          <InputField label="Telegram File ID" name="telegram_file_id" placeholder="Telegram storage file ID" />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Preview Page URLs (one per line)</label>
            <textarea
              value={form.preview_pages}
              onChange={(e) => setForm({ ...form, preview_pages: e.target.value })}
              placeholder="https://example.com/preview1.jpg&#10;https://example.com/preview2.jpg&#10;https://example.com/preview3.jpg"
              rows={4}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm resize-none font-mono text-xs"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Settings</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Premium Book</div>
              <div className="text-gray-400 text-xs">Require subscription to read</div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_premium: !form.is_premium })}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                form.is_premium ? 'bg-primary-600' : 'bg-dark-600'
              )}
            >
              <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform', form.is_premium ? 'translate-x-6' : 'translate-x-0.5')} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">Featured Book</div>
              <div className="text-gray-400 text-xs">Show on homepage and featured section</div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_featured: !form.is_featured })}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                form.is_featured ? 'bg-primary-600' : 'bg-dark-600'
              )}
            >
              <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform', form.is_featured ? 'translate-x-6' : 'translate-x-0.5')} />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Upload className="w-4 h-4" /> Upload Book</>}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 border border-white/20 text-gray-300 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
