'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Eye } from 'lucide-react';
import { approvePhotoAction, rejectPhotoAction } from '@/lib/photos/approval-actions';
import type { Photo, User } from '@/lib/db/schema';
import { useState } from 'react';

interface PhotoApprovalProps {
  photos: (Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  eventId: number;
}

export function PhotoApproval({ photos, eventId }: PhotoApprovalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const pendingPhotos = photos.filter(photo => !photo.isApproved);

  const handleApprove = async (photoId: number) => {
    setProcessingId(photoId);
    try {
      const formData = new FormData();
      formData.append('photoId', photoId.toString());
      formData.append('eventId', eventId.toString());
      await approvePhotoAction(formData);
    } catch (error) {
      console.error('Error approving photo:', error);
      alert('Failed to approve photo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (photoId: number) => {
    if (!confirm('Are you sure you want to reject and delete this photo? This action cannot be undone.')) {
      return;
    }

    setProcessingId(photoId);
    try {
      const formData = new FormData();
      formData.append('photoId', photoId.toString());
      formData.append('eventId', eventId.toString());
      await rejectPhotoAction(formData);
    } catch (error) {
      console.error('Error rejecting photo:', error);
      alert('Failed to reject photo');
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingPhotos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Check className="mr-2 h-5 w-5 text-green-600" />
            Photo Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All photos approved!
            </h3>
            <p className="text-sm text-gray-500">
              There are no photos pending approval at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-yellow-600" />
            Photos Pending Approval ({pendingPhotos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPhotos.map((photo) => (
              <ApprovalPhotoCard
                key={photo.id}
                photo={photo}
                onApprove={() => handleApprove(photo.id)}
                onReject={() => handleReject(photo.id)}
                onView={() => setSelectedPhoto(photo.id)}
                isProcessing={processingId === photo.id}
              />
            ))}
          </div>
        </CardContent>
      </Card>

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

interface ApprovalPhotoCardProps {
  photo: Photo & { uploadedByUser?: Pick<User, 'id' | 'name' | 'email'> | null };
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
  isProcessing: boolean;
}

function ApprovalPhotoCard({ photo, onApprove, onReject, onView, isProcessing }: ApprovalPhotoCardProps) {
  const uploadedBy = photo.uploadedByUser?.name || photo.guestName || 'Guest';
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden">
      <div className="aspect-square relative">
        <img
          src={`/api/photos/${photo.id}`}
          alt={photo.originalFilename}
          className="w-full h-full object-cover"
        />
        
        {/* Pending indicator */}
        <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
          Pending Approval
        </div>

        {/* View button overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            onClick={onView}
            className="bg-white/90 hover:bg-white"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-medium text-gray-900 truncate mb-1">
          {photo.originalFilename}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          By {uploadedBy} • {uploadDate}
        </p>

        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
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