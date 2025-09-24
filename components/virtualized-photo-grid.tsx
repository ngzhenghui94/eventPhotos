'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { OptimizedImage, ImageSkeleton } from './optimized-image';
import { Button } from '@/components/ui/button';
import { Eye, Download, Trash2 } from 'lucide-react';
import type { PhotoWithMeta } from '@/lib/hooks/use-photos';

interface VirtualizedPhotoGridProps {
  photos: PhotoWithMeta[];
  onPhotoClick?: (photo: PhotoWithMeta, index: number) => void;
  onPhotoDelete?: (photoId: number) => void;
  canDelete?: (photo: PhotoWithMeta) => boolean;
  accessCode?: string;
  className?: string;
  itemHeight?: number;
  itemsPerRow?: number;
  gap?: number;
  overscan?: number;
  // Multi-select props
  multiMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (photoId: number) => void;
}

interface VirtualItem {
  index: number;
  photos: PhotoWithMeta[];
  isVisible: boolean;
}

export function VirtualizedPhotoGrid({
  photos,
  onPhotoClick,
  onPhotoDelete,
  canDelete,
  accessCode,
  className = '',
  itemHeight = 300,
  itemsPerRow = 4,
  gap = 16,
  overscan = 5,
  multiMode = false,
  selectedIds,
  onToggleSelect,
}: VirtualizedPhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate grid dimensions
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(photos.length / itemsPerRow);
  const totalHeight = totalRows * rowHeight - gap;

  // Group photos into rows
  const photoRows = useMemo(() => {
    const rows: PhotoWithMeta[][] = [];
    for (let i = 0; i < photos.length; i += itemsPerRow) {
      rows.push(photos.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [photos, itemsPerRow]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight);
    const end = Math.min(totalRows, start + visibleRowCount + overscan * 2);
    return { start, end };
  }, [scrollTop, containerHeight, rowHeight, totalRows, overscan]);

  // Get visible items
  const visibleItems = useMemo((): VirtualItem[] => {
    return photoRows.slice(visibleRange.start, visibleRange.end).map((photos, index) => ({
      index: visibleRange.start + index,
      photos,
      isVisible: true
    }));
  }, [photoRows, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setContainerHeight(height);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // No special cleanup required
  useEffect(() => {
    return () => {
      /* no-op */
    };
  }, []);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <ImageSkeleton className="w-24 h-24 rounded mb-4" />
        <p className="text-lg font-medium">No photos yet</p>
        <p className="text-sm">Photos will appear here once uploaded</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: '600px' }} // Default height, can be overridden with className
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        {visibleItems.map((item) => (
          <div
            key={item.index}
            className="absolute w-full"
            style={{
              top: item.index * rowHeight,
              height: itemHeight,
            }}
          >
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                height: '100%',
              }}
            >
              {item.photos.map((photo, photoIndex) => {
                const globalIndex = item.index * itemsPerRow + photoIndex;
                const isSelected = selectedIds ? selectedIds.has(photo.id) : false;
                return (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={globalIndex}
                    accessCode={accessCode}
                    onPhotoClick={onPhotoClick}
                    onPhotoDelete={onPhotoDelete}
                    canDelete={canDelete?.(photo) ?? false}
                    priority={globalIndex < itemsPerRow * 2} // Prioritize first 2 rows
                    multiMode={multiMode}
                    selected={isSelected}
                    onToggleSelect={onToggleSelect ? () => onToggleSelect(photo.id) : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PhotoCardProps {
  photo: PhotoWithMeta;
  index: number;
  accessCode?: string;
  onPhotoClick?: (photo: PhotoWithMeta, index: number) => void;
  onPhotoDelete?: (photoId: number) => void;
  canDelete: boolean;
  priority: boolean;
  multiMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function PhotoCard({
  photo,
  index,
  accessCode,
  onPhotoClick,
  onPhotoDelete,
  canDelete,
  priority,
  multiMode = false,
  selected = false,
  onToggleSelect
}: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = useCallback(() => {
    if (multiMode) {
      onToggleSelect?.();
    } else {
      onPhotoClick?.(photo, index);
    }
  }, [photo, index, onPhotoClick, multiMode, onToggleSelect]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onPhotoDelete?.(photo.id);
    } finally {
      setIsDeleting(false);
    }
  }, [photo.id, onPhotoDelete, isDeleting]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
    const link = document.createElement('a');
    link.href = `/api/photos/${photo.id}/download${codeQuery}`;
    link.download = photo.originalFilename || `photo-${photo.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [photo.id, photo.originalFilename, accessCode]);

  const isHost = photo.uploadedBy !== null;
  const uploadedBy = isHost
    ? (photo.uploadedByUser?.name || 'Host')
    : (photo.guestName || 'Guest');
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div
      className={`group relative bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${selected ? 'border-orange-400 ring-2 ring-orange-300' : 'border-gray-200'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Image container */}
      <div className="aspect-square relative">
        {isHost && (
          <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-[10px] font-semibold shadow">
            Host
          </div>
        )}
        {multiMode && (
          <label
            className="absolute top-2 left-2 z-10 inline-flex items-center gap-2 bg-white/90 px-2 py-1 rounded text-xs cursor-pointer shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="checkbox" className="h-3 w-3" checked={!!selected} onChange={onToggleSelect} />
            <span>Select</span>
          </label>
        )}
        <OptimizedImage
          photoId={photo.id}
          accessCode={accessCode}
          alt={photo.originalFilename || `Photo ${photo.id}`}
          className="w-full h-full"
          priority={priority}
          thumbOnly={true}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />

        {/* Overlay with actions */}
        {!multiMode && (
          <div
            className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
                onClick={handleClick}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-500/90 hover:bg-red-600"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Approval status indicator */}
        {!photo.isApproved && (
          <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            Pending Approval
          </div>
        )}
      </div>

      {/* Photo info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {photo.originalFilename || `Photo ${photo.id}`}
        </p>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          {isHost ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">Host</span>
          ) : (
            <span>By {uploadedBy}</span>
          )}
          <span className="mx-1">•</span>
          <span>{uploadDate}</span>
        </p>
      </div>
    </div>
  );
}