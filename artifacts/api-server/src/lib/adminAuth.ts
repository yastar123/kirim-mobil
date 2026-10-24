import { getAuth, clerkClient } from "@clerk/express";
import { db, staffMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, RequestHandler, Response } from "express";

export type StaffRole = "owner" | "admin_content" | "admin_operations";
export type StaffRecord = typeof staffMembersTable.$inferSelect;

export async function resolveStaffMember(
  req: Request,
): Promise<StaffRecord | undefined> {
  const userId = getAuth(req).userId;
  if (!userId) return undefined;

  const [existing] = await db
    .select()
    .from(staffMembersTable)
    .where(eq(staffMembersTable.clerkUserId, userId))
    .limit(1);
  if (existing) return existing;

  const configuredOwnerEmail = process.env.KIRIMMOBIL_OWNER_EMAIL?.trim();
  if (!configuredOwnerEmail) return undefined;

  const user = await clerkClient.users.getUser(userId);
  const primaryAddress = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;
  if (
    !primaryAddress ||
    primaryAddress.toLowerCase() !== configuredOwnerEmail.toLowerCase()
  ) {
    return undefined;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    primaryAddress;
  await db
    .insert(staffMembersTable)
    .values({
      clerkUserId: userId,
      email: primaryAddress,
      displayName,
      role: "owner",
    })
    .onConflictDoNothing();

  const [owner] = await db
    .select()
    .from(staffMembersTable)
    .where(eq(staffMembersTable.clerkUserId, userId))
    .limit(1);
  return owner;
}

export function requireStaff(...allowedRoles: StaffRole[]): RequestHandler {
  return async (req, res, next): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }

    const member = await resolveStaffMember(req);
    if (!member) {
      res.status(403).json({
        error:
          "This account is not assigned a Kirimmobil staff role. Configure the initial owner email before using the admin dashboard.",
      });
      return;
    }

    if (
      allowedRoles.length > 0 &&
      member.role !== "owner" &&
      !allowedRoles.includes(member.role)
    ) {
      res.status(403).json({ error: "Your role does not allow this action." });
      return;
    }

    res.locals.staffMember = member;
    next();
  };
}

export function getStaffFromResponse(res: Response): StaffRecord {
  return res.locals.staffMember as StaffRecord;
}
