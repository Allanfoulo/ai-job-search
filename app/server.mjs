import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPostingGuard } from "./server/posting-guard.mjs";
import { createDraft, listApplications, readApplication } from "./server/storage.mjs";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");
const port = Number(process.env.LOCAL_UI_API_PORT || 4178);
const allowedOrigins = new Set(["http://127.0.0.1:5173", `http://127.0.0.1:${port}`]);
const maxBodyBytes = 1_000_000;

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("Request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.has(origin)) {
    throw Object.assign(new Error("Request origin is not allowed."), { status: 403 });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true, localOnly: true });
    }
    if (req.method === "GET" && url.pathname === "/api/applications") {
      const applications = await listApplications(repoRoot);
      const counts = applications.reduce((result, app) => {
        const status = app.status || "unknown";
        result[status] = (result[status] || 0) + 1;
        return result;
      }, {});
      return send(res, 200, { applications, counts, profileAvailable: await readFile(path.join(repoRoot, "CLAUDE.md"), "utf8").then(() => true).catch(() => false) });
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/applications/")) {
      const slug = decodeURIComponent(url.pathname.slice("/api/applications/".length));
      try {
        return send(res, 200, await readApplication(repoRoot, slug));
      } catch (error) {
        return send(res, error.code === "ENOENT" ? 404 : 400, { error: error.message });
      }
    }
    if (req.method === "POST" && url.pathname === "/api/guard") {
      checkOrigin(req);
      const body = await readJson(req);
      if (typeof body.postingText !== "string" || !body.postingText.trim()) {
        return send(res, 400, { error: "Paste the job posting text before running the guard." });
      }
      return send(res, 200, await runPostingGuard(body.postingText));
    }
    if (req.method === "POST" && url.pathname === "/api/applications") {
      checkOrigin(req);
      const body = await readJson(req);
      if (typeof body.postingText !== "string" || !body.postingText.trim()) {
        return send(res, 400, { error: "Paste the job posting text before saving a draft." });
      }
      const guarded = await runPostingGuard(body.postingText);
      const application = await createDraft(repoRoot, body, guarded);
      return send(res, 201, { application });
    }
    return send(res, 404, { error: "Route not found." });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Unexpected local service error." });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Local application API listening at http://127.0.0.1:${port}\n`);
});
