export const dynamic = "force-dynamic";
// Moved to /events/[code]; keep for backward compatibility by redirecting
import { redirect } from 'next/navigation';

export default async function LegacyGuestPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/events/${encodeURIComponent(code)}`);
}