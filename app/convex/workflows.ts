import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function owner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to access this workspace.");
  return identity.subject;
}

export const getMine = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const ownerId = await owner(ctx);
    const application = await ctx.db.get(applicationId);
    if (!application || application.ownerId !== ownerId) throw new Error("Application not found.");
    return await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q: any) => q.eq("ownerId", ownerId).eq("applicationId", applicationId)).unique();
  },
});

export const getForAction = internalQuery({
  args: { ownerId: v.string(), applicationId: v.id("applications") },
  handler: async (ctx, { ownerId, applicationId }) => {
    const application = await ctx.db.get(applicationId);
    if (!application || application.ownerId !== ownerId) throw new Error("Application not found.");
    const profile = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const workflow = await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q: any) => q.eq("ownerId", ownerId).eq("applicationId", applicationId)).unique();
    const preferences = await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    return { application, profile, workflow, preferences };
  },
});

export const savePrepared = internalMutation({
  args: {
    ownerId: v.string(), applicationId: v.id("applications"), postingText: v.string(), sourceUrl: v.string(), guard: v.any(),
    linkedSources: v.array(v.object({ url: v.string(), text: v.string(), verdict: v.string() })),
  },
  handler: async (ctx, data) => {
    const application = await ctx.db.get(data.applicationId);
    if (!application || application.ownerId !== data.ownerId) throw new Error("Application not found.");
    const existing = await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q: any) => q.eq("ownerId", data.ownerId).eq("applicationId", data.applicationId)).unique();
    if (existing) {
      await ctx.db.replace(existing._id, { ...data, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("applicationWorkflows", { ...data, updatedAt: Date.now() });
  },
});

export const saveFit = internalMutation({
  args: { ownerId: v.string(), applicationId: v.id("applications"), fitAssessment: v.any(), profileRevision: v.number() },
  handler: async (ctx, data) => {
    const existing = await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q: any) => q.eq("ownerId", data.ownerId).eq("applicationId", data.applicationId)).unique();
    if (!existing) throw new Error("Check the posting before requesting a fit review.");
    await ctx.db.patch(existing._id, { fitAssessment: data.fitAssessment, fitProfileRevision: data.profileRevision, updatedAt: Date.now() });
  },
});

export const saveDraft = internalMutation({
  args: { ownerId: v.string(), applicationId: v.id("applications"), documents: v.any(), review: v.any() },
  handler: async (ctx, data) => {
    const existing = await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q: any) => q.eq("ownerId", data.ownerId).eq("applicationId", data.applicationId)).unique();
    if (!existing) throw new Error("Application workflow not found.");
    await ctx.db.patch(existing._id, { documents: data.documents, review: data.review, updatedAt: Date.now() });
  },
});

export const saveGeneratedFile = internalMutation({
  args: {
    ownerId: v.string(), applicationId: v.id("applications"), storageId: v.id("_storage"),
    fileName: v.string(), artifactType: v.string(), contentType: v.string(), byteLength: v.number(),
  },
  handler: async (ctx, data) => {
    const application = await ctx.db.get(data.applicationId);
    if (!application || application.ownerId !== data.ownerId) throw new Error("Application not found.");
    const fileName = data.fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").trim().slice(0, 180);
    const fileKey = `${data.applicationId}::${fileName.toLowerCase()}`;
    const existing = await ctx.db.query("applicationFiles").withIndex("by_owner_file", (q: any) => q.eq("ownerId", data.ownerId).eq("fileKey", fileKey)).unique();
    if (existing) {
      await ctx.storage.delete(existing.storageId);
      await ctx.db.delete(existing._id);
    }
    const id = await ctx.db.insert("applicationFiles", { ...data, fileName, fileKey, createdAt: Date.now() });
    if (data.artifactType === "Tailored CV") await ctx.db.patch(data.applicationId, { cv_file: fileName, updatedAt: Date.now() });
    if (data.artifactType === "Tailored Cover Letter") await ctx.db.patch(data.applicationId, { cover_letter_file: fileName, updatedAt: Date.now() });
    return id;
  },
});
