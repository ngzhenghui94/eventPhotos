'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Upload, Download, X, Camera, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { EventQr } from '@/components/event-qr';

const demoEvent = {
  id: 1,
  name: "Sarah's Wedding Reception",
  description: "Join us in celebrating Sarah and Mike's special day! Share your favorite moments from the reception.",
  eventDate: "2024-01-15",
  location: "Garden Vista Venue, San Francisco",
  isPublic: true,
  allowGuestUploads: true,
  owner: {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah@example.com"
  }
};

const demoPhotos = [
  {
    id: 1,
    originalName: "wedding-ceremony-01.jpg",
    url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 2451840,
    width: 800,
    height: 800,
    uploaderName: "John Smith",
    uploaderEmail: "john@example.com",
    createdAt: "2024-01-15T18:30:00Z"
  },
  {
    id: 2,
    originalName: "bride-groom-dance.jpg",
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 3221225,
    width: 800,
    height: 800,
    uploaderName: "Emily Davis",
    uploaderEmail: "emily@example.com",
    createdAt: "2024-01-15T19:15:00Z"
  },
  {
    id: 3,
    originalName: "reception-table.jpg",
    url: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 1835008,
    width: 800,
    height: 800,
    uploaderName: "Michael Brown",
    uploaderEmail: "michael@example.com",
    createdAt: "2024-01-15T19:45:00Z"
  },
  {
    id: 4,
    originalName: "wedding-cake.jpg",
    url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 2097152,
    width: 800,
    height: 800,
    uploaderName: "Lisa Wilson",
    uploaderEmail: "lisa@example.com",
    createdAt: "2024-01-15T20:00:00Z"
  },
  {
    id: 5,
    originalName: "group-photo.jpg",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 4194304,
    width: 800,
    height: 800,
    uploaderName: "David Martinez",
    uploaderEmail: "david@example.com",
    createdAt: "2024-01-15T20:30:00Z"
  },
  {
    id: 6,
    originalName: "flowers-decoration.jpg",
    url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&h=800&fit=crop&crop=center",
    mimeType: "image/jpeg",
    fileSize: 1572864,
    width: 800,
    height: 800,
    uploaderName: "Anna Thompson",
    uploaderEmail: "anna@example.com",
    createdAt: "2024-01-15T18:45:00Z"
  }
];

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

export default function DemoGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<DemoPhoto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [demo, setDemo] = useState<DemoMeta | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(true);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<DemoPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/demo/event', { cache: 'no-store' });
        if (res.ok) {
          const data: DemoMeta = await res.json();
          if (active) setDemo(data);
        }
      } finally {
        if (active) setLoadingDemo(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const loadPhotos = async (eventId: number) => {
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
      if (!res.ok) return;
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
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (demo?.id) {
      loadPhotos(demo.id);
    }
  }, [demo?.id]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (files: FileList) => {
    if (!demo || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const form = new FormData();
        form.append('file', file);
        form.append('eventId', String(demo.id));
        if (uploaderName) form.append('uploaderName', uploaderName);
        if (uploaderEmail) form.append('uploaderEmail', uploaderEmail);
        const res = await fetch('/api/photos', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data?.error || `Failed to upload ${file.name}`;
          (window as any).__EP_TOAST?.error?.('Upload failed', { description: msg });
          if (res.status === 429) break;
        }
      }
  (window as any).__EP_TOAST?.success?.('Uploaded', { description: 'Your photos were submitted.' });
  // Refresh the grid to show new uploads
  await loadPhotos(demo.id);
      setShowUploadModal(false);
      setUploaderName('');
      setUploaderEmail('');
    } catch (e) {
      (window as any).__EP_TOAST?.error?.('Upload error', { description: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">Demo Gallery</div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{demo?.name || demoEvent.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{demo?.date ? formatDate(demo.date) : formatDate(demoEvent.eventDate)}</div>
                <div className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{demo?.location || demoEvent.location}</div>
                <div className="flex items-center"><Camera className="h-4 w-4 mr-1" />{photos.length} photos</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setShowUploadModal(true)} variant="outline" className="rounded-full px-6 py-2">
                <Upload className="h-4 w-4" />
                Add Photos
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <p className="text-gray-700">{demo?.description || demoEvent.description}</p>
            <div className="text-xs text-gray-500 mt-2">Uploads are open on the live demo and rate-limited to 5 per IP/hour.</div>
            {demo && (
              <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                <div>
                  <div className="text-sm text-gray-600">Guest link</div>
                  <Link className="text-blue-600 hover:underline" href={demo.guestPath}>{demo.guestPath}</Link>
                </div>
                <div className="flex-1">
                  <EventQr code={demo.accessCode} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden" onClick={() => setSelectedPhoto(photo)}>
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={`/api/photos/${photo.id}/thumb`}
                    alt={photo.originalFilename || photo.filename || 'Event photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = `/api/photos/${photo.id}`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-opacity duration-200" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">{photo.guestName || photo.uploadedByUser?.name || ''}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)} className="h-8 w-8 p-0">
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drag and drop photos here, or click to select files</p>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={uploading} className="rounded-full">
                      {uploading ? 'Uploading…' : 'Select Files'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Max size 10MB. Supported: JPG, PNG, GIF, WebP. Demo uploads are capped at 5 per IP/hour.</p>
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
    </div>
  );
}

async function handleFileUpload(files: FileList) {
  // This function body will be replaced at runtime by the component's closure context.
}