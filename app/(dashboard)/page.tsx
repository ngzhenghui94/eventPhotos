"use client";
import { useEffect, useState } from 'react';
import { brand } from '@/lib/brand';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarClock, CheckCircle2, ImageIcon, Shield, Upload, Users, ArrowRight, QrCode, Megaphone, X } from 'lucide-react';
import { JoinByCode } from '../../components/join-by-code';


export default function HomePage() {
  const [showBanner, setShowBanner] = useState(true);

  const dismissBanner = () => {
    setShowBanner(false);
  };

  const heroImages = [
    { src: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1621857524725-fdfeae3465dc?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center top' },
    { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1628336707631-68131ca720c3?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1602863211753-3c6da5c71c61?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1517456793572-1d8efd6dc135?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
    { src: 'https://images.unsplash.com/photo-1619537901863-9807597cb0b2?auto=format&fit=crop&w=800&h=800&q=80', objectPosition: 'center' },
  ];

  function handleTileMove(e: React.MouseEvent<HTMLDivElement>) {
    const tile = e.currentTarget as HTMLDivElement;
    const rect = tile.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (px - 0.5) * 6; // deg
    const rotateX = -(py - 0.5) * 6; // deg
    const translateX = (px - 0.5) * 8; // px
    const translateY = (py - 0.5) * 8; // px
    tile.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${translateX}px) translateY(${translateY}px)`;
    const img = tile.querySelector('img') as HTMLImageElement | null;
    if (img) {
      const imgTranslateX = translateX * -0.35;
      const imgTranslateY = translateY * -0.35;
      img.style.transform = `translateX(${imgTranslateX}px) translateY(${imgTranslateY}px) scale(1.06)`;
    }
  }

  function handleTileLeave(e: React.MouseEvent<HTMLDivElement>) {
    const tile = e.currentTarget as HTMLDivElement;
    tile.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateX(0px) translateY(0px)';
    const img = tile.querySelector('img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = '';
    }
  }

  return (
  <main className="relative min-h-screen">
      {/* Full-viewport background to keep header area consistent */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-amber-50 via-white to-blue-50" />
      {/* Beta banner */}
      {showBanner && (
        <section className="px-4 pt-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative flex items-center justify-center gap-3 rounded-xl border border-amber-200/60 ring-1 ring-white/60 shadow-sm px-4 py-2 text-sm text-slate-800 bg-gradient-to-r from-amber-50 via-rose-50 to-blue-50">
              <Megaphone className="h-4 w-4 text-amber-600" />
              <span className="font-medium">Beta test</span>
              <span className="text-slate-700">— Found a bug or have feedback / suggestion?</span>
              <a
                href="mailto:ngzhenghui94@gmail.com?subject=The%20Crowd%20Grid%20Beta%20Feedback&body=Hi%20there%2C%0A%0AFeedback%2Fbug%20details%3A%0A%0A%28Screenshots%2Fsteps%20to%20reproduce%20help%29%0A%0AThanks!"
                className="inline-flex items-center rounded-full bg-white/70 hover:bg-white px-3 py-1 text-amber-700 font-medium border border-amber-200 transition-colors"
              >
                Send feedback
              </a>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Dismiss beta banner"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}
      {/* Hero Section with animated gradient background */}
  <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 animate-gradient bg-gradient-to-br from-orange-200 via-amber-100 to-blue-200 opacity-60"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 sm:gap-16 items-center fade-in-up">
          <div className="lg:col-span-6 mb-10 lg:mb-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-gray-900 mb-6">
              A warmer, simpler way to gather event photos together
            </h1>
            <p className="mb-8 text-lg sm:text-xl text-gray-700">
              Create your event, plan event timeline, share a friendly code, and let everyone add their favorite moments. You stay in control! Beautiful, secured galleries on any device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/api/auth/google">
                <Button size="lg" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-lg text-lg px-6 py-3">
                  Create your free event
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="rounded-full text-lg px-6 py-3 border-2 border-gray-300">View demo</Button>
              </Link>
            </div>
            <div className="mb-4">
              <JoinByCode />
            </div>
            <p className="text-xs text-gray-500">Have an event code? Pop it in to jump straight to the guest gallery.</p>
          </div>
          <div className="lg:col-span-6">
            {/* Static Product preview grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 fade-in-up">
              {heroImages.map((item, i) => (
                <div
                  key={i}
                  className={`relative aspect-square overflow-hidden rounded-2xl shadow-[0_6px_30px_rgba(252,211,77,0.15)] group transition-transform duration-300 ease-out border border-transparent bg-gradient-to-br from-amber-50 via-white to-blue-50 transform-gpu ${i % 3 === 0 ? 'delay-75' : i % 3 === 1 ? 'delay-150' : 'delay-200'}`}
                  style={{ animation: 'fadeInUp 0.9s ease forwards' }}
                  onMouseMove={handleTileMove}
                  onMouseLeave={handleTileLeave}
                >
                  <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -inset-6 bg-gradient-to-br from-amber-300/40 via-rose-200/30 to-blue-300/40 blur-2xl"></div>
                  </div>
                  <img
                    src={item.src}
                    alt="Event preview"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06] will-change-transform"
                    style={{ objectPosition: (item as any).objectPosition || 'center' }}
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/50 group-hover:ring-amber-300/60 transition-all duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

  {/* How it works Section with glassmorphism cards and fade-in animation */}
  <section className="py-16 sm:py-24 fade-in-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-12">How {brand.productName} works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-300 to-blue-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 via-orange-400 to-blue-400 text-white flex items-center justify-center shadow-lg">
                  <Calendar className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Create an event</h3>
                <p className="mt-3 text-base text-gray-600">Name it, set the date, pick guest upload and approval options.</p>
              </div>
            </div>
            {/* Card 1b: Plan timeline */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-400 via-amber-300 to-orange-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-400 via-amber-400 to-orange-400 text-white flex items-center justify-center shadow-lg">
                  <CalendarClock className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Plan timeline</h3>
                <p className="mt-3 text-base text-gray-600">Add schedule items like ceremony, speeches, and first dance so guests know what’s next.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-amber-300 to-orange-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-400 via-amber-400 to-orange-400 text-white flex items-center justify-center shadow-lg">
                  <QrCode className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Share your code</h3>
                <p className="mt-3 text-base text-gray-600">Guests join via a short code or QR—no app or sign-up required.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 text-white flex items-center justify-center shadow-lg">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Guests upload</h3>
                <p className="mt-3 text-base text-gray-600">Everyone contributes their best shots in real time during the event.</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-orange-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-400 via-orange-400 to-amber-400 text-white flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Approve & share</h3>
                <p className="mt-3 text-base text-gray-600">You stay in control. Approve photos and share the gallery instantly.</p>
              </div>
            </div>
             {/* Card 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-300 to-blue-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 via-orange-400 to-blue-400 text-white flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Private & secure</h3>
                <p className="mt-3 text-base text-gray-600">Each event has its own private gallery secured by access codes. Optional approval before anything goes live.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-amber-300 to-orange-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-400 via-amber-400 to-orange-400 text-white flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Built for guests</h3>
                <p className="mt-3 text-base text-gray-600">No accounts needed. Mobile-first upload and viewing that just works for everyone attending.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 text-white flex items-center justify-center shadow-lg">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Beautiful galleries</h3>
                <p className="mt-3 text-base text-gray-600">Pixel-perfect, responsive layouts that make your event look amazing on any screen.</p>
              </div>
            </div>

          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/api/auth/google">
          <Button size="lg" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-lg text-lg px-6 py-3">Create free event</Button>
        </Link>
        <Link href="/pricing">
          <Button size="lg" variant="outline" className="rounded-full text-lg px-6 py-3 border-2 border-gray-300">See pricing</Button>
        </Link>
      </div>
    </div>
      </section>



      {/* Footer is provided globally in root layout */}
      <style jsx>{`
        .animate-gradient {
          background: linear-gradient(270deg, #fbbf24, #fef3c7, #93c5fd);
          background-size: 600% 600%;
          animation: gradientMove 8s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% {background-position:0% 50%}
          50% {background-position:100% 50%}
          100% {background-position:0% 50%}
        }
        .glass-card {
          background: rgba(255,255,255,0.6);
          border-radius: 1.25rem;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.12);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.18);
        }
        .fade-in-up {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 1.2s ease forwards;
        }
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Removed stray 'Dashboard' text above the footer */}
    </main>
  );
}
