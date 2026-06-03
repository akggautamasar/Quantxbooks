'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, BookOpen, Link as LinkIcon, Image as ImageIcon,
  FileText, Tag, CloudUpload, CheckCircle, AlertCircle, X, File
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BOOK_CATEGORIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file_id: string;
  file_name: string;
  file_size: string;
  message_id: number;
  auto_cover?: { file_id: string; file_name: string } | null;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface FileUploadZoneProps {
  label: string;
  accept: string;
  type: 'pdf' | 'epub' | 'cover' | 'preview';
  bookTitle: string;
  onUploaded: (result: UploadedFile) => void;
  currentFileId?: string;
  autoFilled?: boolean; // true when cover was auto-extracted from PDF
}

function FileUploadZone({ label, accept, type, bookTitle, onUploaded, currentFileId, autoFilled }: FileUploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setState('uploading');
    setProgress(10);

    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      form.append('title', bookTitle || 'Unknown Book');

      setProgress(40);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      setProgress(90);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUploaded(data.data);
      onUploaded(data.data);
      setState('done');
      setProgress(100);
      toast.success(`${label} uploaded to Telegram storage!`);
    } catch (err: any) {
      setState('error');
      toast.error(err.message || 'Upload failed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setState('idle');
    setUploaded(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>

      {autoFilled && state === 'idle' ? (
        <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Auto-extracted from PDF first page</p>
            <p className="text-gray-400 text-xs">Saved in Telegram storage — you can still upload a custom cover below</p>
          </div>
          <button onClick={() => inputRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
            Replace
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : state === 'done' && uploaded ? (
        <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{uploaded.file_name}</p>
            <p className="text-gray-400 text-xs">{uploaded.file_size} • Saved in Telegram storage</p>
            <p className="text-gray-500 text-xs font-mono mt-0.5 truncate">ID: {uploaded.file_id}</p>
          </div>
          <button onClick={reset} className="text-gray-500 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : state === 'uploading' ? (
        <div className="p-4 bg-dark-700 border border-white/10 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <CloudUpload className="w-5 h-5 text-primary-400 animate-pulse" />
            <span className="text-gray-300 text-sm">Uploading to Telegram...</span>
          </div>
          <div className="bg-dark-600 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            state === 'error'
              ? 'border-red-500/50 bg-red-900/10'
              : 'border-white/10 hover:border-primary-500/50 hover:bg-primary-900/10'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {state === 'error' ? (
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          ) : (
            <File className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          )}
          <p className="text-gray-400 text-sm">
            {state === 'error' ? 'Upload failed — click to retry' : 'Drop file here or click to browse'}
          </p>
          <p className="text-gray-600 text-xs mt-1">{accept}</p>
          {currentFileId && state === 'idle' && (
            <p className="text-primary-400 text-xs mt-2">Current: file already saved in Telegram</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadBookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    cover_url: '',        // URL or Telegram file_id
    pdf_url: '',          // Telegram file_id for PDF
    epub_url: '',         // Telegram file_id for EPUB (optional)
    category: '',
    language: 'English',
    tags: '',
    total_pages: '',
    file_size: '',
    is_premium: true,
    is_featured: false,
    telegram_file_id: '', // main file_id fallback
    preview_pages: '',    // newline-separated URLs or file_ids
    pdf_message_id: 0,    // stored for MTProto large-file streaming
  });
  const [autoCoverSet, setAutoCoverSet] = useState(false);

  const updateFileId = (field: keyof typeof form, result: UploadedFile) => {
    setForm((prev) => ({ ...prev, [field]: result.file_id }));
    if (!form.file_size && result.file_size) {
      setForm((prev) => ({ ...prev, file_size: result.file_size }));
    }
    // Store message_id for MTProto large-file streaming
    if (field === 'pdf_url' && result.message_id) {
      setForm((prev) => ({ ...prev, pdf_message_id: result.message_id }));
    }
    // When PDF is uploaded: if Telegram generated a first-page thumbnail, use it as cover
    if ((field === 'pdf_url' || field === 'epub_url') && result.auto_cover && !form.cover_url) {
      setForm((prev) => ({ ...prev, cover_url: result.auto_cover!.file_id }));
      setAutoCoverSet(true);
      toast.success('Cover auto-extracted from PDF first page!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.category) {
      toast.error('Title, author, and category are required');
      return;
    }
    if (!form.pdf_url && !form.telegram_file_id) {
      toast.error('Please upload a PDF file');
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
          preview_pages: form.preview_pages
            ? form.preview_pages.split('\n').map((p) => p.trim()).filter(Boolean)
            : [],
          // Use pdf_url as telegram_file_id if not separately set
          telegram_file_id: form.telegram_file_id || form.pdf_url,
          telegram_message_id: form.pdf_message_id || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Book added to library!');
      router.push('/admin/books');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-900/50 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Book</h1>
          <p className="text-gray-400 text-sm">Files are stored in your Telegram storage channel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-400" /> Book Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Book title"
              required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Author *</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Author name"
              required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the book..."
              rows={3}
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
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Total Pages</label>
              <input
                type="number"
                value={form.total_pages}
                onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                placeholder="e.g. 320"
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">File Size</label>
              <input
                type="text"
                value={form.file_size}
                onChange={(e) => setForm({ ...form, file_size: e.target.value })}
                placeholder="Auto-filled on upload"
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Tag className="w-3 h-3 inline mr-1" />Tags (comma-separated)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="fiction, adventure, mystery"
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* File Uploads */}
        <div className="glass rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-primary-400" /> Files
            <span className="text-gray-500 font-normal text-xs ml-1">— uploaded to Telegram storage channel</span>
          </h2>

          <FileUploadZone
            label="Cover Image"
            accept="image/jpeg,image/png,image/webp"
            type="cover"
            bookTitle={form.title}
            currentFileId={form.cover_url}
            autoFilled={autoCoverSet}
            onUploaded={(r) => { setAutoCoverSet(false); updateFileId('cover_url', r); }}
          />

          <FileUploadZone
            label="PDF File *"
            accept="application/pdf,.pdf"
            type="pdf"
            bookTitle={form.title}
            currentFileId={form.pdf_url}
            onUploaded={(r) => updateFileId('pdf_url', r)}
          />

          <FileUploadZone
            label="EPUB File (optional)"
            accept="application/epub+zip,.epub"
            type="epub"
            bookTitle={form.title}
            currentFileId={form.epub_url}
            onUploaded={(r) => updateFileId('epub_url', r)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Preview Page Image URLs <span className="text-gray-500 font-normal">(one per line, optional)</span>
            </label>
            <textarea
              value={form.preview_pages}
              onChange={(e) => setForm({ ...form, preview_pages: e.target.value })}
              placeholder="https://example.com/preview1.jpg&#10;https://example.com/preview2.jpg"
              rows={3}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-xs font-mono resize-none"
            />
          </div>

          {/* Manual file_id fallback */}
          <details className="group">
            <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300 transition-colors">
              Advanced: enter Telegram file_id manually
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cover file_id</label>
                <input
                  type="text"
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="AgACAgIAAxkB..."
                  className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">PDF file_id</label>
                <input
                  type="text"
                  value={form.pdf_url}
                  onChange={(e) => setForm({ ...form, pdf_url: e.target.value })}
                  placeholder="BQACAgIAAxkB..."
                  className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Settings */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white">Settings</h2>
          {[
            { key: 'is_premium', label: 'Premium Book', desc: 'Require active subscription to read' },
            { key: 'is_featured', label: 'Featured', desc: 'Show in featured section on homepage' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative flex-shrink-0',
                  (form as any)[key] ? 'bg-primary-600' : 'bg-dark-600 border border-white/20'
                )}
              >
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                  (form as any)[key] ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <><BookOpen className="w-4 h-4" /> Add to Library</>}
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
