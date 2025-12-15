"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Upload, Download, X, Camera } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  description?: string;
  eventDate?: string;
  location?: string;
  isPublic: boolean;
  allowGuestUploads: boolean;
  owner: {
    id: number;
    name?: string;
    email: string;
  };
}

interface Photo {
  id: number;
  originalName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  uploaderName?: string;
  uploaderEmail?: string;
  createdAt: string;
}

interface PresignedUpload {
  key: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
}

interface PublicGalleryProps {
  params: Promise<{ eventId: string }>;
}

export default function PublicGallery({ params }: PublicGalleryProps) {
  const [traceId] = useState(() => `gallery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [eventId, setEventId] = useState<string>('');
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initParams() {
      const resolvedParams = await params;
      setEventId(resolvedParams.eventId);
    }
    initParams();
  }, [params]);

  useEffect(() => {
    if (eventId) {
      fetchEventPhotos();
    }
  }, [eventId]);

  const fetchEventPhotos = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('This event is private or does not exist');
        }
        throw new Error('Failed to fetch event');
      }
      const data = await response.json();
      setEvent(data.event);
      setPhotos(data.photos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      console.info('[gallery-upload][start]', { traceId, eventId, files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })) });
      // Build metadata and request presigned URLs
      const meta = Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size }));
      const presignRes = await fetch('/api/photos/guest/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: Number(eventId), files: meta }),
      });
      console.info('[gallery-upload][presign][response]', { traceId, ok: presignRes.ok, status: presignRes.status });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        console.error('[gallery-upload][presign][error]', { traceId, status: presignRes.status, body: data });
        throw new Error(data?.error || 'Failed to create upload URLs');
      }
      const presignData: { uploads: PresignedUpload[] } = await presignRes.json();
      const uploads: PresignedUpload[] = presignData.uploads;
      console.info('[gallery-upload][presign][ok]', { traceId, count: uploads.length });

      const remaining: PresignedUpload[] = [...uploads];
      const succeeded: PresignedUpload[] = [];
      const failures: Array<{ name: string; status?: number; detail?: string }> = [];

      await Promise.all(Array.from(files).map((file) => {
        return new Promise<void>((resolve) => {
          const uIdx = remaining.findIndex(u => u.originalFilename === file.name && u.fileSize === file.size);
          if (uIdx === -1) return resolve();
          const u = remaining.splice(uIdx, 1)[0];
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', u.url);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              succeeded.push(u);
              console.info('[gallery-upload][put][ok]', { traceId, file: file.name, status: xhr.status });
            } else {
              failures.push({ name: u.originalFilename, status: xhr.status, detail: xhr.statusText });
              console.error('[gallery-upload][put][fail]', { traceId, file: file.name, status: xhr.status, statusText: xhr.statusText });
            }
            resolve();
          };
          xhr.onerror = () => {
            failures.push({ name: u.originalFilename, status: xhr.status, detail: 'Network error' });
            let target = 'unknown';
            try { const uo = new URL(u.url); target = `${uo.protocol}//${uo.host}${uo.pathname}`; } catch {}
            const isMixedContent = target.startsWith('http://') && window.location.protocol === 'https:';
            console.error('[gallery-upload][put][network-error]', { traceId, file: file.name, status: xhr.status, target, hint: isMixedContent ? 'Possible Mixed Content: uploading from https page to http URL. Ensure HETZNER_S3_ENDPOINT is https.' : 'Possible CORS or networking issue. Verify bucket CORS allows PUT from this origin.' });
            resolve();
          };
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.send(file);
        });
      }));

      if (succeeded.length > 0) {
        const finalizeRes = await fetch('/api/photos/guest/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: Number(eventId),
            guestName: uploaderName || null,
            guestEmail: uploaderEmail || null,
            items: succeeded.map(u => ({
              key: u.key,
              originalFilename: u.originalFilename,
              mimeType: u.mimeType,
              fileSize: u.fileSize,
            })),
          }),
        });
        if (!finalizeRes.ok) {
          const data = await finalizeRes.json().catch(() => ({}));
          console.error('[gallery-upload][finalize][error]', { traceId, status: finalizeRes.status, body: data });
          throw new Error(data?.error || 'Failed to finalize uploads');
        }
        console.info('[gallery-upload][finalize][ok]', { traceId, count: succeeded.length });
      }

      await fetchEventPhotos();
      setShowUploadModal(false);
      setUploaderName('');
      setUploaderEmail('');

      if (failures.length) {
        const first = failures[0];
        setError(`Some uploads failed: ${first.name}${first.status ? ` (${first.status})` : ''}${first.detail ? `: ${first.detail}` : ''}`);
        const hasStatus0 = failures.some(f => !f.status || f.status === 0);
        console.error('[gallery-upload][summary][partial-failures]', { traceId, failures, hint: hasStatus0 ? 'Status 0 often indicates CORS or mixed content. Ensure bucket CORS allows this origin and HETZNER_S3_ENDPOINT uses https.' : undefined });
      }
    } catch (err) {
      console.error('[gallery-upload][exception]', { traceId, err });
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">This event does not exist or is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(event.eventDate)}
                </div>
                {event.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center">
                  <Camera className="h-4 w-4 mr-1" />
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {event.allowGuestUploads && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Add Photos
              </Button>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-6">
              <p className="text-gray-700">{event.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600 mb-6">Be the first to share photos from this event!</p>
            {event.allowGuestUploads && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2"
              >
                Upload Photos
              </Button>
            )}
          </div>
        )}

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <Card
                key={photo.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                onClick={() => setSelectedPhoto(photo)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    <img
                      src={`/api/photos/${photo.id}/thumb`}
                      alt={(photo as any).originalFilename || (photo as any).originalName || (photo as any).filename || 'Event photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src = `/api/photos/${photo.id}`;
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="uploaderName" className="text-sm font-medium text-gray-700">
                    Your Name (optional)
                  </Label>
                  <Input
                    id="uploaderName"
                    type="text"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    className="mt-1"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <Label htmlFor="uploaderEmail" className="text-sm font-medium text-gray-700">
                    Your Email (optional)
                  </Label>
                  <Input
                    id="uploaderEmail"
                    type="email"
                    value={uploaderEmail}
                    onChange={(e) => setUploaderEmail(e.target.value)}
                    className="mt-1"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Drag and drop photos here, or click to select files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={uploading}
                  className="rounded-full"
                >
                  {uploading ? 'Uploading...' : 'Select Files'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Maximum file size: 20MB. Supported formats: JPG, PNG, GIF, WebP
              </p>
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
                <h3 className="text-lg font-medium">{selectedPhoto.originalName}</h3>
                <p className="text-sm text-gray-300">
                  {formatFileSize(selectedPhoto.fileSize)} • {formatDate(((selectedPhoto as any).createdAt || (selectedPhoto as any).uploadedAt) as string)}
                  {selectedPhoto.uploaderName && ` • by ${selectedPhoto.uploaderName}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/photos/${selectedPhoto.id}/download`;
                    link.download = selectedPhoto.originalName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={`/api/photos/${selectedPhoto.id}`}
                alt={selectedPhoto.originalName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}