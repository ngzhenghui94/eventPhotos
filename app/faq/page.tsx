export const dynamic = 'force-static';
import Link from 'next/link';

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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-slate-900 mb-2">Frequently Asked Questions</h1>
      <p className="text-sm text-slate-500 mb-8">For hosts and guests</p>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">For Hosts</h2>
          <ul className="space-y-4">
            {hosts.map((item, i) => (
              <li key={`h-${i}`}>
                <p className="font-medium text-slate-900">{item.q}</p>
                <p className="text-sm text-slate-700 mt-1">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">For Guests</h2>
          <ul className="space-y-4">
            {guests.map((item, i) => (
              <li key={`g-${i}`}>
                <p className="font-medium text-slate-900">{item.q}</p>
                <p className="text-sm text-slate-700 mt-1">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-10 text-sm text-slate-600">
        <p className="mb-2">Need more help? Check our <Link href="/terms" className="underline">Terms & Conditions</Link> or contact your event host.</p>
        <p>Note: Some features depend on the host’s subscription plan.</p>
      </div>
    </main>
  );
}


