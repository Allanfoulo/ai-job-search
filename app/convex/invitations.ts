import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, query, mutation } from "./_generated/server";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isOwner(ctx: any) {
  const configuredOwner = normalizeEmail(process.env.APP_OWNER_EMAIL || "");
  if (!configuredOwner) return false;
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return normalizeEmail(user?.email || "") === configuredOwner;
}

export const checkCode = internalQuery({
  args: { email: v.string(), inviteCode: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const invitation = await ctx.db.query("invitations").withIndex("by_email", (q: any) => q.eq("email", email)).unique();
    if (!invitation) return false;
    return constantTimeEqual(invitation.tokenHash, await sha256(args.inviteCode));
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx))) return { isOwner: false, invitations: [] };
    const invitations = await ctx.db.query("invitations").collect();
    return { isOwner: true, invitations: invitations.map(({ _id, email, createdAt }) => ({ _id, email, createdAt })) };
  },
});

export const createMine = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Only the workspace owner can invite collaborators.");
    const email = normalizeEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    const ownerEmail = normalizeEmail(process.env.APP_OWNER_EMAIL || "");
    if (email === ownerEmail) throw new Error("The owner already has access.");
    const inviteCode = [...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const tokenHash = await sha256(inviteCode);
    const existing = await ctx.db.query("invitations").withIndex("by_email", (q: any) => q.eq("email", email)).unique();
    if (existing) await ctx.db.patch(existing._id, { tokenHash, invitedBy: ownerEmail, createdAt: Date.now() });
    else await ctx.db.insert("invitations", { email, tokenHash, invitedBy: ownerEmail, createdAt: Date.now() });
    return { email, inviteCode };
  },
});

export const removeMine = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    if (!(await isOwner(ctx))) throw new Error("Only the workspace owner can manage invitations.");
    const invitation = await ctx.db.get(args.invitationId);
    if (invitation) await ctx.db.delete(invitation._id);
  },
});
