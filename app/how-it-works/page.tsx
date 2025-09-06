"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, QrCode, Upload, CheckCircle2, Shield, Users, ImageIcon } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50">
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 animate-gradient bg-gradient-to-br from-orange-200 via-amber-100 to-blue-200 opacity-60"></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight text-gray-900 mb-6 drop-shadow-lg">
            How memoriesVault Works
          </h1>
          <p className="mb-8 text-lg sm:text-xl text-gray-700">
            Discover the simple, secure, and beautiful way to collect and share event memories. No apps, no accounts—just instant galleries for everyone.
          </p>
          <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-lg text-lg px-8 py-4">
            <Link href="/dashboard">Try it now</Link>
          </Button>
        </div>
      </section>
      <section className="py-16 sm:py-24 fade-in-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-300 to-blue-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-amber-500 via-orange-400 to-blue-400 shadow-lg flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Create an event</h3>
                <p className="mt-3 text-base text-gray-600">Name it, set the date, pick guest upload and approval options.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-amber-300 to-orange-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-blue-400 via-amber-400 to-orange-400 shadow-lg flex items-center justify-center">
                  <QrCode className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Share your code</h3>
                <p className="mt-3 text-base text-gray-600">Guests join via a short code or QR—no app or sign-up required.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-orange-400 via-blue-400 to-amber-400 shadow-lg flex items-center justify-center">
                  <Upload className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Guests upload</h3>
                <p className="mt-3 text-base text-gray-600">Everyone contributes their best shots in real time during the event.</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-orange-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-blue-400 via-orange-400 to-amber-400 shadow-lg flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Approve & share</h3>
                <p className="mt-3 text-base text-gray-600">You stay in control. Approve photos and share the gallery instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 sm:py-24 fade-in-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-300 to-blue-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-amber-500 via-orange-400 to-blue-400 shadow-lg flex items-center justify-center">
                  <Shield className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Private & secure</h3>
                <p className="mt-3 text-base text-gray-600">Each event has its own private gallery secured by access codes. Optional approval before anything goes live.</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 via-amber-300 to-orange-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-blue-400 via-amber-400 to-orange-400 shadow-lg flex items-center justify-center">
                  <Users className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Built for guests</h3>
                <p className="mt-3 text-base text-gray-600">No accounts needed. Mobile-first upload and viewing that just works for everyone attending.</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-400 via-blue-400 to-amber-400 opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
              <div className="glass-card p-8 shadow-2xl border border-amber-100/40 backdrop-blur-md bg-white/80 hover:bg-white/95 hover:border-amber-300/60 rounded-2xl relative z-10">
                <div className="h-14 w-14 rounded-xl bg-white/30 backdrop-blur-md border-2 border-gradient-to-br from-orange-400 via-blue-400 to-amber-400 shadow-lg flex items-center justify-center">
                  <ImageIcon className="h-7 w-7 text-white/80 drop-shadow-lg" />
                </div>
                <h3 className="mt-6 font-bold text-xl text-gray-900">Beautiful galleries</h3>
                <p className="mt-3 text-base text-gray-600">Pixel-perfect, responsive layouts that make your event look amazing on any screen.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
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
    </main>
  );
}
