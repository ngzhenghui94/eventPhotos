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
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">All Teams</h1>
      <div className="space-y-3">
        {all.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">{t.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>Plan: {t.planName || '—'}</div>
                <div>Status: {t.subscriptionStatus || '—'}</div>
                <div>Stripe Sub: {t.stripeSubscriptionId || '—'}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
