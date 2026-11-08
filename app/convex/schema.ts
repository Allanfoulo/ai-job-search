import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  invitations: defineTable({
    email: v.string(),
    tokenHash: v.string(),
    invitedBy: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  profiles: defineTable({
    ownerId: v.string(),
    markdown: v.string(),
    revision: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  applications: defineTable({
    ownerId: v.string(),
    applicationKey: v.string(),
    date: v.string(),
    company: v.string(),
    sector: v.string(),
    role: v.string(),
    role_type: v.string(),
    channel: v.string(),
    status: v.string(),
    contact_person: v.string(),
    fit_rating: v.string(),
    notes: v.string(),
    cv_file: v.string(),
    cover_letter_file: v.string(),
    source: v.string(),
    deadline: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_key", ["ownerId", "applicationKey"]),

  applicationFiles: defineTable({
    ownerId: v.string(),
    applicationId: v.id("applications"),
    fileKey: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    artifactType: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_file", ["ownerId", "fileKey"])
    .index("by_application", ["applicationId"]),

  preferences: defineTable({
    ownerId: v.string(),
    model: v.string(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  applicationWorkflows: defineTable({
    ownerId: v.string(),
    applicationId: v.id("applications"),
    postingText: v.string(),
    sourceUrl: v.string(),
    guard: v.any(),
    linkedSources: v.array(v.object({ url: v.string(), text: v.string(), verdict: v.string() })),
    fitAssessment: v.optional(v.any()),
    fitProfileRevision: v.optional(v.number()),
    documents: v.optional(v.any()),
    review: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_application", ["ownerId", "applicationId"]),
});
