import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { httpActionGeneric as httpAction } from "convex/server";
import { v } from "convex/values";

async function owner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to access this workspace.");
  return identity.subject;
}

export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await owner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attach = mutation({
  args: {
    applicationId: v.id("applications"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    artifactType: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
  },
  handler: async (ctx, data) => {
    const ownerId = await owner(ctx);
    const application = await ctx.db.get(data.applicationId);
    if (!application || application.ownerId !== ownerId) throw new Error("Application not found.");
    const fileName = data.fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").trim().slice(0, 180);
    if (!fileName) throw new Error("File name is required.");
    const extension = fileName.split(".").at(-1)?.toLowerCase();
    const types: Record<string, string> = { pdf: "application/pdf", tex: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8", txt: "text/plain; charset=utf-8" };
    if (!extension || !types[extension]) throw new Error("Only PDF, LaTeX, Markdown, and text files are supported.");
    const metadata = await ctx.storage.getMetadata(data.storageId);
    if (!metadata) throw new Error("Uploaded file was not found.");
    if (metadata.size > 25 * 1024 * 1024 || metadata.size < 0) throw new Error("Files must be smaller than 25 MB.");
    const fileKey = `${data.applicationId}::${fileName.toLowerCase()}`;
    const existing = await ctx.db.query("applicationFiles").withIndex("by_owner_file", (q: any) => q.eq("ownerId", ownerId).eq("fileKey", fileKey)).unique();
    if (existing) {
      await ctx.storage.delete(data.storageId);
      return { id: existing._id, duplicate: true };
    }
    const id = await ctx.db.insert("applicationFiles", {
      ...data,
      fileName,
      fileKey,
      contentType: types[extension],
      byteLength: metadata.size,
      ownerId,
      createdAt: Date.now(),
    });
    return { id, duplicate: false };
  },
});

export const listMine = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    const ownerId = await owner(ctx);
    const application = await ctx.db.get(applicationId);
    if (!application || application.ownerId !== ownerId) throw new Error("Application not found.");
    return await ctx.db.query("applicationFiles").withIndex("by_application", (q) => q.eq("applicationId", applicationId)).collect();
  },
});

export const metadataForDownload = internalQuery({
  args: { fileId: v.id("applicationFiles") },
  handler: async (ctx, { fileId }) => await ctx.db.get(fileId),
});

export const privateDownload = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = process.env.APP_ORIGIN ?? "";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin && origin === allowedOrigin ? origin : "null",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return new Response("Sign in required.", { status: 401, headers: corsHeaders });
  const fileId = new URL(request.url).pathname.split("/").at(-1);
  if (!fileId) return new Response("File not found.", { status: 404, headers: corsHeaders });
  try {
    const file = await ctx.runQuery(internal.files.metadataForDownload, { fileId: fileId as never });
    if (!file || file.ownerId !== identity.subject) return new Response("File not found.", { status: 404, headers: corsHeaders });
    const blob = await ctx.storage.get(file.storageId);
    if (!blob) return new Response("File not found.", { status: 404, headers: corsHeaders });
    const safeName = file.fileName.replace(/["\\\r\n]/g, "_");
    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `${file.contentType === "application/pdf" ? "inline" : "attachment"}; filename="${safeName}"`,
      },
    });
  } catch {
    return new Response("File not found.", { status: 404, headers: corsHeaders });
  }
});

export const removeMine = mutation({
  args: { fileId: v.id("applicationFiles") },
  handler: async (ctx, { fileId }) => {
    const ownerId = await owner(ctx);
    const file = await ctx.db.get(fileId);
    if (!file || file.ownerId !== ownerId) throw new Error("File not found.");
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(fileId);
  },
});
