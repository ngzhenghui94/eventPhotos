'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Download, Eye, X } from 'lucide-react';
import { deletePhotoAction } from '@/lib/photos/actions';
import type { Photo, User } from '@/lib/db/schema';

interface PhotoGalleryProps {
  photos: (Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  eventId: number;
  currentUserId?: number;
  canManage: boolean;
}

export function PhotoGallery({ photos, eventId, currentUserId, canManage }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    setIsDeleting(photoId);
    try {
      const formData = new FormData();
      formData.append('photoId', photoId.toString());
      await deletePhotoAction(formData);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    } finally {
      setIsDeleting(null);
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

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onView={() => setSelectedPhoto(photo.id)}
            onDelete={() => handleDeletePhoto(photo.id)}
            canDelete={canManage || photo.uploadedByUser?.id === currentUserId}
            isDeleting={isDeleting === photo.id}
          />
        ))}
      </div>

  {/* Photo Modal */}
  {selectedPhoto !== null && (
        <PhotoModal
          photoId={selectedPhoto}
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
}

function PhotoCard({ photo, onView, onDelete, canDelete, isDeleting }: PhotoCardProps) {
  const uploadedBy = photo.uploadedByUser?.name || photo.guestName || 'Guest';
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-square relative">
        <img
          src={`/api/photos/${photo.id}`}
          alt={photo.originalFilename}
          className="w-full h-full object-cover cursor-pointer"
          onClick={onView}
        />
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
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
              <a href={`/api/photos/${photo.id}/download`} download={photo.originalFilename}>
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
}

function PhotoModal({ photoId, onClose }: PhotoModalProps) {
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
          src={`/api/photos/${photoId}`}
          alt="Full size photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}