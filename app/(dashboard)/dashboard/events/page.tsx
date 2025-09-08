import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Eye, Camera } from 'lucide-react';
import { getUserEvents } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { events } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import UpdateToast from '@/components/update-toast';
import { EventsGrid } from '@/components/events-grid';

export default async function EventsPage() {
  const user = await getUser();
  let items: (import('@/lib/db/schema').Event & { photoCount: number; category: string })[] = [];
  if (user && user.id) {
    items = await getUserEvents(user.id);
  }

  return (
    <section className="flex-1 min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <UpdateToast />
        {/* Hero Section - replicated from /dashboard */}
        <div className="relative rounded-xl overflow-hidden mb-10 shadow-lg bg-gradient-to-r from-orange-100 via-white to-blue-100 border border-orange-200 animate-fade-in">
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="60" r="80" fill="#FFEDD5" opacity="0.3" />
              <circle cx="500" cy="60" r="80" fill="#DBEAFE" opacity="0.3" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-8 py-10 gap-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-orange-900 mb-2 flex items-center gap-2">
                <Camera className="h-8 w-8 text-orange-500 animate-bounce" />
                Memories Vault
              </h1>
              <p className="text-lg text-gray-700 mb-4">Capture, share, and relive your event memories in one beautiful dashboard.</p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-base px-6 py-3">
                <Link href="/dashboard/events/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-5" />
                  Create New Event
                </Link>
              </Button>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <img src="/favicon.ico" alt="Memories Vault" className="w-32 h-32 rounded-full shadow-lg border-4 border-orange-200" />
            </div>
          </div>
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
                  <p className="text-2xl font-bold text-blue-800">{items.reduce((total, e) => total + (e.photoCount ?? 0), 0)}</p>
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

        {/* Events Grid with client-side sorting */}
        {items.length > 0 ? (
          <EventsGrid items={items as any} />
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
 