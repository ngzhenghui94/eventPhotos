
// Log sign-in activity
export async function logActivity(
  _teamId: number | null | undefined,
  userId: number,
  type: any,
  ipAddress?: string
) {
  const { logActivity: dbLogActivity } = await import('@/lib/db/queries');
  await dbLogActivity({
    userId,
    action: typeof type === 'string' ? type : 'SIGN_IN',
    ipAddress,
    detail: 'User signed in',
  });
}


