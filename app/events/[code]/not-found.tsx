import Link from 'next/link';

export default function EventCodeNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Event not found</h1>
        <p className="text-slate-600 mb-6">We couldn't find an event with that code. Double-check the code or go back to browse events.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/events" className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">All events</Link>
          <Link href="/" className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50">Home</Link>
        </div>
      </div>
    </div>
  );
}
