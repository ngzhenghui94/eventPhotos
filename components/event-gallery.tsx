'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Calendar, MapPin, Users, Download, X, Plus } from 'lucide-react';
import { usePhotos } from '@/lib/hooks/use-photos';
import { VirtualizedPhotoGrid } from './virtualized-photo-grid';
import { OptimizedImage } from './optimized-image';

interface Event {
  id: number;
  name: string;
  description?: string;
  eventDate?: string;
  location?: string;
  isPublic: boolean;
  allowGuestUploads: boolean;
}

interface EventGalleryProps {
  event: Event;
  onBack: () => void;
  planName?: string;
}

export function EventGallery({ event, onBack, planName }: EventGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [useVirtualized, setUseVirtualized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    photos,
    loading,
    error,
    refetch
  } = usePhotos({
    eventId: event.id,
    enableCache: true,
    filterApproved: false // Show all photos in admin view
  });

  // Auto-enable virtualization for large photo sets
  useEffect(() => {
    setUseVirtualized(photos.length > 100);
  }, [photos.length]);

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', event.id.toString());

        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload photo');
        }
      }

      // Refresh photos after upload
      await refetch();
      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = (photo: any, index: number) => {
    setSelectedPhotoIndex(index);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
                <Users className="h-4 w-4 mr-1" />
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {photos.length > 100 && (
            <Button
              variant="outline"
              onClick={() => setUseVirtualized(!useVirtualized)}
            >
              {useVirtualized ? 'Standard Grid' : 'Virtual Grid'}
            </Button>
          )}
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-8">
          <p className="text-gray-700">{event.description}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && photos.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-sm mx-auto">
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600 mb-6">Upload the first photos to get started</p>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2"
            >
              Upload Photos
            </Button>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {!loading && photos.length > 0 && (
        <>
          {(planName === 'pro' || planName === 'business') && (
            <div className="mb-4 flex flex-wrap gap-2">
              {/* Advanced features: Sorting, Filtering, Bulk Download */}
              <Button variant="outline" size="sm">Sort by Date</Button>
              <Button variant="outline" size="sm">Sort by Name</Button>
              <Button variant="outline" size="sm">Filter by Uploader</Button>
              <Button variant="outline" size="sm">Bulk Download</Button>
            </div>
          )}
          
          {useVirtualized ? (
            <VirtualizedPhotoGrid
              photos={photos}
              onPhotoClick={handlePhotoClick}
              className="h-[600px] border rounded-lg"
              itemsPerRow={5}
              itemHeight={200}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {photos.map((photo, index) => (
                <Card
                  key={photo.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                  onClick={() => handlePhotoClick(photo, index)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square relative overflow-hidden">
                      <OptimizedImage
                        photoId={photo.id}
                        alt={photo.originalFilename || `Photo ${photo.id}`}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        priority={index < 10} // Prioritize first 10 images
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-opacity duration-200" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
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

            <div className="p-6">
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
              <p className="text-xs text-gray-500 mt-3 text-center">
                Maximum file size: 10MB. Supported formats: JPG, PNG, GIF, WebP
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full h-full flex flex-col">
            <div className="flex justify-between items-center p-4 text-white">
              <div>
                <h3 className="text-lg font-medium">{photos[selectedPhotoIndex].originalFilename}</h3>
                <p className="text-sm text-gray-300">
                  {photos[selectedPhotoIndex].fileSize && formatFileSize(photos[selectedPhotoIndex].fileSize)} • {new Date(photos[selectedPhotoIndex].uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/photos/${photos[selectedPhotoIndex].id}/download`;
                    link.download = photos[selectedPhotoIndex].originalFilename || `photo-${photos[selectedPhotoIndex].id}`;
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
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <OptimizedImage
                photoId={photos[selectedPhotoIndex].id}
                alt={photos[selectedPhotoIndex].originalFilename || `Photo ${photos[selectedPhotoIndex].id}`}
                className="max-w-full max-h-full object-contain"
                priority={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}