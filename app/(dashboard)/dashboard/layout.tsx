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
          className={`w-64 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4 flex flex-col bg-transparent">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 px-2 mb-2">Menu</div>
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setIsSidebarOpen(false)} className={`group flex items-center gap-2 px-3 py-2 rounded-md transition-colors border border-transparent hover:border-gray-200 hover:bg-black/5 ${active ? 'text-gray-900 font-medium border-gray-200 bg-black/5' : 'text-gray-700'}`}>
                      <item.icon className={`h-4 w-4 ${active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-4">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red/5 transition-colors"
                onClick={handleSignOut}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
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
