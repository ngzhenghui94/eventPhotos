import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Users, Eye, Camera } from 'lucide-react';
import { getUserEvents } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { events } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import UpdateToast from '@/components/update-toast';

export default async function EventsPage() {
  const user = await getUser();
  let items: import('@/lib/db/schema').Event[] = [];
  if (user && user.id) {
    items = await getUserEvents(user.id);
  }

  return (
    <section className="flex-1 min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <UpdateToast />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-2">Events</h1>
            <p className="text-sm text-gray-600">Manage your photo sharing events</p>
          </div>
          <Link href="/dashboard/events/new">
            <Button className="mt-4 lg:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-900">Total Events</p>
                  <p className="text-2xl font-bold text-orange-800">{items.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-900">Total Photos</p>
                  <p className="text-2xl font-bold text-blue-800">{0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-900">Public Events</p>
                  <p className="text-2xl font-bold text-green-800">{items.filter(event => event.isPublic).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center py-12">
              <Camera className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">Create your first event to start collecting and sharing photos.</p>
              <Link href="/dashboard/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}


function EventCard({ event }: { event: any }) {
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>
              </span>
            ) : (
              <span title="Private event">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
            )}
            {event.allowGuestUploads && (
              <span title="Guest uploads allowed">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"><path d="M21 10c0 6.075-9 13-9 13S3 16.075 3 10a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-gray-400"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
              <span className="font-medium text-gray-700">
                {event.photoCount ?? 0} photo{(event.photoCount ?? 0) !== 1 ? 's' : ''}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}