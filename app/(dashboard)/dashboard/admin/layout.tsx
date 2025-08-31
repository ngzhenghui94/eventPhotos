import { requireSuperAdmin } from '@/lib/auth/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <section className="flex-1 p-4 lg:p-8">{children}</section>;
}
