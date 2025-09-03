'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Upload, Download, X, Camera, ArrowLeft, Link as LinkIcon, Copy, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { EventQr } from '@/components/event-qr';
import { brand } from '@/lib/brand';

type DemoMeta = {
  id: number;
  name: string;
  description?: string;
  date: string;
  location?: string;
  accessCode: string;
  guestPath: string;
  galleryPath: string;
};

type DemoPhoto = {
  id: number;
  originalFilename?: string;
  filename?: string;
  fileSize?: number;
  uploadedAt?: string;
  guestName?: string | null;
  uploadedByUser?: { name?: string | null } | null;
};

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

function DemoGalleryContent() {
  const [selectedPhoto, setSelectedPhoto] = useState<DemoPhoto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [demo, setDemo] = useState<DemoMeta | null>(null);
  const [demoState, setDemoState] = useState<LoadingState>('idle');
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<DemoPhoto[]>([]);
  const [photosState, setPhotosState] = useState<LoadingState>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const guestUrl = useMemo(() => {
    if (!demo) return '';
    try {
      return new URL(demo.guestPath, window.location.origin).toString();
    } catch {
      return demo.guestPath;
    }
  }, [demo]);

  const loadDemo = async (isRetry = false) => {
    if (isRetry) setRetryCount(prev => prev + 1);
    setDemoState('loading');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 32000); // slightly above API 30s

      const res = await fetch('/api/demo/event', {
        cache: 'no-store',
        signal: controller.signal
      });

  clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: DemoMeta = await res.json();
      setDemo(data);
      setDemoState('success');
      return data;
  } catch (error) {
      console.error('Failed to load demo:', error);
      setDemoState('error');
      return null;
    }
  };

  const loadPhotos = async (eventId: number, isRetry = false) => {
    setPhotosState('loading');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 32000); // slightly above API 30s

      const res = await fetch(`/api/events/${eventId}`, {
        cache: 'no-store',
        signal: controller.signal
      });

  clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const mapped: DemoPhoto[] = (data.photos || []).map((p: any) => ({
        id: p.id,
        originalFilename: p.originalFilename,
        filename: p.filename,
        fileSize: p.fileSize,
        uploadedAt: p.uploadedAt,
        guestName: p.guestName ?? null,
        uploadedByUser: p.uploadedByUser ?? null,
      }));

      setPhotos(mapped);
      setPhotosState('success');
    } catch (error) {
      console.error('Failed to load photos:', error);
      setPhotosState('error');
    }
  };

  // Only load demo once per mount, and photos only after demo loads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const demoData = await loadDemo();
      if (!cancelled && demoData?.id) {
        await loadPhotos(demoData.id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRetry = async () => {
    if (demoState === 'error') {
      await loadDemo(true);
    }
    if (demo?.id && photosState === 'error') {
      await loadPhotos(demo.id, true);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection and validation
  const handleFileUpload = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    let newFiles = Array.from(files);
    // Filter out files over 10MB
    const tooLarge = newFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (tooLarge.length > 0) {
      (window as any).__EP_TOAST?.error?.('File too large', { description: `${tooLarge.map(f => f.name).join(', ')} exceed 10MB.` });
      newFiles = newFiles.filter(f => f.size <= 10 * 1024 * 1024);
    }
    // Cap to 5 files total
    const combined = [...selectedFiles, ...newFiles].slice(0, 5);
    if (combined.length > 5) {
      (window as any).__EP_TOAST?.error?.('Upload limit', { description: 'You can only upload up to 5 photos at a time.' });
    }
    setSelectedFiles(combined);
  };

  // Remove a file from selectedFiles
  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== idx));
  };

  // Submit selected files
  const handleSubmitUpload = async () => {
    if (!demo || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      let successCount = 0;
      const failures: { name: string; message: string }[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const form = new FormData();
        form.append('file', file);
        form.append('eventId', String(demo.id));
        if (uploaderName) form.append('uploaderName', uploaderName);
        if (uploaderEmail) form.append('uploaderEmail', uploaderEmail);

        try {
          const res = await fetch('/api/photos', { method: 'POST', body: form });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data?.error || `Failed to upload ${file.name}`;
            failures.push({ name: file.name, message: msg });
            if (res.status === 429) break; // Rate limited
          } else {
            successCount += 1;
          }
        } catch (error) {
          failures.push({ name: file.name, message: 'Network error' });
        }
      }

      if (successCount > 0) {
        (window as any).__EP_TOAST?.success?.('Upload complete', {
          description: `${successCount} photo${successCount > 1 ? 's' : ''} uploaded.`
        });
        // Refresh photos after successful upload
        if (demo?.id) {
          await loadPhotos(demo.id);
        }
      }

      if (failures.length > 0) {
        const first = failures[0];
        const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : '';
        (window as any).__EP_TOAST?.error?.('Some uploads failed', {
          description: `${first.name}: ${first.message}${more}`
        });
      }

      setShowUploadModal(false);
      setUploaderName('');
      setUploaderEmail('');
      setSelectedFiles([]);
    } catch (e) {
      (window as any).__EP_TOAST?.error?.('Upload error', { description: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const heroBg = useMemo(() => {
    const first = photos[0];
    if (!first) return undefined;
    return `url(/api/photos/${first.id}/thumb)`;
  }, [photos]);

  const copyGuestLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      (window as any).__EP_TOAST?.success?.('Link copied', { description: 'Guest link copied to clipboard.' });
    } catch {
      (window as any).__EP_TOAST?.error?.('Copy failed', { description: 'Unable to copy link.' });
    }
  };

  // Loading state for demo
  if (demoState === 'loading' && !demo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading demo event...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (demoState === 'error' && !demo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Failed to Load Demo</h2>
          <p className="text-slate-600 mb-6">
            We couldn't load the demo event. This might be due to a temporary server issue.
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
          {retryCount > 0 && (
            <p className="text-xs text-slate-500 mt-4">
              Retry attempts: {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Decorative backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      {/* Header / Hero */}
      <div className="border-b border-slate-200/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1 text-xs tracking-wide">Demo Gallery</span>
            {(demoState === 'error' || photosState === 'error') && (
              <Button variant="outline" size="sm" onClick={handleRetry} className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>

          <div className="relative overflow-hidden rounded-3xl shadow-sm bg-white/70 ring-1 ring-slate-200/60">
            {/* Subtle image/gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-white" style={heroBg ? { backgroundImage: `${heroBg}`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px)', opacity: 0.18 } : {}} />
            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="col-span-2 p-6 sm:p-10">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                  {demo?.name || `${brand.productName} Demo Event`}
                </h1>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                  {demo?.date && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1"><Calendar className="h-4 w-4" /> {formatDate(demo.date)}</span>
                  )}
                  {demo?.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1"><MapPin className="h-4 w-4" /> {demo.location}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1"><Camera className="h-4 w-4" /> {photos.length} photos</span>
                  {photosState === 'loading' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Loading photos...
                    </span>
                  )}
                  {photosState === 'error' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 px-3 py-1">
                      <AlertCircle className="h-4 w-4" /> Failed to load photos
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {demo?.description && (
                    <p className="text-slate-700 leading-relaxed">
                      {demo.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Uploads are open on the live demo and rate-limited to 5 per IP/hour.</p>

                  {demo && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 items-start">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Guest link</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Link className="text-amber-600 hover:underline break-all flex items-center gap-1" href={demo.guestPath}><LinkIcon className="h-4 w-4" /> {guestUrl || demo.guestPath}</Link>
                          <Button type="button" variant="outline" size="sm" onClick={copyGuestLink} className="h-7 px-3">
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </Button>
                          <Link href={demo.guestPath} target="_blank" className="inline-flex items-center text-slate-600 hover:text-slate-900 text-sm">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <Button onClick={() => setShowUploadModal(true)} className="rounded-full px-6">
                          <Upload className="h-4 w-4 mr-2" /> Add Photos
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 p-6 sm:p-10 border-t lg:border-l border-slate-200/60 bg-white/40">
                {demo && (
                  <div className="mx-auto w-full max-w-[260px]">
                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                      <EventQr code={demo.guestPath.replace('/events/','')} />
                      <div className="mt-3 text-center text-xs text-slate-600">
                        Scan to open guest link
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl bg-white/70 ring-1 ring-slate-200/60 p-4 sm:p-6">
          {/* Photo Grid */}
          {photosState === 'loading' && photos.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-slate-200/60 animate-pulse" />
              ))}
            </div>
          ) : photosState === 'error' && photos.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Photos</h3>
              <p className="text-slate-600 mb-6">We couldn't load the photos for this demo event.</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden rounded-xl" onClick={() => setSelectedPhoto(photo)}>
                  <CardContent className="p-0">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={`/api/photos/${photo.id}/thumb`}
                        alt={photo.originalFilename || photo.filename || 'Event photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.dataset.fallback) {
                            img.dataset.fallback = '1';
                            img.src = `/api/photos/${photo.id}`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-opacity duration-300" />
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="backdrop-blur bg-black/60 text-white text-xs px-2 py-1 rounded truncate">{photo.guestName || photo.uploadedByUser?.name || ''}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowUploadModal(false); setSelectedFiles([]); }} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              {!demo ? (
                <div className="text-sm text-gray-600">Loading demo event…</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="uploaderName" className="block text-sm font-medium text-gray-700">Your Name (optional)</label>
                    <input id="uploaderName" type="text" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" placeholder="Enter your name" />
                  </div>
                  <div>
                    <label htmlFor="uploaderEmail" className="block text-sm font-medium text-gray-700">Your Email (optional)</label>
                    <input id="uploaderEmail" type="email" value={uploaderEmail} onChange={(e) => setUploaderEmail(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" placeholder="Enter your email" />
                  </div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                    }}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drag and drop photos here, or click to select files</p>
                    <input
                      id="demo-upload-input"
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: 'block', margin: '0 auto 8px auto' }} // visible for debugging
                      onChange={e => {
                        if (e.target.files) {
                          handleFileUpload(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading || selectedFiles.length >= 5}
                      className="rounded-full cursor-pointer"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? 'Uploading…' : 'Select Files'}
                    </Button>
                    {/* Drag and drop handler removed; now handled by parent div */}
                  </div>
                  {/* Selected files list */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Selected Photos ({selectedFiles.length}/5):</div>
                      <ul className="grid grid-cols-2 gap-3">
                        {selectedFiles.map((file, idx) => {
                          const [thumbUrl, setThumbUrl] = useState<string | null>(null);
                          useEffect(() => {
                            const reader = new FileReader();
                            reader.onload = e => setThumbUrl(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }, [file]);
                          return (
                            <li key={file.name + file.size + idx} className="relative bg-slate-100 rounded overflow-hidden flex flex-col items-center justify-center p-2">
                              {thumbUrl ? (
                                <img src={thumbUrl} alt={file.name} className="w-full h-32 object-cover rounded" />
                              ) : (
                                <div className="w-full h-32 flex items-center justify-center bg-slate-200 animate-pulse rounded">
                                  <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/60 text-white text-xs px-2 py-1 rounded">
                                <span className="truncate max-w-[90px]">{file.name}</span>
                                <span className="ml-2">{formatFileSize(file.size)}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => handleRemoveFile(idx)} disabled={uploading}>
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmitUpload}
                    disabled={uploading || selectedFiles.length === 0}
                    className="w-full mt-4 rounded-full"
                  >
                    {uploading ? 'Uploading…' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">Max size 10MB. Supported: JPG, PNG, GIF, WebP. Demo uploads are capped at 5 per upload and 5 per IP/hour.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full h-full flex flex-col">
            <div className="flex justify-between items-center p-4 text-white">
              <div>
                <h3 className="text-lg font-medium">{selectedPhoto.originalFilename || selectedPhoto.filename}</h3>
                <p className="text-sm text-gray-300">
                  {selectedPhoto.fileSize ? formatFileSize(selectedPhoto.fileSize) : ''}
                  {selectedPhoto.uploadedAt ? ` • ${formatDate(selectedPhoto.uploadedAt)}` : ''}
                  {(selectedPhoto.guestName || selectedPhoto.uploadedByUser?.name) ? ` • by ${selectedPhoto.guestName || selectedPhoto.uploadedByUser?.name}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { (window as any).__EP_TOAST?.error?.('Download is disabled in demo', { description: 'In production this would fetch from S3.' }); }} className="text-white hover:bg-white/20">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPhoto(null)} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <img src={`/api/photos/${selectedPhoto.id}`} alt={selectedPhoto.originalFilename || selectedPhoto.filename || 'Event photo'} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Floating Upload Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button onClick={() => setShowUploadModal(true)} className="rounded-full shadow-lg">
          <Upload className="h-4 w-4 mr-2" /> Add Photos
        </Button>
      </div>
    </div>
  );
}

export default function DemoGallery() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading demo...</p>
        </div>
      </div>
    }>
      <DemoGalleryContent />
    </Suspense>
  );
}