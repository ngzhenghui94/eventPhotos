'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
// Removed email verification flow

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({ email: z.string().optional(), password: z.string().optional() });

export const signIn = validatedAction(signInSchema, async () => {
  return { error: 'Password-based sign-in is disabled. Please use Google.' };
});

const signUpSchema = z.object({ name: z.string().optional(), email: z.string().optional(), password: z.string().optional(), inviteId: z.string().optional() });

export const signUp = validatedAction(signUpSchema, async () => {
  return { error: 'Password-based sign-up is disabled. Please use Google.' };
});

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async () => {
    return { error: 'Password updates are disabled. Accounts use Google Sign-In.' };
  }
);

const deleteAccountSchema = z.object({});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (_data, _formData, user) => {
    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);
