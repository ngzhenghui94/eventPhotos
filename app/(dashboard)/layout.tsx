import Link from 'next/link';
import { UserMenu } from '@/components/user-menu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Calendar, Tag, PlayCircle } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg">
              <img src="/favicon.ico" alt="Logo" className="h-8 w-8" />
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight drop-shadow-lg">memories<span className="text-amber-600">Vault</span></span>
          </Link>
          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-8 text-base font-medium text-gray-700 bg-white/80 rounded-full px-6 py-3 shadow-md">
            <Link href="/demo" className="hover:text-amber-600 transition-colors">Demo</Link>
            <Link href="/pricing" className="hover:text-amber-600 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-amber-600 transition-colors">Dashboard</Link>
            <UserMenu />
          </nav>
          {/* Mobile Nav: Redesigned Hamburger */}
          <div className="sm:hidden flex items-center gap-2 z-50 relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-xl border border-gray-200 bg-white shadow-md p-2 transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  aria-label="Open navigation menu"
                >
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                    <line x1="5" y1="9" x2="23" y2="9" />
                    <line x1="5" y1="15" x2="23" y2="15" />
                    <line x1="5" y1="21" x2="23" y2="21" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px] p-1 rounded-xl shadow-lg border border-gray-100">
                <DropdownMenuItem>
                  <Link href="/dashboard" className="w-full flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/pricing" className="w-full flex items-center gap-2">
                    <Tag className="h-4 w-4 text-amber-600" />
                    <span>Pricing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/demo" className="w-full flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-amber-600" />
                    <span>Demo</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <UserMenu mobile={true} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <section className="flex flex-col min-h-screen">
        {children}
                       <Link href="/dashboard" className="hover:text-amber-600 transition-colors">Dashboard</Link>
      </section>
    </>
  );
}
