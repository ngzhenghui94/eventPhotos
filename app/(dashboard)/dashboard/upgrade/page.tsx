"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UpgradePage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Upgrade Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-700">
            Unlock more features, higher upload limits, and advanced controls by upgrading your subscription plan.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" color="orange">Back to Dashboard</Button>
          </Link>
          {/* Add your upgrade/payment UI here */}
        </CardContent>
      </Card>
    </section>
  );
}
