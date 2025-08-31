import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, ImageIcon, Shield, Upload, Users, ArrowRight, QrCode } from 'lucide-react';
import { JoinByCode } from '../../components/join-by-code';
import { UserMenu } from '@/components/user-menu';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white text-xs">MV</span>
            <span>MemoriesVault</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/demo" className="hover:text-gray-900">Demo</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-gray-900">
              The simplest way to collect and share event photos
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Create an event, share a code, and let guests upload. Approve what shows up. Beautiful, secure galleries on any device.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700">
                  Create free event
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="rounded-full">View demo</Button>
              </Link>
            </div>
            <div className="mt-8">
              <JoinByCode />
            </div>
            <p className="mt-3 text-xs text-gray-500">Have an event code? Enter it to jump straight to the guest gallery.</p>
          </div>
          <div className="lg:col-span-6">
            {/* Product preview grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-200">
                  <img
                    src={`https://picsum.photos/seed/event-${i}/600/600`}
                    alt="Event photo preview"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">How MemoriesVault works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Calendar className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Create an event</h3>
              <p className="mt-2 text-sm text-gray-600">Name it, set the date, pick guest upload and approval options.</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><QrCode className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Share your code</h3>
              <p className="mt-2 text-sm text-gray-600">Guests join via a short code or QR—no app or sign-up required.</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Upload className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Guests upload</h3>
              <p className="mt-2 text-sm text-gray-600">Everyone contributes their best shots in real time during the event.</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><CheckCircle2 className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Approve & share</h3>
              <p className="mt-2 text-sm text-gray-600">You stay in control. Approve photos and share the gallery instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Shield className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Private & secure</h3>
              <p className="mt-2 text-sm text-gray-600">Each event has its own private gallery secured by access codes. Optional approval before anything goes live.</p>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Users className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Built for guests</h3>
              <p className="mt-2 text-sm text-gray-600">No accounts needed. Mobile-first upload and viewing that just works for everyone attending.</p>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center"><ImageIcon className="h-5 w-5"/></div>
              <h3 className="mt-4 font-semibold">Beautiful galleries</h3>
              <p className="mt-2 text-sm text-gray-600">Pixel-perfect, responsive layouts that make your event look amazing on any screen.</p>
            </div>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700">Create free event</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="rounded-full">See pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[10px]">MV</span>
            <span>MemoriesVault</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-gray-900">Demo</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/sign-in" className="hover:text-gray-900">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
