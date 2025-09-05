import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminTeamsPage() {
  await requireSuperAdmin();

  const all = await db
    .select({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
      stripeProductId: teams.stripeProductId,
      updatedAt: teams.updatedAt
    })
    .from(teams)
    .orderBy(desc(teams.updatedAt));

    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">Teams feature removed</h1>
        <div className="text-gray-600">This page is no longer available.</div>
      </div>
    );
}
