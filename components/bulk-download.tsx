'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Photo } from '@/lib/db/schema';

interface BulkDownloadProps {
  photos: Photo[];
}

export function BulkDownload({ photos }: BulkDownloadProps) {
  const handleDownloadAll = () => {
    photos.forEach((photo, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = photo.filePath;
        link.download = photo.originalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 100); // Stagger downloads to avoid browser limits
    });
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleDownloadAll}
    >
      <Download className="h-4 w-4 mr-1" />
      Download All ({photos.length})
    </Button>
  );
}