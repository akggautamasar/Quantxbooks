'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, BookOpen, CloudUpload, CheckCircle, AlertCircle, X, File, Tag, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BOOK_CATEGORIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ─── PDF → page images extractor ─────────────────────────────────────────────

type ExtractState = 'idle' | 'analyzing' | 'running' | 'done' | 'error';

interface PdfPagesUploaderProps {
  bookTitle: string;
  onDone: (pageFileIds: string[], totalPages: number, coverFileId: string) => void;
}

function PdfPagesUploader({ bookTitle, onDone }: PdfPagesUploaderProps) {
  const [state, setState] = useState<ExtractState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (file: File) => {
    setFileName(file.name);
    setState('analyzing');
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Load pdfjs dynamically
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url,
        ).toString();
      }

      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const totalPages = doc.numPages;

      setState('running');
      setProgress({ current: 0, total: totalPages, phase: 'Extracting' });

      const fileIds: string[] = [];
      // Process in batches: render 3 pages → upload 3 concurrently → next batch
      const BATCH = 3;

      for (let batchStart = 0; batchStart < totalPages; batchStart += BATCH) {
        const end = Math.min(batchStart + BATCH, totalPages);
        const pageNums: number[] = [];
        for (let i = batchStart + 1; i <= end; i++) pageNums.push(i);

        // Render this batch sequentially (keeps memory low)
        const rendered: { pn: number; blob: Blob }[] = [];
        for (const pn of pageNums) {
          setProgress({ current: batchStart + rendered.length, total: totalPages, phase: 'Rendering' });
          const page = await doc.getPage(pn);
          const vp = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No canvas context');
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const blob = await new Promise<Blob>((res, rej) =>
            canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.82)
          );
          rendered.push({ pn, blob });
          // Free canvas memory
          canvas.width = 0;
          canvas.height = 0;
        }

        // Upload batch concurrently
        setProgress({ current: batchStart, total: totalPages, phase: 'Uploading' });
        const results = await Promise.all(
          rendered.map(async ({ pn, blob }) => {
            const form = new FormData();
            form.append('file', blob, `page-${pn}.jpg`);
            form.append('type', 'cover');
            form.append('title', bookTitle || 'book');
            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: form,
            });
            const data = await res.json();
            if (!data.success) throw new Error(`Page ${pn}: ${data.error}`);
            return { pn, fileId: data.data.file_id as string };
          })
        );
        results.sort((a, b) => a.pn - b.pn);
        for (const r of results) fileIds.push(r.fileId);

        setProgress({ current: fileIds.length, total: totalPages, phase: 'Uploading' });
      }

      setState('done');
      onDone(fileIds, totalPages, fileIds[0]);
      toast.success(`${totalPages} pages uploaded!`);
    } catch (err: any) {
      setError(err.message || 'Failed');
      setState('error');
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.pdf$/i)) { toast.error('Please select a PDF file'); return; }
    run(file);
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  if (state === 'idle') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          PDF File → Stored as Page Images <span className="text-gray-500 text-xs">(any size, no 20 MB limit)</span>
        </label>
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-primary-500/50 hover:bg-primary-900/10 rounded-xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Drop PDF here or click to browse</p>
          <p className="text-gray-600 text-xs mt-1">Each page will be saved as an image to your Telegram channel</p>
        </div>
      </div>
    );
  }

  if (state === 'analyzing') {
    return (
      <div className="p-4 bg-dark-700 border border-white/10 rounded-xl flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin flex-shrink-0" />
        <span className="text-gray-300 text-sm">Analyzing PDF…</span>
      </div>
    );
  }

  if (state === 'running') {
    return (
      <div className="p-4 bg-dark-700 border border-white/10 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <CloudUpload className="w-5 h-5 text-primary-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-sm truncate">{fileName}</p>
            <p className="text-gray-500 text-xs">
              {progress.phase} page {progress.current} of {progress.total}…
            </p>
          </div>
          <span className="text-primary-400 text-sm font-medium tabular-nums">{pct}%</span>
        </div>
        <div className="bg-dark-600 rounded-full h-1.5">
          <div
            className="bg-primary-500 h-1.5 rounded-full transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs">
          Large books take 1–2 minutes. Please keep this tab open.
        </p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{fileName}</p>
          <p className="text-gray-400 text-xs">{progress.total} pages saved as images in Telegram storage</p>
        </div>
        <button
          onClick={() => { setState('idle'); setProgress({ current: 0, total: 0, phase: '' }); setFileName(''); }}
          className="text-gray-500 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // error
  return (
    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-red-400 text-sm font-medium">Upload failed</p>
      </div>
      <p className="text-gray-400 text-xs">{error}</p>
      <button
        onClick={() => { setState('idle'); setError(''); }}
        className="text-xs text-primary-400 hover:text-primary-300"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Generic file upload zone (for cover, EPUB) ───────────────────────────────

interface UploadedFile {
  file_id: string;
  file_name: string;
  file_size: string;
  message_id: number;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface FileUploadZoneProps {
  label: string;
  accept: string;
  type: 'epub' | 'cover' | 'preview';
  bookTitle: string;
  onUploaded: (result: UploadedFile) => void;
  currentFileId?: string;
  autoFilled?: boolean;
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

      const result: UploadedFile = data.data;
      setUploaded(result);
      onUploaded(result);
      setState('done');
      setProgress(100);
      toast.success(`${label} uploaded!`);
    } catch (err: any) {
      setState('error');
      toast.error(err.message || 'Upload failed');
    }
  };

  const reset = () => { setState('idle'); setUploaded(null); setProgress(0); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>

      {autoFilled && state === 'idle' ? (
        <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Auto-extracted from PDF first page</p>
            <p className="text-gray-400 text-xs">You can still upload a custom cover below</p>
          </div>
          <button onClick={() => inputRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Replace</button>
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : state === 'done' && uploaded ? (
        <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{uploaded.file_name}</p>
            <p className="text-gray-400 text-xs">{uploaded.file_size}</p>
          </div>
          <button onClick={reset} className="text-gray-500 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ) : state === 'uploading' ? (
        <div className="p-4 bg-dark-700 border border-white/10 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <CloudUpload className="w-5 h-5 text-primary-400 animate-pulse" />
            <span className="text-gray-300 text-sm">Uploading…</span>
          </div>
          <div className="bg-dark-600 rounded-full h-1.5">
            <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            state === 'error' ? 'border-red-500/50 bg-red-900/10' : 'border-white/10 hover:border-primary-500/50 hover:bg-primary-900/10'
          )}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {state === 'error' ? <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /> : <File className="w-8 h-8 text-gray-500 mx-auto mb-2" />}
          <p className="text-gray-400 text-sm">
            {state === 'error' ? 'Upload failed — click to retry' : 'Drop file here or click to browse'}
          </p>
          <p className="text-gray-600 text-xs mt-1">{accept}</p>
          {currentFileId && state === 'idle' && (
            <p className="text-primary-400 text-xs mt-2">Already saved in Telegram</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadBookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    epub_url: '',
    category: '',
    language: 'English',
    tags: '',
    total_pages: '',
    file_size: '',
    is_premium: true,
    is_featured: false,
  });
  const [autoCoverSet, setAutoCoverSet] = useState(false);
  const [pageFileIds, setPageFileIds] = useState<string[]>([]);

  const handlePdfDone = (ids: string[], total: number, coverFileId: string) => {
    setPageFileIds(ids);
    setForm(prev => ({
      ...prev,
      total_pages: String(total),
      cover_url: prev.cover_url || coverFileId,
    }));
    if (!form.cover_url) setAutoCoverSet(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.category) {
      toast.error('Title, author, and category are required');
      return;
    }
    if (pageFileIds.length === 0) {
      toast.error('Please upload a PDF first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          total_pages: form.total_pages ? parseInt(form.total_pages) : undefined,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          preview_pages: pageFileIds,
          pdf_url: '',
          telegram_file_id: '',
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
          <p className="text-gray-400 text-sm">PDF pages are stored as images — no file size limit</p>
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
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Book title" required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Author *</label>
            <input type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}
              placeholder="Author name" required
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description…" rows={3}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm">
                <option value="">Select category</option>
                {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Language</label>
              <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Tag className="w-3 h-3 inline mr-1" />Tags (comma-separated)
            </label>
            <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="fiction, science, history"
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm" />
          </div>
        </div>

        {/* Files */}
        <div className="glass rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-primary-400" /> Files
          </h2>

          <PdfPagesUploader bookTitle={form.title} onDone={handlePdfDone} />

          <FileUploadZone
            label="Cover Image (optional — auto-filled from page 1)"
            accept="image/jpeg,image/png,image/webp"
            type="cover"
            bookTitle={form.title}
            currentFileId={form.cover_url}
            autoFilled={autoCoverSet}
            onUploaded={(r) => { setAutoCoverSet(false); setForm(prev => ({ ...prev, cover_url: r.file_id })); }}
          />

          <FileUploadZone
            label="EPUB File (optional)"
            accept="application/epub+zip,.epub"
            type="epub"
            bookTitle={form.title}
            currentFileId={form.epub_url}
            onUploaded={(r) => setForm(prev => ({ ...prev, epub_url: r.file_id }))}
          />
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
                onClick={() => setForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0',
                  (form as any)[key] ? 'bg-primary-600' : 'bg-dark-600 border border-white/20')}
              >
                <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                  (form as any)[key] ? 'translate-x-6' : 'translate-x-0.5')} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading || pageFileIds.length === 0}
            className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <><BookOpen className="w-4 h-4" /> Add to Library</>}
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
