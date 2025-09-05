import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getTeamPlanName, getUploadLimitForTeam, getPhotoCapForTeam, eventLimit } from '@/lib/plans';

export async function GET() {
  const user = await getUser();
  const team = await getTeamForUser();
  const plan = getTeamPlanName(team?.planName);
  return Response.json({
    user,
    team: team ? {
      name: team.name,
      planName: plan,
      subscriptionStatus: team.subscriptionStatus,
      uploadLimitMB: Math.round(getUploadLimitForTeam(plan) / 1024 / 1024),
      photoCap: getPhotoCapForTeam(plan),
      eventLimit: eventLimit(plan),
      members: team.teamMembers?.length ?? 1,
    } : null
  });
}
