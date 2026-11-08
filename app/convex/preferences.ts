import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function owner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to access this workspace.");
  return identity.subject;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await owner(ctx);
    return await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
  },
});

export const saveMine = mutation({
  args: { model: v.string() },
  handler: async (ctx, { model }) => {
    const ownerId = await owner(ctx);
    const existing = await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const value = model.trim().slice(0, 100);
    if (existing) await ctx.db.patch(existing._id, { model: value, updatedAt: Date.now() });
    else await ctx.db.insert("preferences", { ownerId, model: value, updatedAt: Date.now() });
    return { saved: true };
  },
});
