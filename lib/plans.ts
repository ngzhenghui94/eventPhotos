export type PlanName = 'free' | 'base' | 'plus';

export function normalizePlanName(name?: string | null): PlanName {
  if (!name) return 'free';
  const n = name.toLowerCase();
  if (n.includes('plus')) return 'plus';
  if (n.includes('base')) return 'base';
  return 'free';
}

export function uploadLimitBytes(plan: PlanName): number {
  switch (plan) {
    case 'plus':
      return 50 * 1024 * 1024; // 50MB
    case 'base':
      return 25 * 1024 * 1024; // 25MB
    case 'free':
    default:
      return 10 * 1024 * 1024; // 10MB
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
    case 'base':
      return 5;
    case 'plus':
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
    case 'base':
      return 50;
    case 'plus':
    default:
      return 100;
  }
}

export function getPhotoCapForTeam(planName?: string | null): number {
  return photoCapPerEvent(getTeamPlanName(planName));
}