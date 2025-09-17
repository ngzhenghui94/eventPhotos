'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { Photo } from '@/lib/db/schema';
import { toast } from 'sonner';

interface BulkDownloadProps {
  photos: Photo[];
  compact?: boolean;
  fullWidth?: boolean;
}

export function BulkDownload({ photos, compact, fullWidth }: BulkDownloadProps) {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    setLoading(true);
    setProgress(0);
    toast.info('Preparing ZIP file. This may take a moment for large events...');
    // We will only simulate progress if the server doesn't provide total bytes
    let interval: any | null = null;
    let fakeProgress = 0;
    try {
      const res = await fetch('/api/photos/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: photos.map(p => p.id) })
      });
      // If server returned error, surface message before attempting to read blob
      if (!res.ok) {
        try {
          const data = await res.json();
          if (data?.error) throw new Error(data.error);
        } catch {}
        if (res.status === 429) {
          toast.error('Rate limit reached. Please try again later.');
        } else {
          toast.error(`Failed to start download (${res.status}).`);
        }
        setProgress(null);
        setLoading(false);
        if (interval) clearInterval(interval);
        return;
      }
      // Stream response and track progress
      const totalHeader = res.headers.get('X-Total-Bytes');
      const total = totalHeader ? parseInt(totalHeader) : 0;
      const useSimulated = !(Number.isFinite(total) && total > 0);
      if (useSimulated) {
        interval = setInterval(() => {
          fakeProgress += Math.random() * 15;
          setProgress(Math.min(95, fakeProgress));
        }, 300);
      }
      const reader = res.body?.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;
      if (!reader) throw new Error('No readable stream');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(new Uint8Array(value));
          received += value.byteLength;
          if (!useSimulated && total > 0) {
            const pct = Math.min(99, Math.floor((received / total) * 100));
            setProgress(pct);
          }
        }
      }
      const blob = new Blob(chunks, { type: 'application/zip' });
      if (interval) clearInterval(interval);
      setProgress(100);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'photos.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('ZIP file downloaded!');
      
    } catch (err) {
      toast.error('Bulk download failed. Please try again.');
      setProgress(null);
    } finally {
      if (interval) clearInterval(interval);
      setLoading(false);
      setTimeout(() => setProgress(null), 1200);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 w-full">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleDownloadAll}
        disabled={loading}
        className={fullWidth ? 'w-full justify-center' : 'max-w-full'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        {loading ? (
          <span className="truncate">Preparing…</span>
        ) : compact ? (
          <>
            <span className="sm:hidden truncate">Download</span>
            <span className="hidden sm:inline truncate">Download All ({photos.length})</span>
          </>
        ) : (
          <span className="truncate">Download All ({photos.length})</span>
        )}
      </Button>
      {progress !== null && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}