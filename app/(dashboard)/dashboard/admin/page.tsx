import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const items = [
  { href: '/dashboard/admin/events', title: 'Events', desc: 'Create, edit, and delete any event' },
  { href: '/dashboard/admin/photos', title: 'Photos', desc: 'Browse and moderate all photos' },
  { href: '/dashboard/admin/users', title: 'Users', desc: 'Manage user accounts and roles' },
];

export default async function AdminHome() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">Super Admin</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Link key={i.href} href={i.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{i.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{i.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
