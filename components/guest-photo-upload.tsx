'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, User } from 'lucide-react';
// Using API route directly to avoid server action double-invocation in dev


interface GuestPhotoUploadProps {
  eventId: number;
}
export function GuestPhotoUpload({ eventId }: GuestPhotoUploadProps) {
  const router = useRouter();
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  useEffect(() => {
    async function fetchHostPlan() {
      try {
        const res = await fetch(`/api/events/${eventId}/host-plan`);
        if (res.ok) {
          const data = await res.json();
          setMaxFileSizeMB(Math.floor((data.maxFileSize || 10485760) / 1024 / 1024));
        }
      } catch {}
    }
    fetchHostPlan();
  }, [eventId]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
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
    try {
  // We call the REST API directly to avoid server action quirks with FormData in dev
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

      let successCount = 0;
      const failures: { name: string; message: string }[] = [];
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append('eventId', eventId.toString());
        fd.append('guestName', guestName.trim());
        if (guestEmail.trim()) fd.append('guestEmail', guestEmail.trim());
        // The /api/photos endpoint expects a single file under 'file'
        fd.append('file', file);
        try {
          const res = await fetch('/api/photos', {
            method: 'POST',
            headers: accessCode ? { 'x-access-code': accessCode } : undefined,
            body: fd,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            failures.push({ name: file.name, message: data?.error || 'Upload failed' });
          } else {
            successCount += 1;
          }
        } catch (e) {
          failures.push({ name: file.name, message: 'Network error' });
        }
      }

      if (successCount > 0) {
        toast.success('Photos uploaded', { description: `${successCount} photo${successCount > 1 ? 's' : ''} uploaded.` });
        // Refresh the current route so the new photos render
        router.refresh();
      }
      if (failures.length > 0) {
        const first = failures[0];
        const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : '';
        toast.error('Some uploads failed', { description: `${first.name}: ${first.message}${more}` });
      }

  // Reset form
      setSelectedFiles([]);
      setGuestName('');
      setGuestEmail('');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos. Please try again.');
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
    <Card className="bg-gradient-to-br from-orange-50 via-pink-50 to-rose-100 rounded-xl shadow-lg ring-1 ring-rose-100/60">
      <CardHeader>
  <CardTitle className="flex items-center bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 text-xl font-bold">
          <Upload className="mr-2 h-5 w-5 text-orange-500" />
          Share Your Photos
        </CardTitle>
      </CardHeader>
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
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
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
    </Card>
  );
}