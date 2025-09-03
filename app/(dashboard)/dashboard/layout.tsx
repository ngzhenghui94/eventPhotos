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
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

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

  const [planName, setPlanName] = useState<string>('free');

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
    ...(normalizePlanName(planName) === 'pro' || normalizePlanName(planName) === 'business' ? [{ href: '/dashboard', icon: Users, label: 'Team' }] : []),
    { href: '/dashboard/events', icon: Calendar, label: 'Events' },
    { href: '/dashboard/general', icon: Settings, label: 'General' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { href: '/dashboard/security', icon: Shield, label: 'Security' }
  ];

  const navItems = isAdmin
    ? [...baseItems, { href: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' }]
    : baseItems;

  return (
    <div className="flex flex-col min-h-[100dvh] w-full">
      {/* Top Navbar (same style as homepage) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              className="lg:hidden -ml-2"
              variant="ghost"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-amber-600 text-white text-xs">{brand.productShort.toUpperCase()}</span>
              <span>{brand.productName}</span>
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/demo" className="hover:text-gray-900">Demo</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <UserMenu />
          </nav>
        </div>
      </header>

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

        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
