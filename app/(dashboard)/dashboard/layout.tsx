'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, Shield, Activity, Menu, Calendar, ShieldCheck, LogOut } from 'lucide-react';
// Removed server-only import
import { normalizePlanName } from '@/lib/plans';
import { signOut } from '@/app/(login)/actions';
import { UserMenu } from '@/components/user-menu';
import { brand } from '@/lib/brand';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('free');

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  useEffect(() => {
    // Fetch current user to determine if super admin
    fetch('/api/user').then(async (res) => {
      const u = await res.json();
      if (u && (u.email === 'ngzhenghui94@gmail.com' || u.isOwner === true)) {
        setIsAdmin(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch current user and team plan from API route
    fetch('/api/user').then(async (res) => {
      const u = await res.json();
      if (u && u.team && u.team.planName) {
        setPlanName(u.team.planName);
      }
    }).catch(() => {});
  }, []);

  const baseItems = [
    { href: '/dashboard', icon: Calendar, label: 'Events' },
    { href: '/dashboard/general', icon: Settings, label: 'General' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { href: '/dashboard/security', icon: Shield, label: 'Security' }
  ];
  let navItems: { href: string; icon: any; label: string }[] = baseItems;
  if (typeof isAdmin === 'boolean' && isAdmin) {
    navItems = [...baseItems, { href: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' }];
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-gradient-to-br from-amber-50 via-white to-blue-50">
      <div className="flex flex-1 overflow-hidden h-full max-w-7xl mx-auto w-full">
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4 flex flex-col">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className={`shadow-none my-1 w-full justify-start ${
                    pathname === item.href ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <div className="mt-auto pt-3 border-t border-gray-200">
              <Button
                variant="ghost"
                className="shadow-none my-1 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </nav>
        </aside>
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
