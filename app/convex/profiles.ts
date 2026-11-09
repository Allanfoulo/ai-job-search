import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceOwner } from "./shared/ownership";

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireWorkspaceOwner(ctx);
    return await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
  },
});

export const saveMine = mutation({
  args: { markdown: v.string(), expectedRevision: v.number() },
  handler: async (ctx, { markdown, expectedRevision }) => {
    const ownerId = await requireWorkspaceOwner(ctx);
    if (markdown.length > 120_000) throw new Error("Profile is too large to save (120,000 character limit).");
    const existing = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const revision = existing?.revision ?? 0;
    if (expectedRevision !== revision) throw new Error("This profile changed in another session. Reload it before saving your edits.");
    const updatedAt = Date.now();
    if (existing) {
      const nextRevision = revision + 1;
      await ctx.db.patch(existing._id, { markdown, revision: nextRevision, updatedAt });
      return { revision: nextRevision, updatedAt };
    }
    const nextRevision = 1;
    await ctx.db.insert("profiles", { ownerId, markdown, revision: nextRevision, updatedAt });
    return { revision: nextRevision, updatedAt };
  },
});

export const importMine = mutation({
  args: {
    markdown: v.string(),
    expectedRevision: v.number(),
    applications: v.array(v.object({
      date: v.string(), company: v.string(), sector: v.string(), role: v.string(), role_type: v.string(),
      channel: v.string(), status: v.string(), contact_person: v.string(), fit_rating: v.string(),
      notes: v.string(), cv_file: v.string(), cover_letter_file: v.string(), source: v.string(), deadline: v.string(),
    })),
  },
  handler: async (ctx, { markdown, expectedRevision, applications }) => {
    const ownerId = await requireWorkspaceOwner(ctx);
    if (markdown.length > 120_000) throw new Error("Profile is too large to import.");
    if (applications.length > 500) throw new Error("An import can contain at most 500 application records.");
    const profile = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const revision = profile?.revision ?? 0;
    if (revision !== expectedRevision) throw new Error("The profile changed after import preview. Reload and preview again.");
    if (profile) await ctx.db.patch(profile._id, { markdown, revision: revision + 1, updatedAt: Date.now() });
    else await ctx.db.insert("profiles", { ownerId, markdown, revision: 1, updatedAt: Date.now() });

    let imported = 0;
    let skipped = 0;
    const applicationIds: Array<{ applicationKey: string; applicationId: string }> = [];
    for (const row of applications) {
      const applicationKey = `${row.company.trim().toLowerCase()}::${row.role.trim().toLowerCase()}`;
      const existing = await ctx.db.query("applications").withIndex("by_owner_key", (q: any) => q.eq("ownerId", ownerId).eq("applicationKey", applicationKey)).unique();
      if (existing) { skipped++; applicationIds.push({ applicationKey, applicationId: existing._id }); continue; }
      const now = Date.now();
      const id = await ctx.db.insert("applications", { ownerId, applicationKey, ...row, createdAt: now, updatedAt: now });
      applicationIds.push({ applicationKey, applicationId: id });
      imported++;
    }
    return { imported, skipped, profileRevision: revision + 1, applicationIds };
  },
});
