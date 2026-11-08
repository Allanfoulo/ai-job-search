import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function owner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to access this workspace.");
  return identity.subject;
}

const fields = {
  date: v.string(), company: v.string(), sector: v.string(), role: v.string(), role_type: v.string(),
  channel: v.string(), status: v.string(), contact_person: v.string(), fit_rating: v.string(),
  notes: v.string(), cv_file: v.string(), cover_letter_file: v.string(), source: v.string(), deadline: v.string(),
};

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await owner(ctx);
    return await ctx.db.query("applications").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).order("desc").collect();
  },
});

export const createMine = mutation({
  args: fields,
  handler: async (ctx, row) => {
    const ownerId = await owner(ctx);
    const company = row.company.trim();
    const role = row.role.trim();
    if (!company || !role) throw new Error("Company and role are required.");
    const applicationKey = `${company.toLowerCase()}::${role.toLowerCase()}`;
    const duplicate = await ctx.db.query("applications").withIndex("by_owner_key", (q: any) => q.eq("ownerId", ownerId).eq("applicationKey", applicationKey)).unique();
    if (duplicate) throw new Error("This role is already in your applications.");
    const now = Date.now();
    return await ctx.db.insert("applications", { ...row, company, role, ownerId, applicationKey, createdAt: now, updatedAt: now });
  },
});

export const updateStatus = mutation({
  args: { applicationId: v.id("applications"), status: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { applicationId, status, note }) => {
    const ownerId = await owner(ctx);
    const row = await ctx.db.get(applicationId);
    if (!row || row.ownerId !== ownerId) throw new Error("Application not found.");
    const statuses = new Set(["drafted", "applied", "interview", "offer", "hired", "rejected", "no_response", "offer_declined", "withdrawn"]);
    if (!statuses.has(status)) throw new Error("Choose a valid application status.");
    await ctx.db.patch(applicationId, {
      status,
      date: row.status === "drafted" && status !== "drafted" ? new Date().toISOString().slice(0, 10) : row.date,
      notes: note?.trim() ? `${row.notes}${row.notes ? "; " : ""}${note.trim().replace(/[\r\n]/g, " ").slice(0, 500)}` : row.notes,
      updatedAt: Date.now(),
    });
    return status;
  },
});
