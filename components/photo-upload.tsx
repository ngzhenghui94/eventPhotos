'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { createSignedUploadUrlsAction, finalizeUploadedPhotosAction } from '@/lib/photos/actions';
import { getTeamForUser } from '@/lib/db/queries';
import { getUploadLimitForTeam } from '@/lib/plans';

interface PhotoUploadProps {
  eventId: number;
  teamPlanName?: string | null;
}

export function PhotoUpload({ eventId, teamPlanName }: PhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [maxBytes, setMaxBytes] = useState<number | null>(null);

  // Lazy load max upload size (client-safe; falls back to 10MB until fetched)
  // We don’t want to import server-only code here; so we’ll fetch via an action
  // but to keep this simple and avoid extra endpoints, we infer from the first presign.

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      // 1) Ask server for presigned PUT URLs
      const meta = selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }));
  const { uploads, maxFileSize } = await createSignedUploadUrlsAction(eventId, meta);
  if (!maxBytes) setMaxBytes(maxFileSize);

      // 2) Upload directly to S3 using presigned URLs
      const remaining = [...uploads];
      const succeeded: typeof uploads = [];
      const failures: Array<{ name: string; status?: number; detail?: string }> = [];
      for (const file of selectedFiles) {
        const idx = remaining.findIndex(u => u.originalFilename === file.name && u.fileSize === file.size);
        if (idx === -1) continue;
        const u = remaining.splice(idx, 1)[0];
        const res = await fetch(u.url, {
          method: 'PUT',
          // Omit Content-Type header to reduce signature/CORS mismatch risk; S3 will infer or store default
          // headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!res.ok) {
          let detail = '';
          try { detail = await res.text(); } catch {}
          console.error('S3 upload failed', { name: file.name, status: res.status, statusText: res.statusText, detail });
          failures.push({ name: file.name, status: res.status, detail });
          continue;
        }
        succeeded.push(u);
      }

      // 3) Finalize in DB
      if (succeeded.length > 0) {
        await finalizeUploadedPhotosAction(
          eventId,
          succeeded.map(u => ({
            key: u.key,
            originalFilename: u.originalFilename,
            mimeType: u.mimeType,
            fileSize: u.fileSize,
          }))
        );
      }

  setSelectedFiles([]);
  router.refresh();
      if (failures.length) {
        const first = failures[0];
        toast.error(`Some uploads failed (${failures.length})`, { description: `${first.name}${first.status ? ` (${first.status})` : ''}${first.detail ? `: ${first.detail}` : ''}` });
      } else {
        toast.success(`Uploaded ${succeeded.length} file${succeeded.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      toast.error('Failed to upload photos', { description: String(message) });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          Upload Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop photos here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, GIF up to {(() => {
                const bytes = maxBytes ?? getUploadLimitForTeam(teamPlanName);
                // If Starter plan, always show 20MB
                if ((teamPlanName?.toLowerCase() ?? '') === 'starter') return 20;
                return Math.round(bytes / (1024 * 1024));
              })()}MB each
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedFiles([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}