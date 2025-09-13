export const dynamic = 'force-static';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';

type QA = { q: string; a: string };

const hosts: QA[] = [
  { q: 'How do I create an event?', a: 'Go to Dashboard → New Event, fill in the details, and save. A unique Event Code and Access Code will be generated.' },
  { q: 'What is the difference between Event Code and Access Code?', a: 'Event Code is a public identifier guests use to find your event; Access Code is a private code that restricts viewing/uploading for private events.' },
  { q: 'How do I enable or disable guest uploads?', a: 'Open your event in Dashboard and toggle Guest Uploads in Event Settings.' },
  { q: 'Can I require photo approval?', a: 'Yes. Enable Photo Approval in Event Settings. Photos remain hidden until you approve them.' },
  { q: 'How do I share the event with guests?', a: 'Share the Event Code or the event URL/QR from the Dashboard. For private events, also share the Access Code.' },
  { q: 'Is there a limit on photo size or count?', a: 'Limits depend on your plan. See Pricing for per-upload size limits and total photo caps.' },
  { q: 'How do I bulk-download photos?', a: 'Use the Bulk Download button in the event gallery to download approved photos as a zip.' },
  { q: 'Can I delete my event?', a: 'Yes. In the event page’s Danger Zone, confirm and delete. This permanently removes all photos and data for that event.' },
  { q: 'How do I manage the event timeline?', a: 'Add items with title, time, and optional description/location. As host, you can adjust times by ±15 minutes individually or for all items.' },
  { q: 'Do guests need an account?', a: 'No. Guests can view and upload (if enabled) using the Event Code (and Access Code for private events).' },
  { q: 'How do refunds work?', a: 'Refer to the plan terms on the Pricing page. Unless stated otherwise, subscriptions are non-refundable except where required by law.' },
  { q: 'Where can I find the Terms & Conditions?', a: 'They are available at the Terms link in the navigation and at /terms.' },
];

const guests: QA[] = [
  { q: 'How do I find an event?', a: 'Enter the Event Code shared by the host. For private events, you may also need the Access Code.' },
  { q: 'How do I upload photos?', a: 'On the event page, click Upload Photos and follow the prompts. Some events limit file size or require approval.' },
  { q: 'Why can’t I see my photo?', a: 'The host may require approval, or your photo may be pending processing. Check back later or contact the host.' },
  { q: 'Can I download photos?', a: 'Yes, approved photos can be downloaded from the gallery. Bulk downloads may be available depending on the host’s plan.' },
  { q: 'Do I need an account to upload?', a: 'No, unless the host restricts uploads. You may still need the Access Code for private events.' },
  { q: 'Is my data private?', a: 'We store the minimum necessary data to provide the service. See our Terms & Conditions and Privacy terms.' },
  { q: 'The Access Code isn’t working—what do I do?', a: 'Double-check the code and try again in uppercase. If it still fails, contact the event host.' },
  { q: 'Can I remove a photo I uploaded?', a: 'Contact the host to request removal. Hosts can delete photos and revoke access.' },
];

export default function FaqPage() {
  return (
    <main className="relative">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-24 h-80 w-80 rounded-full bg-amber-300/35 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-rose-300/35 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-orange-200/25 blur-2xl" />
      </div>

      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-10">
        {/* Header card */}
        <div className="mb-8 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-white/70 to-rose-50/80 backdrop-blur-md shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-amber-900">Frequently Asked Questions</h1>
              <p className="text-sm text-amber-700/80 mt-1">For hosts and guests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">FAQ</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-900 border border-orange-200">Hosts</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-900 border border-rose-200">Guests</span>
            </div>
          </div>
          <p className="mt-4 text-amber-900/90">
            Find quick answers about creating and sharing events, guest uploads, approvals, downloading, limits, privacy, and troubleshooting.
          </p>
        </div>

        {/* Hosts grid */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">Section</span>
            <h2 className="text-lg font-semibold text-orange-900">For Hosts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hosts.map((item, i) => (
              <article key={`h-${i}`} className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50/70 via-white/60 to-amber-50/70 backdrop-blur-md shadow-lg p-5">
                <p className="font-medium text-orange-900">{item.q}</p>
                <p className="text-sm text-orange-900/90 mt-1 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Guests grid */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">Section</span>
            <h2 className="text-lg font-semibold text-orange-900">For Guests</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guests.map((item, i) => (
              <article key={`g-${i}`} className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50/70 via-white/60 to-amber-50/70 backdrop-blur-md shadow-lg p-5">
                <p className="font-medium text-orange-900">{item.q}</p>
                <p className="text-sm text-orange-900/90 mt-1 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-600">
          <p className="mb-2">Need more help? Review our <Link href="/terms" className="underline">Terms & Conditions</Link> or contact your event host.</p>
          <p>Note: Some features depend on the host’s subscription plan.</p>
        </div>
      </section>
    </main>
  );
}


