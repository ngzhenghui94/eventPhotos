import { redirect } from 'next/navigation';

interface VanityProps { params: Promise<{ code: string }> }

export default async function VanityRedirect({ params }: VanityProps) {
  const { code } = await params;
  redirect(`/events/${encodeURIComponent(code)}`);
}


