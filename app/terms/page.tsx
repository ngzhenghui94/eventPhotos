export const dynamic = 'force-static';
import Link from 'next/link';

export default function TermsPage() {
  const updated = new Date().toISOString().slice(0, 10);
  const brand = 'The Crowd Grid';
  const sections = [
    {
      key: 'accounts',
      title: 'Accounts & Eligibility',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>You must be at least 13 years old (or the age of digital consent in your jurisdiction).</li>
          <li>You are responsible for maintaining the confidentiality of your account and credentials.</li>
          <li>You must provide accurate information and promptly update it as needed.</li>
        </ul>
      )
    },
    {
      key: 'hosting',
      title: 'Event Hosting & Guest Content',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>Hosts are responsible for all content uploaded to their events and compliance with law.</li>
          <li>Hosts may enable guest uploads and are responsible for moderating unlawful or infringing content.</li>
          <li>We may remove content that violates these Terms or applicable law.</li>
        </ul>
      )
    },
    {
      key: 'acceptable',
      title: 'Acceptable Use',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>No illegal, infringing, hateful, harassing, exploitative, or harmful content.</li>
          <li>No attempts to reverse engineer, scrape, or harm the Service or other users.</li>
          <li>No unauthorized access or circumvention of security measures.</li>
        </ul>
      )
    },
    {
      key: 'ip',
      title: 'Intellectual Property',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>You retain ownership of photos and content you upload.</li>
          <li>By uploading, you grant the host and {brand} a limited, worldwide, non-exclusive license to store, display, and process your content to provide the Service.</li>
          <li>You represent that you have all rights necessary to upload and share the content.</li>
        </ul>
      )
    },
    {
      key: 'privacy',
      title: 'Privacy',
      content: (
        <p>
          We process personal data according to our Privacy Policy. By using the Service, you consent to such processing. Do not upload sensitive personal data unless strictly necessary and permitted by law.
        </p>
      )
    },
    {
      key: 'payments',
      title: 'Payments & Subscriptions',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>Paid plans renew automatically unless canceled according to the plan terms.</li>
          <li>Fees are non-refundable except where required by law or expressly stated otherwise.</li>
          <li>We may change pricing with prior notice; continued use after changes constitutes acceptance.</li>
        </ul>
      )
    },
    {
      key: 'dmca',
      title: 'DMCA & Copyright Complaints',
      content: (
        <p>
          If you believe content infringes your rights, contact us with: (a) identification of the work, (b) the infringing material, (c) your contact information, (d) a statement of good-faith belief, and (e) a statement under penalty of perjury that you are authorized to act.
        </p>
      )
    },
    {
      key: 'disclaimers',
      title: 'Disclaimers',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>The Service is provided "as is" and "as available" without warranties of any kind.</li>
          <li>We do not guarantee uninterrupted or error-free operation, storage, or availability of content.</li>
        </ul>
      )
    },
    {
      key: 'liability',
      title: 'Limitation of Liability',
      content: (
        <p>
          To the fullest extent permitted by law, {brand} and its affiliates shall not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from or related to your use of the Service. Our total liability for any claim shall not exceed the amount paid by you to us in the 12 months preceding the claim, or $100 if none.
        </p>
      )
    },
    {
      key: 'indemnity',
      title: 'Indemnification',
      content: (
        <p>
          You agree to defend, indemnify, and hold harmless {brand} from any claims, liabilities, damages, and expenses (including attorney’s fees) arising from your use of the Service, your content, or your violation of these Terms or applicable law.
        </p>
      )
    },
    {
      key: 'termination',
      title: 'Termination',
      content: (
        <p>
          We may suspend or terminate access to the Service at any time for any reason, including violations of these Terms. Upon termination, your right to use the Service will cease, but certain provisions shall survive (e.g., IP, disclaimers, limitations).
        </p>
      )
    },
    {
      key: 'law',
      title: 'Governing Law & Dispute Resolution',
      content: (
        <p>
          These Terms are governed by the laws of your principal place of business (unless otherwise required by law). Disputes will be resolved in the courts located there, except where mandatory local law requires otherwise.
        </p>
      )
    },
    {
      key: 'changes',
      title: 'Changes to These Terms',
      content: (
        <p>
          We may update these Terms from time to time. Material changes will be notified via the Service or email. Continued use constitutes acceptance of the updated Terms.
        </p>
      )
    },
    {
      key: 'contact',
      title: 'Contact',
      content: (
        <p>
          Questions about these Terms? Contact us via the support options provided within the app.
        </p>
      )
    }
  ];

  return (
    <main className="relative">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-24 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {/* Header card */}
        <div className="mb-8 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Terms & Conditions</h1>
              <p className="text-sm text-slate-500 mt-1">Last updated: {updated}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">Legal</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200">User Agreement</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 border border-emerald-200">Hosting</span>
            </div>
          </div>
          <p className="mt-4 text-slate-700">
            These Terms & Conditions ("Terms") govern your access to and use of {brand}, including any services, websites, mobile apps,
            and related offerings (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((s) => (
            <article key={s.key} className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-lg p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">Section</span>
                <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
              </div>
              <div className="text-slate-800 text-sm leading-relaxed">
                {s.content}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-sm text-slate-600">
          <Link className="underline" href="/">Back to Home</Link>
        </div>
      </section>
    </main>
  );
}


