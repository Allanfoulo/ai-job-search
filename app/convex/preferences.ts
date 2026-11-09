import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceOwner } from "./shared/ownership";

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireWorkspaceOwner(ctx);
    return await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
  },
});

export const saveMine = mutation({
  args: { model: v.string() },
  handler: async (ctx, { model }) => {
    const ownerId = await requireWorkspaceOwner(ctx);
    const existing = await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const value = model.trim().slice(0, 100);
    if (existing) await ctx.db.patch(existing._id, { model: value, updatedAt: Date.now() });
    else await ctx.db.insert("preferences", { ownerId, model: value, updatedAt: Date.now() });
    return { saved: true };
  },
});
