export type PlanName = 'free' | 'starter' | 'hobby' | 'pro' | 'business';

export function normalizePlanName(name?: string | null): PlanName {
  if (!name) return 'free';
  const n = name.toLowerCase();
  if (n.includes('business')) return 'business';
  if (n.includes('pro')) return 'pro';
  if (n.includes('hobby')) return 'hobby';
  if (n.includes('starter')) return 'starter';
  return 'free';
}

export function uploadLimitBytes(plan: PlanName): number {
  switch (plan) {
    case 'business':
      return 100 * 1024 * 1024; // 100MB
    case 'pro':
      return 50 * 1024 * 1024; // 50MB
    case 'hobby':
      return 25 * 1024 * 1024; // 25MB
    case 'starter':
      return 20 * 1024 * 1024; // 20MB
    case 'free':
      return 15 * 1024 * 1024; // 5MB
    default:
      return 5 * 1024 * 1024; // 5MB
  }
}

// Teams feature removed. Use planName directly for limits and caps.

export function eventLimit(plan: PlanName): number | null {
  switch (plan) {
    case 'free':
      return 2;
    case 'starter':
      return 10;
    case 'hobby':
      return 25;
    case 'pro':
      return 100;
    case 'business':
      return 200;
    default:
      return null; // unlimited
  }
}


export function photoLimitPerEvent(plan: PlanName): number | null {
  switch (plan) {
    case 'free':
      return 50;
    case 'starter':
      return 150;
    case 'hobby':
      return 200;
    case 'pro':
      return 500;
    case 'business':
      return 500;
    default:
      return null; // unlimited
  }
}
// ...existing code...