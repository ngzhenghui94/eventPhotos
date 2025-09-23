

"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { createSignedUploadUrlsAction, finalizeUploadedPhotosAction } from '@/lib/photos/actions';
import { uploadLimitBytes, normalizePlanName, concurrentUploadLimit } from '@/lib/plans';

interface PhotoUploadProps {
  eventId: number;
  planName?: string | null;
}

export function PhotoUpload({ eventId, planName }: PhotoUploadProps) {
  const [traceId] = useState(() => `host-${eventId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
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
    setUploadProgress(Array(selectedFiles.length).fill(0));
    try {
      console.info('[host-upload][start]', { traceId, eventId, planName, files: selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) });
      // 1) Ask server for presigned PUT URLs
      const meta = selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }));
      let uploads, maxFileSize;
      try {
        const result = await createSignedUploadUrlsAction(eventId, meta, planName);
        uploads = result.uploads;
        maxFileSize = result.maxFileSize;
        if (!maxBytes) setMaxBytes(maxFileSize);
        console.info('[host-upload][presign][ok]', { traceId, count: uploads.length, maxFileSize });
      } catch (err) {
        console.error('[host-upload][presign][error]', { traceId, error: err });
        const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        if (message.includes('Photo limit for this event has been reached')) {
          toast.error('You have reached the maximum number of photos allowed for this event.');
        } else {
          toast.error('Failed to upload photos', { description: String(message) });
        }
        setIsUploading(false);
        return;
      }

      // 2) Upload directly to S3 using presigned URLs with bounded concurrency, show progress
      const remaining = [...uploads];
      const succeeded: typeof uploads = [];
      const failures: Array<{ name: string; status?: number; detail?: string }> = [];

      const plan = normalizePlanName(planName);
      const concurrency = concurrentUploadLimit(plan);
      let cursor = 0;
      async function worker() {
        while (true) {
          const idx = cursor++;
          if (idx >= selectedFiles.length) return;
          const file = selectedFiles[idx];
          const uIdx = remaining.findIndex(u => u.originalFilename === file.name && u.fileSize === file.size);
          if (uIdx === -1) continue;
          const u = remaining.splice(uIdx, 1)[0];
          let uploadTarget = 'unknown';
          try { const uo = new URL(u.url); uploadTarget = `${uo.protocol}//${uo.host}${uo.pathname}`; } catch {}
          const startedAt = Date.now();
          await new Promise<void>((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', u.url);
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress((prev) => {
                  const next = [...prev];
                  next[idx] = Math.round((e.loaded / e.total) * 100);
                  return next;
                });
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                succeeded.push(u);
                console.info('[host-upload][put][ok]', { traceId, file: file.name, status: xhr.status, ms: Date.now() - startedAt, target: uploadTarget });
              } else {
                failures.push({ name: u.originalFilename, status: xhr.status, detail: xhr.statusText });
                console.error('[host-upload][put][fail]', { traceId, file: file.name, status: xhr.status, statusText: xhr.statusText, ms: Date.now() - startedAt, target: uploadTarget });
              }
              resolve();
            };
            xhr.onerror = () => {
              failures.push({ name: u.originalFilename, status: xhr.status, detail: 'Network error' });
              const isMixedContent = uploadTarget.startsWith('http://') && window.location.protocol === 'https:';
              console.error('[host-upload][put][network-error]', { traceId, file: file.name, status: xhr.status, ms: Date.now() - startedAt, target: uploadTarget, hint: isMixedContent ? 'Possible Mixed Content: uploading from https page to http URL. Ensure HETZNER_S3_ENDPOINT is https.' : 'Possible CORS or networking issue. Verify bucket CORS allows PUT from this origin.' });
              resolve();
            };
            xhr.send(file);
          });
        }
      }
      await Promise.all(Array.from({ length: concurrency }, () => worker()));

      // Finalize all succeeded uploads in one batch
      if (succeeded.length > 0) {
        console.info('[host-upload][finalize][start]', { traceId, count: succeeded.length });
        await finalizeUploadedPhotosAction(eventId, succeeded.map(u => ({
          key: u.key,
          originalFilename: u.originalFilename,
          mimeType: u.mimeType,
          fileSize: u.fileSize,
        })));
  console.info('[host-upload][finalize][ok]', { traceId });
      }

      setSelectedFiles([]);
      setUploadProgress([]);
      router.refresh();
      if (failures.length) {
        const first = failures[0];
        toast.error(`Some uploads failed (${failures.length})`, { description: `${first.name}${first.status ? ` (${first.status})` : ''}${first.detail ? `: ${first.detail}` : ''}` });
        const hasStatus0 = failures.some(f => !f.status || f.status === 0);
        console.error('[host-upload][summary][partial-failures]', { traceId, failures, hint: hasStatus0 ? 'Status 0 often indicates CORS or mixed content. Ensure bucket CORS allows this origin and HETZNER_S3_ENDPOINT uses https.' : undefined });
      } else {
        console.info('[host-upload][done]', { traceId, uploaded: succeeded.length });
        toast.success(`Uploaded ${succeeded.length} file${succeeded.length !== 1 ? 's' : ''}`);
        // Notify dashboard/cards to refresh counts and stats
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('photos:changed'));
        }
      }
    } catch (error) {
      console.error('[host-upload][exception]', { traceId, error });
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
                const bytes = maxBytes ?? uploadLimitBytes(normalizePlanName(planName));
                // If Starter plan, always show 20MB
                if ((planName?.toLowerCase() ?? '') === 'starter') return 20;
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
                      {isUploading && (
                        <div className="w-32 mt-2">
                          <div className="h-2 rounded bg-gray-200 overflow-hidden">
                            <div
                              className="h-2 rounded bg-blue-500 transition-all duration-200"
                              style={{ width: `${uploadProgress[index] || 0}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-right">{uploadProgress[index] || 0}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isUploading}
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