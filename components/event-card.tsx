import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Camera, Users, Eye, EyeOff, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export interface EventWithPhotoCount {
  id: number;
  eventCode: string;
  name: string;
  description?: string;
  date: Date | string;
  location?: string;
  isPublic: boolean;
  allowGuestUploads: boolean;
  requireApproval: boolean;
  createdAt: Date | string;
  ownerName?: string;
  ownerId: number;
  photoCount: number;
}

export function EventCard({ event }: { event: EventWithPhotoCount }) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 bg-white flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
              {event.name}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatTime(event.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.isPublic ? (
              <span title="Public event">
                <Eye className="h-4 w-4 text-green-500" />
              </span>
            ) : (
              <span title="Private event">
                <EyeOff className="h-4 w-4 text-gray-400" />
              </span>
            )}
            {event.allowGuestUploads && (
              <span title="Guest uploads allowed">
                <Upload className="h-4 w-4 text-blue-500" />
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 flex-1">
        <div className="space-y-3 h-full flex flex-col">
          {/* Event Details */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              {formatDate(event.date)}
            </div>
            {event.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate" title={event.location}>{event.location}</span>
              </div>
            )}
            {event.ownerName && (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">by {event.ownerName}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="text-sm text-gray-600 flex-1">
              <p className="line-clamp-2">
                {event.description}
              </p>
            </div>
          )}

          {/* Photo Count */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
            <div className="flex items-center text-sm">
              <ImageIcon className="h-4 w-4 mr-1 text-gray-400" />
              <span className="font-medium text-gray-700">
                {event.photoCount} photo{event.photoCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              #{event.eventCode}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button 
          asChild 
          size="sm" 
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Link href={`/dashboard/events/${event.id}`} className="flex items-center gap-1">
            <Camera className="h-4 w-4" />
            Manage
          </Link>
        </Button>
        <Button 
          asChild 
          variant="outline" 
          size="sm"
          className="border-gray-300 hover:bg-gray-50"
        >
          <Link href={`/gallery/${event.id}`} className="flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
