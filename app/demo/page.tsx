'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Upload, Download, X, Camera, ArrowLeft } from 'lucide-react';

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

export default function DemoGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<typeof demoPhotos[0] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const formatDate = (dateString: string) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              Demo Gallery
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{demoEvent.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(demoEvent.eventDate)}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {demoEvent.location}
                </div>
                <div className="flex items-center">
                  <Camera className="h-4 w-4 mr-1" />
                  {demoPhotos.length} photos
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Add Photos
            </Button>
          </div>

          {/* Description */}
          <div className="mt-6">
            <p className="text-gray-700">{demoEvent.description}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {demoPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
              onClick={() => setSelectedPhoto(photo)}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded truncate">
                      by {photo.uploaderName}
                    </div>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Demo Mode</h3>
                <p className="text-gray-600 mb-4">
                  This is a demonstration gallery. Photo upload functionality requires AWS S3 configuration.
                </p>
                <p className="text-sm text-gray-500">
                  In a real deployment, guests can upload photos directly to secure AWS S3 storage.
                </p>
              </div>
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
                  {formatFileSize(selectedPhoto.fileSize)} • {formatDate(selectedPhoto.createdAt)}
                  • by {selectedPhoto.uploaderName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // In demo mode, just show an alert
                    alert('In a real deployment, this would download the original high-resolution photo from AWS S3.');
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
                src={selectedPhoto.url}
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