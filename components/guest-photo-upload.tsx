'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, User } from 'lucide-react';

// Deterministic gradient picker for guest upload card
const gradients = [
  'bg-gradient-to-br from-orange-100 via-pink-50 to-rose-100',
  'bg-gradient-to-br from-indigo-50 via-white to-pink-100',
  'bg-gradient-to-br from-emerald-50 via-white to-cyan-100',
  'bg-gradient-to-br from-yellow-50 via-white to-orange-100',
  'bg-gradient-to-br from-pink-50 via-white to-yellow-100',
  'bg-gradient-to-br from-blue-50 via-white to-violet-100',
];
function pickGradient(seed: string | number, offset: number = 0) {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash + offset) % gradients.length;
  return gradients[idx];
}


interface GuestPhotoUploadProps {
  eventId: number;
}
export function GuestPhotoUpload({ eventId }: GuestPhotoUploadProps) {
  // Correlate logs for a single upload session
  const [traceId] = useState(() => `guest-${eventId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem(`tcg_upload_collapsed:guest:${eventId}`); if (v === '1') setCollapsed(true); } catch {}
  }, [eventId]);
  const router = useRouter();
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  useEffect(() => {
    let isMounted = true;
    async function fetchAllData() {
      try {
        const hostPlanRes = await fetch(`/api/events/${eventId}/host-plan`);
        let maxFileSize = 10485760;
        if (hostPlanRes.ok) {
          const data = await hostPlanRes.json();
          maxFileSize = data.maxFileSize || 10485760;
        }
        if (isMounted) setMaxFileSizeMB(Math.floor(maxFileSize / 1024 / 1024));
      } catch (err) {
        console.error('Failed to fetch event data:', err);
      }
    }
    fetchAllData();
    return () => { isMounted = false; };
  }, [eventId]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (selectedFiles.length === 0 || !guestName.trim()) return;

    setIsUploading(true);
    setUploadProgress(Array(selectedFiles.length).fill(0));
    try {
      console.info('[guest-upload][start]', { traceId, eventId, files: selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) });
      // Access code from cookie (if private event)
      let eventCode = '';
      try {
        const parts = window.location.pathname.split('/');
        const idx = parts.findIndex((p) => p === 'guest');
        eventCode = idx >= 0 ? (parts[idx + 1] || '') : '';
      } catch {}

      const cookieName = eventCode ? `evt:${eventCode.toUpperCase()}:access` : '';
      const cookieMap: Record<string, string> = document.cookie
        .split(';')
        .map((c) => c.trim().split('='))
        .reduce((acc, [k, v]) => { if (k) acc[k] = decodeURIComponent(v || ''); return acc; }, {} as Record<string, string>);
      const accessCode = cookieName ? (cookieMap[cookieName] || '') : '';

      // 1) Request presigned URLs for all files
      const meta = selectedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        clientId: `${f.name}:${f.size}:${(f as any).lastModified ?? 0}`,
      }));
      const presignRes = await fetch('/api/photos/guest/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-access-code': accessCode } : {}),
        },
        body: JSON.stringify({ eventId, files: meta, accessCode: accessCode || undefined }),
      });
      console.info('[guest-upload][presign][response]', { traceId, ok: presignRes.ok, status: presignRes.status });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        console.error('[guest-upload][presign][error]', { traceId, status: presignRes.status, body: data });
        throw new Error(data?.error || 'Failed to create upload URLs');
      }
      type UploadDescriptor = { key: string; url: string; originalFilename: string; mimeType: string; fileSize: number; clientId?: string };
      const { uploads }: { uploads: UploadDescriptor[] } = await presignRes.json();
      console.info('[guest-upload][presign][ok]', { traceId, count: uploads.length, destinations: uploads.map(u => ({ key: u.key, host: (() => { try { const uo = new URL(u.url); return `${uo.protocol}//${uo.host}`; } catch { return 'invalid-url'; } })() })) });

      // 2) PUT files directly to S3 with bounded concurrency and progress
      const uploadByClientId = new Map<string, UploadDescriptor>();
      for (const u of uploads) {
        if (u?.clientId) uploadByClientId.set(u.clientId, u);
      }
      const succeeded: UploadDescriptor[] = [];
      const failures: Array<{ name: string; status?: number; detail?: string }> = [];

      const concurrency = 2; // Hard-coded for guests
      let cursor = 0;
      async function worker() {
        while (true) {
          const idx = cursor++;
          if (idx >= selectedFiles.length) return;
          const file = selectedFiles[idx];
          const clientId = `${file.name}:${file.size}:${(file as any).lastModified ?? 0}`;
          const u = uploadByClientId.get(clientId);
          if (!u) {
            failures.push({ name: file.name, detail: 'Not eligible (too large, invalid type, or plan/event limit reached)' });
            continue;
          }
          uploadByClientId.delete(clientId);
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
                console.info('[guest-upload][put][ok]', { traceId, file: file.name, status: xhr.status, ms: Date.now() - startedAt, target: uploadTarget });
              } else {
                failures.push({ name: u.originalFilename, status: xhr.status, detail: xhr.statusText });
                console.error('[guest-upload][put][fail]', { traceId, file: file.name, status: xhr.status, statusText: xhr.statusText, ms: Date.now() - startedAt, target: uploadTarget });
              }
              resolve();
            };
            xhr.onerror = () => {
              failures.push({ name: u.originalFilename, status: xhr.status, detail: 'Network error' });
              const isMixedContent = uploadTarget.startsWith('http://') && window.location.protocol === 'https:';
              console.error('[guest-upload][put][network-error]', { traceId, file: file.name, status: xhr.status, ms: Date.now() - startedAt, target: uploadTarget, hint: isMixedContent ? 'Possible Mixed Content: uploading from https page to http URL. Ensure S3_ENDPOINT is https.' : 'Possible CORS or networking issue. Verify bucket CORS allows PUT from this origin.' });
              resolve();
            };
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
          });
        }
      }
      await Promise.all(Array.from({ length: concurrency }, () => worker()));

      // 3) Finalize successful uploads to create DB records
      if (succeeded.length > 0) {
        const finalizeRes = await fetch('/api/photos/guest/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            guestName: guestName.trim(),
            guestEmail: guestEmail.trim() || null,
            items: succeeded.map((u: UploadDescriptor) => ({
              key: u.key,
              originalFilename: u.originalFilename,
              mimeType: u.mimeType,
              fileSize: u.fileSize,
            })),
          }),
        });
        console.info('[guest-upload][finalize][response]', { traceId, ok: finalizeRes.ok, status: finalizeRes.status });
        if (!finalizeRes.ok) {
          const data = await finalizeRes.json().catch(() => ({}));
          console.error('[guest-upload][finalize][error]', { traceId, status: finalizeRes.status, body: data });
          throw new Error(data?.error || 'Failed to finalize uploads');
        }
      }

      setSelectedFiles([]);
      setGuestName('');
      setGuestEmail('');
      setUploadProgress([]);
      router.refresh();

      if (failures.length) {
        const first = failures[0];
        toast.error(`Some uploads failed (${failures.length})`, { description: `${first.name}${first.status ? ` (${first.status})` : ''}${first.detail ? `: ${first.detail}` : ''}` });
        // Log summary with a hint for common prod issues
        const hasStatus0 = failures.some(f => !f.status || f.status === 0);
        console.error('[guest-upload][summary][partial-failures]', { traceId, failures, hint: hasStatus0 ? 'Status 0 often indicates CORS or mixed content. Ensure bucket CORS allows this origin and S3_ENDPOINT uses https.' : undefined });
      } else {
        console.info('[guest-upload][done]', { traceId, uploaded: selectedFiles.length });
        toast.success('Photos uploaded');
        // Notify other tabs/pages (e.g., dashboard) that photos changed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('photos:changed'));
        }
      }
    } catch (error: any) {
      console.error('[guest-upload][exception]', { traceId, error });
      toast.error('Failed to upload photos', { description: String(error?.message || error) });
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
    <Card className={`${pickGradient(eventId)} rounded-xl shadow-lg ring-1 ring-rose-100/60`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="bg-orange-100 rounded-full p-2">
            <Upload className="h-5 w-5 text-orange-500" />
          </span>
          <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-pink-500 to-rose-500">
            Share Your Photos
          </span>
        </CardTitle>
        <button
          type="button"
          className="inline-flex items-center text-sm text-rose-700 hover:text-rose-800"
          aria-expanded={!collapsed}
          onClick={() => {
            setCollapsed((c) => {
              const next = !c;
              try { localStorage.setItem(`tcg_upload_collapsed:guest:${eventId}`, next ? '1' : '0'); } catch {}
              return next;
            });
          }}
        >
          {collapsed ? (<><ChevronDown className="h-4 w-4 mr-1"/> Expand</>) : (<><ChevronUp className="h-4 w-4 mr-1"/> Minimize</>)}
        </button>
      </CardHeader>
      {!collapsed && (
      <CardContent className="space-y-6">
        {/* Guest Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guestName">Your Name *</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="guestEmail">Email (optional)</Label>
            <Input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="mt-1"
            />
          </div>
        </div>

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
              Supports JPG, PNG, GIF up to {maxFileSizeMB}MB each
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
              disabled={isUploading || !guestName.trim()}
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}

        {/* Info Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">
                Guest Upload Guidelines
              </p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Please provide your name so others know who shared the photos</li>
                <li>• Your photos may require approval before appearing in the gallery</li>
                <li>• Only upload photos that are appropriate and relevant to this event</li>
                <li>• Supported formats: JPG, PNG, GIF (max {maxFileSizeMB}MB each)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}