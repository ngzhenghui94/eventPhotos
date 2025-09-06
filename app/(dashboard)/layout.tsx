import Link from 'next/link';
import { UserMenu } from '@/components/user-menu';

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
          {/* Mobile Nav */}
          <div className="sm:hidden flex items-center gap-2 z-50 relative">
            <UserMenu />
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
