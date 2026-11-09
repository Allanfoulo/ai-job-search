import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireWorkspaceOwner } from "./shared/ownership";

const LEGACY_BATCH_SIZE = 20;

export const ensureMine = action({
  args: {},
  handler: async (ctx): Promise<{ complete: boolean; migrated: number }> => {
    const ownerId = await requireWorkspaceOwner(ctx);
    await ctx.runMutation(internal.workspaceMigration.mergeProfileAndPreferences, { ownerId });
    const legacyApplications: Id<"applications">[] = await ctx.runQuery(internal.workspaceMigration.listLegacyApplications, { ownerId, limit: LEGACY_BATCH_SIZE });
    for (const applicationId of legacyApplications) {
      await ctx.runMutation(internal.workspaceMigration.migrateApplication, { ownerId, applicationId });
    }
    return { complete: legacyApplications.length < LEGACY_BATCH_SIZE, migrated: legacyApplications.length };
  },
});

export const listLegacyApplications = internalQuery({
  args: { ownerId: v.string(), limit: v.number() },
  handler: async (ctx, { ownerId, limit }) => {
    const prefix = `${ownerId}|`;
    const rows = await ctx.db.query("applications").withIndex("by_owner", (q) => q.gte("ownerId", prefix).lt("ownerId", `${prefix}\uffff`)).take(Math.min(Math.max(limit, 1), LEGACY_BATCH_SIZE));
    return rows.map((row) => row._id);
  },
});

export const mergeProfileAndPreferences = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const prefix = `${ownerId}|`;
    const profiles = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.gte("ownerId", prefix).lt("ownerId", `${prefix}\uffff`)).collect();
    const stableProfiles = await ctx.db.query("profiles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect();
    if (profiles.length || stableProfiles.length > 1) {
      const all = [...profiles, ...stableProfiles].sort((a, b) => b.updatedAt - a.updatedAt);
      const keep = all[0];
      await ctx.db.patch(keep._id, { ownerId, markdown: keep.markdown, revision: keep.revision, updatedAt: keep.updatedAt });
      for (const duplicate of all.slice(1)) await ctx.db.delete(duplicate._id);
    }
    const preferences = await ctx.db.query("preferences").withIndex("by_owner", (q) => q.gte("ownerId", prefix).lt("ownerId", `${prefix}\uffff`)).collect();
    const stablePreferences = await ctx.db.query("preferences").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect();
    if (preferences.length || stablePreferences.length > 1) {
      const all = [...preferences, ...stablePreferences].sort((a, b) => b.updatedAt - a.updatedAt);
      const keep = all[0];
      await ctx.db.patch(keep._id, { ownerId, model: keep.model, updatedAt: keep.updatedAt });
      for (const duplicate of all.slice(1)) await ctx.db.delete(duplicate._id);
    }
  },
});

export const migrateApplication = internalMutation({
  args: { ownerId: v.string(), applicationId: v.id("applications") },
  handler: async (ctx, { ownerId, applicationId }) => {
    const legacy = await ctx.db.get(applicationId);
    if (!legacy || !legacy.ownerId.startsWith(`${ownerId}|`)) return;
    const matches = await ctx.db.query("applications").withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId).eq("applicationKey", legacy.applicationKey)).collect();
    const canonical = matches.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const appIds = canonical ? [legacy._id, canonical._id] : [legacy._id];
    const appRows = canonical ? [legacy, canonical].sort((a, b) => b.updatedAt - a.updatedAt) : [legacy];
    const newest = appRows[0];
    const cvFile = appRows.find((row) => row.cv_file.trim())?.cv_file ?? "";
    const coverLetterFile = appRows.find((row) => row.cover_letter_file.trim())?.cover_letter_file ?? "";
    let canonicalId = legacy._id;
    if (canonical) {
      canonicalId = canonical._id;
      await ctx.db.patch(canonicalId, {
        ownerId, applicationKey: legacy.applicationKey, date: newest.date, company: newest.company, sector: newest.sector,
        role: newest.role, role_type: newest.role_type, channel: newest.channel, status: newest.status,
        contact_person: newest.contact_person, fit_rating: newest.fit_rating, notes: newest.notes,
        cv_file: cvFile, cover_letter_file: coverLetterFile, source: newest.source, deadline: newest.deadline,
        createdAt: Math.min(...appRows.map((row) => row.createdAt)), updatedAt: Math.max(...appRows.map((row) => row.updatedAt)),
      });
    } else {
      await ctx.db.patch(legacy._id, { ownerId });
    }

    const workflows = (await Promise.all(appIds.map((id) => ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q) => q.eq("ownerId", legacy.ownerId).eq("applicationId", id)).collect()))).flat();
    const canonicalWorkflows = canonical ? await ctx.db.query("applicationWorkflows").withIndex("by_owner_application", (q) => q.eq("ownerId", ownerId).eq("applicationId", canonicalId)).collect() : [];
    const allWorkflows = [...workflows, ...canonicalWorkflows].filter((row, index, all) => all.findIndex((other) => other._id === row._id) === index).sort((a, b) => b.updatedAt - a.updatedAt);
    if (allWorkflows.length) {
      const base = allWorkflows[0];
      const latest = (field: "fitAssessment" | "fitProfileRevision" | "documents" | "review") => allWorkflows.find((row) => row[field] !== undefined)?.[field];
      const optionalFields = {
        ...(latest("fitAssessment") === undefined ? {} : { fitAssessment: latest("fitAssessment") }),
        ...(latest("fitProfileRevision") === undefined ? {} : { fitProfileRevision: latest("fitProfileRevision") }),
        ...(latest("documents") === undefined ? {} : { documents: latest("documents") }),
        ...(latest("review") === undefined ? {} : { review: latest("review") }),
      };
      const workflowData = {
        ownerId, applicationId: canonicalId, postingText: allWorkflows.find((row) => row.postingText.trim())?.postingText ?? base.postingText,
        sourceUrl: allWorkflows.find((row) => row.sourceUrl.trim())?.sourceUrl ?? base.sourceUrl, guard: base.guard,
        linkedSources: base.linkedSources, ...optionalFields, updatedAt: Math.max(...allWorkflows.map((row) => row.updatedAt)),
      };
      await ctx.db.replace(base._id, workflowData);
      for (const duplicate of allWorkflows.slice(1)) await ctx.db.delete(duplicate._id);
    }

    const files = (await Promise.all(appIds.map((id) => ctx.db.query("applicationFiles").withIndex("by_application", (q) => q.eq("applicationId", id)).collect()))).flat();
    const byName = new Map<string, typeof files>();
    for (const file of files) byName.set(file.fileName.toLowerCase(), [...(byName.get(file.fileName.toLowerCase()) ?? []), file]);
    for (const group of byName.values()) {
      const ordered = group.sort((a, b) => b.createdAt - a.createdAt);
      const keep = ordered[0];
      const fileKey = `${canonicalId}::${keep.fileName.toLowerCase()}`;
      await ctx.db.patch(keep._id, { ownerId, applicationId: canonicalId, fileKey });
      for (const duplicate of ordered.slice(1)) {
        await ctx.storage.delete(duplicate.storageId);
        await ctx.db.delete(duplicate._id);
      }
    }
    if (canonical && legacy._id !== canonicalId) await ctx.db.delete(legacy._id);
  },
});
