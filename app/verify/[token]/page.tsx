import { redirect } from 'next/navigation';

export default async function VerifyPage() {
  redirect('/sign-in');
}
