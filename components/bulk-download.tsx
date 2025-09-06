'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { Photo } from '@/lib/db/schema';
import { toast } from 'sonner';

interface BulkDownloadProps {
  photos: Photo[];
}

export function BulkDownload({ photos }: BulkDownloadProps) {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    setLoading(true);
    setProgress(0);
    toast.info('Preparing ZIP file. This may take a moment for large events...');
    try {
      const res = await fetch('/api/photos/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: photos.map(p => p.id) })
      });
      // Simulate progress for user feedback
      let fakeProgress = 0;
      const interval = setInterval(() => {
        fakeProgress += Math.random() * 20;
        setProgress(Math.min(95, fakeProgress));
      }, 300);
      await res.blob().then(blob => {
        clearInterval(interval);
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
      });
      if (res.status === 429) {
        let message = 'Rate limit reached. Please try again later.';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
        toast.error(message);
        setProgress(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to download ZIP');
    } catch (err) {
      toast.error('Bulk download failed. Please try again.');
      setProgress(null);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(null), 1200);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleDownloadAll}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        {loading ? 'Preparing ZIP...' : `Download All (${photos.length})`}
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