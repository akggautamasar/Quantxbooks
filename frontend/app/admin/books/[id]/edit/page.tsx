'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BookOpen, Save, ArrowLeft, CloudUpload, CheckCircle, X, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { BOOK_CATEGORIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function EditBookPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
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
    preview_pages: '',
  });

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // admin endpoint returns single book via GET
        if (!res.ok) {
          // fallback: fetch from public route
          const pub = await fetch(`/api/books/${id}`);
          const pd = await pub.json();
          if (pd.success) populateForm(pd.data);
          return;
        }
        const data = await res.json();
        if (data.success) populateForm(data.data);
        else toast.error('Book not found');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const populateForm = (book: any) => {
    setForm({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
      pdf_url: book.pdf_url || '',
      epub_url: book.epub_url || '',
      category: book.category || '',
      language: book.language || 'English',
      tags: (book.tags || []).join(', '),
      total_pages: book.total_pages?.toString() || '',
      file_size: book.file_size || '',
      is_premium: book.is_premium !== false,
      is_featured: book.is_featured || false,
      preview_pages: (book.preview_pages || []).join('\n'),
    });
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'cover');
      fd.append('title', form.title || 'Book');
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm((f) => ({ ...f, cover_url: data.data.file_id }));
      toast.success('Cover uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Cover upload failed');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.category) {
      toast.error('Title, author, and category are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          total_pages: form.total_pages ? parseInt(form.total_pages) : undefined,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          preview_pages: form.preview_pages
            ? form.preview_pages.split('\n').map((p) => p.trim()).filter(Boolean)
            : [],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Book updated!');
      router.push('/admin/books');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Book</h1>
          <p className="text-gray-400 text-sm truncate max-w-xs">{form.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-400" /> Book Details
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Author *</label>
            <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm">
                <option value="">Select category</option>
                {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Language</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm">
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Total Pages</label>
              <input type="number" value={form.total_pages} onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="fiction, mystery"
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm" />
            </div>
          </div>
        </div>

        {/* Cover */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-primary-400" /> Cover Image
          </h2>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-dark-700 flex-shrink-0 border border-white/10">
              {form.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/books/${id}/cover`} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label
                className={cn(
                  'flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-3 transition-all text-sm',
                  uploadingCover
                    ? 'border-primary-500/50 bg-primary-900/10'
                    : 'border-white/10 hover:border-primary-500/50 hover:bg-primary-900/10'
                )}
              >
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                {uploadingCover
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                  : <><CloudUpload className="w-4 h-4 text-primary-400" /> Replace Cover</>}
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Or paste file_id directly</label>
                <input type="text" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="Telegram file_id..."
                  className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary-500" />
              </div>
            </div>
          </div>
        </div>

        {/* File IDs */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white">File IDs <span className="text-gray-500 font-normal text-sm">(Telegram)</span></h2>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">PDF file_id</label>
            <input type="text" value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">EPUB file_id (optional)</label>
            <input type="text" value={form.epub_url} onChange={(e) => setForm({ ...form, epub_url: e.target.value })}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-primary-500" />
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white">Settings</h2>
          {[
            { key: 'is_premium', label: 'Premium Book', desc: 'Requires active subscription to read' },
            { key: 'is_featured', label: 'Featured', desc: 'Show in featured section' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, [key]: !(f as any)[key] }))}
                className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0',
                  (form as any)[key] ? 'bg-primary-600' : 'bg-dark-600 border border-white/20')}
              >
                <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                  (form as any)[key] ? 'translate-x-6' : 'translate-x-0.5')} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-4 pb-8">
          <button type="submit" disabled={saving}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            {saving
              ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 border border-white/20 text-gray-300 hover:text-white rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
