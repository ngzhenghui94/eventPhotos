'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Download, Eye, X, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { deletePhotoAction, deletePhotosBulkAction } from '@/lib/photos/actions';
import { VirtualizedPhotoGrid } from './virtualized-photo-grid';
import { OptimizedImage } from './optimized-image';
import type { Photo, User } from '@/lib/db/schema';

interface PhotoGalleryProps {
  photos: (Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  eventId: number;
  currentUserId?: number;
  canManage: boolean;
  accessCode?: string;
}

export function PhotoGallery({ photos, eventId, currentUserId, canManage, accessCode }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [useVirtualized, setUseVirtualized] = useState(photos.length > 50);
  
  const allIds = useMemo(() => photos.map(p => p.id), [photos]);
  const allSelected = selectedIds.size > 0 && selectedIds.size === allIds.length;

  // Switch to virtualized view for large photo sets
  useEffect(() => {
    setUseVirtualized(photos.length > 50);
  }, [photos.length]);

  // --- Photo limit logic ---
  // Assume planName is available via props or context, fallback to 'free'
  // You may need to pass planName from parent if not available here
  const planName = (typeof window !== 'undefined' && window.__EP_PLAN) ? window.__EP_PLAN : 'free';
  const normalizedPlan = planName.toLowerCase().includes('business') ? 'business'
    : planName.toLowerCase().includes('pro') ? 'pro'
    : planName.toLowerCase().includes('hobby') ? 'hobby'
    : planName.toLowerCase().includes('starter') ? 'starter'
    : 'free';
  const photoLimit = normalizedPlan === 'business' ? 500
    : normalizedPlan === 'pro' ? 250
    : normalizedPlan === 'hobby' ? 500
    : normalizedPlan === 'starter' ? 100
    : 50;

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const { refresh } = require('next/navigation');
  const handleDeletePhoto = async (photoId: number) => {
    if (confirmingId !== photoId) {
      setConfirmingId(photoId);
      toast.info('Click delete again to confirm photo removal.', { description: 'This action cannot be undone.' });
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }

    setIsDeleting(photoId);
    try {
      const formData = new FormData();
      formData.append('photoId', photoId.toString());
      await deletePhotoAction(formData);
      toast.success('Photo deleted');
      // Notify other tabs/pages (e.g., dashboard) that photos changed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('photos:changed'));
      }
      // Use Next.js router.refresh for server-side revalidation
      if (typeof refresh === 'function') {
        refresh();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: unknown) {
      // Suppress toast for NEXT_REDIRECT errors
      if (error && typeof error === 'object' && 'digest' in error && (error as any).digest === 'NEXT_REDIRECT') {
        // Do nothing, this is a navigation redirect
      } else {
        console.error('Error deleting photo:', error);
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
        toast.error(`Failed to delete photo: ${message}`);
      }
    } finally {
      setIsDeleting(null);
      setConfirmingId(null);
    }
  };

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No photos yet
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-sm">
            Photos uploaded to this event will appear here. Start by uploading some photos!
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allIds));
  const clearAll = () => setSelectedIds(new Set());

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const confirmText = selectedIds.size === 1 ? 'Delete 1 photo?' : `Delete ${selectedIds.size} photos?`;
    if (!confirm(confirmText)) return;
    try {
      const formData = new FormData();
      formData.append('eventId', String(eventId));
      formData.append('photoIds', JSON.stringify(Array.from(selectedIds)));
      const result = await deletePhotosBulkAction(formData);
      toast.success(`${result?.count ?? selectedIds.size} photo(s) deleted`);
      clearAll();
      setMultiMode(false);
      // Notify other tabs/pages (e.g., dashboard) that photos changed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('photos:changed'));
      }
      // Use Next.js router.refresh for server-side revalidation
      if (typeof refresh === 'function') {
        refresh();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
      toast.error(`Failed to delete photos: ${message}`);
    }
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      setDownloading(true);
      toast.info('Preparing ZIP file. This may take a moment...');
      const res = await fetch('/api/photos/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      });
      if (res.status === 429) {
        let message = 'Rate limit reached. Please try again later.';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
        toast.error(message);
        return;
      }
      if (!res.ok) throw new Error('Failed to download ZIP');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('ZIP file downloaded!');
    } catch (err) {
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button size="sm" variant={multiMode ? 'secondary' : 'outline'} onClick={() => setMultiMode(!multiMode)}>
                {multiMode ? 'Cancel multi-select' : 'Select multiple'}
              </Button>
              {multiMode && (
                <>
                  <Button size="sm" variant="outline" onClick={allSelected ? clearAll : selectAll}>
                    {allSelected ? 'Clear all' : 'Select all'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={selectedIds.size === 0 || downloading} onClick={downloadSelected}>
                    {downloading ? (<Loader2 className="h-4 w-4 mr-1 animate-spin" />) : (<Download className="h-4 w-4 mr-1" />)}
                    {downloading ? 'Preparing ZIP...' : `Download selected (${selectedIds.size})`}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={selectedIds.size === 0} onClick={deleteSelected}>
                    Delete selected ({selectedIds.size})
                  </Button>
                </>
              )}
            </>
          )}
          {photos.length > 50 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUseVirtualized(!useVirtualized)}
            >
              {useVirtualized ? 'Standard Grid' : 'Virtual Grid'}
            </Button>
          )}
        </div>
      </div>

      {useVirtualized ? (
        <VirtualizedPhotoGrid
          photos={photos}
          onPhotoClick={(photo, index) => setSelectedIndex(index)}
          onPhotoDelete={handleDeletePhoto}
          canDelete={(photo) => 
            Boolean(canManage) ||
            (typeof currentUserId === 'number' && photo.uploadedByUser?.id === currentUserId)
          }
          accessCode={accessCode}
          className="h-96 border rounded-lg"
          itemsPerRow={4}
          itemHeight={250}
          multiMode={multiMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onView={() => setSelectedIndex(idx)}
              onDelete={() => handleDeletePhoto(photo.id)}
              canDelete={
                Boolean(canManage) ||
                (typeof currentUserId === 'number' && photo.uploadedByUser?.id === currentUserId)
              }
              isDeleting={isDeleting === photo.id}
              accessCode={accessCode}
              multiMode={multiMode}
              selected={selectedIds.has(photo.id)}
              onToggleSelect={() => toggleSelect(photo.id)}
            />
          ))}
        </div>
      )}

      {/* Photo Modal with navigation */}
      {selectedIndex !== null && (
        <PhotoModalGallery
          photos={photos}
          currentIndex={selectedIndex}
          accessCode={accessCode}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}

interface PhotoCardProps {
  photo: Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null };
  onView: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
  accessCode?: string;
}

function PhotoCard({ photo, onView, onDelete, canDelete, isDeleting, accessCode, multiMode, selected, onToggleSelect }: PhotoCardProps & { multiMode?: boolean; selected?: boolean; onToggleSelect?: () => void; }) {
  const uploadedBy = photo.uploadedByUser?.name || photo.guestName || 'Guest';
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-square relative">
        {multiMode && (
          <label className="absolute top-2 left-2 z-10 inline-flex items-center gap-2 bg-white/90 px-2 py-1 rounded text-xs cursor-pointer shadow">
            <input type="checkbox" className="h-3 w-3" checked={!!selected} onChange={onToggleSelect} />
            <span>Select</span>
          </label>
        )}
        
        <OptimizedImage
          photoId={photo.id}
          accessCode={accessCode}
          alt={photo.originalFilename || `Photo ${photo.id}`}
          className="w-full h-full cursor-pointer"
          onClick={onView}
          thumbOnly={true}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onView}
              className="bg-white/90 hover:bg-white"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              asChild
              className="bg-white/90 hover:bg-white"
            >
              <a href={`/api/photos/${photo.id}/download${accessCode ? `?code=${encodeURIComponent(accessCode)}` : ''}`} download={photo.originalFilename}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="bg-red-500/90 hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Approval status indicator */}
        {!photo.isApproved && (
          <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            Pending Approval
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {photo.originalFilename}
        </p>
        <p className="text-xs text-gray-500">
          By {uploadedBy} • {uploadDate}
        </p>
      </div>
    </div>
  );
}

// Concurrency-gated, lazy image component - DEPRECATED: Use OptimizedImage instead
// Keeping for backward compatibility until fully migrated

interface PhotoModalProps {
  photoId: number;
  onClose: () => void;
  accessCode?: string;
}

function PhotoModal({ photoId, onClose, accessCode }: PhotoModalProps) {
  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] mx-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white z-10"
        >
          <X className="h-4 w-4" />
        </Button>
        <OptimizedImage
          photoId={photoId}
          accessCode={accessCode}
          alt="Full size photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e?.stopPropagation()}
          priority={true}
        />
      </div>
    </div>
  );
}

interface PhotoModalGalleryProps {
  photos: (Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  currentIndex: number;
  accessCode?: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function PhotoModalGallery({ photos, currentIndex, accessCode, onClose, onNavigate }: PhotoModalGalleryProps) {
  const photo = photos[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, photos.length, onNavigate, onClose]);

  // Use the normal photo API endpoint for full-size view
  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const photoApiSrc = `/api/photos/${photo.id}${codeQuery}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-6 right-8 bg-white/20 hover:bg-white/30 text-white z-10"
        >
          <X className="h-5 w-5" />
        </Button>
        {/* Left arrow */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
            className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white z-10"
          >
            <ArrowLeft className="h-8 w-8" />
          </Button>
        )}
        {/* Main image centered and sized */}
        <div className="flex flex-col items-center justify-center w-full h-full">
          <OptimizedImage
            photoId={photo.id}
            accessCode={accessCode}
            alt={photo.originalFilename || `Photo ${photo.id}`}
            className="block max-w-[90vw] max-h-[80vh] object-contain rounded-lg mx-auto shadow-lg"
            onClick={(e) => e?.stopPropagation()}
            priority={true}
          />
          <div className="flex items-center gap-3 mt-6 mb-2">
            <Button
              size="sm"
              variant="secondary"
              asChild
              className="bg-white/90 hover:bg-white"
            >
              <a href={photoApiSrc} download={photo.originalFilename}>
                <Download className="h-5 w-5 mr-1" /> Download
              </a>
            </Button>
            <span className="text-xs text-gray-200">{photo.originalFilename}</span>
          </div>
        </div>
        {/* Right arrow */}
        {currentIndex < photos.length - 1 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
            className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white z-10"
          >
            <ArrowRight className="h-8 w-8" />
          </Button>
        )}
      </div>
    </div>
  );
}