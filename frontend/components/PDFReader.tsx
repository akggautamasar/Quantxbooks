'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, BookOpen, RefreshCw } from 'lucide-react';

interface PDFReaderProps {
  bookId: string;
  title: string;
  author: string;
  onClose: () => void;
}

export default function PDFReader({ bookId, title, author, onClose }: PDFReaderProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(400);

  const touchStartX = useRef(0);

  // Create PDF.js worker via webpack's native new Worker(new URL(...)) pattern.
  // This compiles the worker to a classic chunk — no MIME type / ES-module-in-worker issues.
  useEffect(() => {
    const worker = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjs.GlobalWorkerOptions as any).workerPort = worker;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfjs.GlobalWorkerOptions as any).workerPort = null;
      worker.terminate();
    };
  }, []);

  // Fetch the PDF as a blob so we own the response and can inspect errors
  const loadPdf = useCallback(() => {
    setFetching(true);
    setErrorMsg(null);
    setBlobUrl(null);
    setNumPages(0);
    setPage(1);

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/books/${bookId}/read`, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const raw = await res.text().catch(() => '');
          let msg = `HTTP ${res.status}`;
          try { msg = JSON.parse(raw).error || msg; } catch {}
          throw new Error(msg);
        }
        return res.blob();
      })
      .then((blob) => {
        setBlobUrl(URL.createObjectURL(blob));
      })
      .catch((err: Error) => {
        setErrorMsg(err.message || 'Failed to load');
      })
      .finally(() => setFetching(false));
  }, [bookId]);

  useEffect(() => {
    loadPdf();
    return () => {
      // revoke any previous blob URL on unmount
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [loadPdf]);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setPageWidth(containerRef.current.clientWidth - 8);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setPage(p => Math.min(numPages, p + 1)), [numPages]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPage(); else prevPage();
    }
  };

  const scaledWidth = Math.min(pageWidth * scale, 1200);

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0 mr-4">
          <p className="font-semibold text-white text-sm truncate">{title}</p>
          <p className="text-gray-400 text-xs">{author || 'Unknown'}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-white px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* PDF canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-300 flex justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        {fetching ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-sm">Loading book…</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600 px-6">
            <BookOpen className="w-12 h-12 text-gray-400" />
            <p className="text-center text-sm font-medium">{errorMsg}</p>
            <button
              onClick={loadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : blobUrl ? (
          <div className="py-4 px-1">
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(err) => setErrorMsg(`PDF parse error: ${err.message}`)}
              loading={
                <div className="flex items-center justify-center" style={{ width: scaledWidth, height: '70vh' }}>
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              }
            >
              <Page
                key={`page_${page}_${scale}`}
                pageNumber={page}
                width={scaledWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center bg-white shadow-lg" style={{ width: scaledWidth, height: '70vh' }}>
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                }
                className="shadow-xl"
              />
            </Document>
          </div>
        ) : null}
      </div>

      {/* Bottom controls */}
      {numPages > 0 && (
        <div className="flex-shrink-0 bg-dark-800 border-t border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}
              disabled={scale <= 0.5}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-gray-400 text-xs w-10 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2.5, +(s + 0.25).toFixed(2)))}
              disabled={scale >= 2.5}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={page <= 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white text-sm tabular-nums select-none">
              {page} <span className="text-gray-500">/</span> {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={page >= numPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="w-24" />
        </div>
      )}
    </div>
  );
}
