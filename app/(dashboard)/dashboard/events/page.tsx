import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { getTeamForUser, getEventsForTeam } from '@/lib/db/queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EventsPage() {
  const team = await getTeamForUser();
  if (!team) redirect('/sign-in');

  const items = await getEventsForTeam(team.id);

  return (
    <section className="flex-1 p-4 lg:p-8">
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

      {items.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
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
    </section>
  );
}

function EventCard({ event }: { event: any }) {
  const title: string = event.title ?? event.name ?? 'Untitled';
  const dateValue: string | Date | null = event.date ?? event.eventDate ?? null;
  const eventDate = dateValue ? new Date(dateValue) : new Date();
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{title}</CardTitle>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar className="mr-1 h-3 w-3" />
              {eventDate.toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-1">
            <Link href={`/dashboard/events/${event.id}`}>
              <Button variant="ghost" size="sm">Open</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}