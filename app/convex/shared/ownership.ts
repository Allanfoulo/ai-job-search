import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireWorkspaceOwner(ctx: any): Promise<string> {
  const ownerId = await getAuthUserId(ctx);
  if (!ownerId) throw new Error("Sign in to access this workspace.");
  return ownerId as string;
}
