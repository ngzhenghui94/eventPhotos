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
      return 10 * 1024 * 1024; // 10MB
    case 'free':
    default:
      return 5 * 1024 * 1024; // 5MB
  }
}

export function getTeamPlanName(planName?: string | null): PlanName {
  return normalizePlanName(planName);
}

export function getUploadLimitForTeam(planName?: string | null): number {
  return uploadLimitBytes(getTeamPlanName(planName));
}

export function eventLimit(plan: PlanName): number | null {
  switch (plan) {
    case 'free':
      return 1;
    case 'starter':
      return 2;
    case 'hobby':
      return 5;
    case 'pro':
      return 20;
    case 'business':
    default:
      return null; // unlimited
  }
}

export function canCreateAnotherEvent(planName?: string | null, currentCount: number = 0) {
  const plan = getTeamPlanName(planName);
  const limit = eventLimit(plan);
  if (limit === null) return true;
  return currentCount < limit;
}

export function photoCapPerEvent(plan: PlanName): number {
  switch (plan) {
    case 'free':
      return 20;
    case 'starter':
      return 50;
    case 'hobby':
      return 100;
    case 'pro':
      return 500;
    case 'business':
    default:
      return 1000;
  }
function teamsEnabled(plan: PlanName): boolean {
  switch (plan) {
    case 'pro':
    case 'business':
      return true;
    default:
      return false;
  }
}
}

export function getPhotoCapForTeam(planName?: string | null): number {
  return photoCapPerEvent(getTeamPlanName(planName));
}