'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Download, Eye, X } from 'lucide-react';
import { deletePhotoAction, deletePhotosBulkAction } from '@/lib/photos/actions';
import type { Photo, User } from '@/lib/db/schema';

interface PhotoGalleryProps {
  photos: (Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  eventId: number;
  currentUserId?: number;
  canManage: boolean;
  accessCode?: string;
}

export function PhotoGallery({ photos, eventId, currentUserId, canManage, accessCode }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allIds = useMemo(() => photos.map(p => p.id), [photos]);
  const allSelected = selectedIds.size > 0 && selectedIds.size === allIds.length;

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
      toast.error(`Failed to delete photos: ${message}`);
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
                  <Button size="sm" variant="destructive" disabled={selectedIds.size === 0} onClick={deleteSelected}>
                    Delete selected ({selectedIds.size})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onView={() => setSelectedPhoto(photo.id)}
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

  {/* Photo Modal */}
  {selectedPhoto !== null && (
        <PhotoModal
          photoId={selectedPhoto}
          accessCode={accessCode}
          onClose={() => setSelectedPhoto(null)}
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
  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-square relative">
        {multiMode && (
          <label className="absolute top-2 left-2 z-10 inline-flex items-center gap-2 bg-white/90 px-2 py-1 rounded text-xs cursor-pointer shadow">
            <input type="checkbox" className="h-3 w-3" checked={!!selected} onChange={onToggleSelect} />
            <span>Select</span>
          </label>
        )}
                <img
                  src={`/api/photos/${photo.id}/thumb${codeQuery}`}
          alt={photo.originalFilename}
          className="w-full h-full object-cover cursor-pointer"
          onClick={onView}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = `/api/photos/${photo.id}${codeQuery}`;
            }
          }}
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
              <a href={`/api/photos/${photo.id}/download${codeQuery}`} download={photo.originalFilename}>
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
                <img
                  src={`/api/photos/${photoId}/thumb${codeQuery}`}
          alt="Full size photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = `/api/photos/${photoId}${codeQuery}`;
            }
          }}
        />
      </div>
    </div>
  );
}