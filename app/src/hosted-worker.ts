import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import https from "node:https";
import crypto from "node:crypto";
import { confirmedContactFromProfile } from "../convex/shared/document_builders.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const APP_ROOT = resolve(ROOT, "app");
const BODY_LIMIT = 10 * 1024 * 1024;
const PAGE_LIMIT = 2 * 1024 * 1024;
const seenNonces = new Map<string, number>();

function json(res: any, status: number, value: unknown) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(body);
}

async function readBody(req: any) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new Error("Worker request is too large.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function publicIp(ip: string) {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower.startsWith("::ffff:")) return publicIp(lower.slice(7));
    const first = Number.parseInt(lower.split(":")[0] || "0", 16);
    if (first < 0x2000 || first > 0x3fff) return false;
    if (["2001:db8:", "2001:10:", "2001:20:", "2002:", "3fff:"].some((prefix) => lower.startsWith(prefix))) return false;
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113)) return false;
  return true;
}

async function validateExternalUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Only public HTTPS links are fetched.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Local network destinations are blocked.");
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => !publicIp(item.address))) throw new Error("The link resolves to a private or reserved network address and was blocked.");
  return { url, address: addresses[0] };
}

function httpsGetOnce(url: URL, address: any) {
  return new Promise<any>((resolvePromise, reject) => {
    const req = https.request({
      protocol: "https:", hostname: url.hostname, port: 443,
      path: `${url.pathname || "/"}${url.search}`, method: "GET", servername: url.hostname,
      headers: { "user-agent": "AI-Job-Search-Hosted/1.0", accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-encoding": "identity" },
      lookup: (_host: string, options: any, callback: any) => options?.all ? callback(null, [address]) : callback(null, address.address, address.family),
    }, (response) => {
      const chunks: Buffer[] = []; let size = 0;
      response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > PAGE_LIMIT) req.destroy(new Error("Page exceeds the 2 MB response limit.")); else chunks.push(chunk); });
      response.on("end", () => resolvePromise({ status: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    req.setTimeout(15_000, () => req.destroy(new Error("Page request timed out.")));
    req.on("error", reject);
    req.end();
  });
}

async function runPython(script: string, payload?: unknown, args: string[] = []) {
  const base = resolve(tmpdir(), `hosted-worker-${crypto.randomUUID()}`);
  const input = `${base}.in.json`; const output = `${base}.out.json`;
  if (payload !== undefined) await writeFile(input, JSON.stringify(payload), "utf8");
  try {
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolvePromise, reject) => {
      const child = spawn(process.env.PYTHON || "python", [resolve(APP_ROOT, script), ...(payload !== undefined ? ["--input-file", input, "--output-file", output] : args)], { cwd: ROOT, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("error", reject);
      child.on("close", (code) => resolvePromise({ code: code || 0, stdout, stderr }));
    });
    if (payload === undefined) {
      if (result.code !== 0) throw new Error(result.stderr.slice(-1000) || "PDF validation failed.");
      return result.stdout;
    }
    const raw = await readFile(output, "utf8");
    const parsed = JSON.parse(raw);
    if (result.code !== 0 || parsed.error) throw new Error(parsed.error || `Python helper ${script} failed.`);
    return parsed;
  } finally { await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})]); }
}

async function robotsAllowed(url: URL) {
  const robotsUrl = new URL("/robots.txt", url.origin);
  const { url: validated, address } = await validateExternalUrl(robotsUrl.href);
  const response = await httpsGetOnce(validated, address);
  const decision = await runPython("scripts/robots_decision.py", { url: url.href, status: response.status, text: response.body.toString("utf8") });
  if (!decision.allowed) throw new Error(`${decision.reason}: ${url.href}`);
}

async function safeFetchPage(input: string, redirects = 0): Promise<any> {
  const { url, address } = await validateExternalUrl(input);
  await robotsAllowed(url);
  const response = await httpsGetOnce(url, address);
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 5) throw new Error("Page exceeded the redirect limit.");
    const location = response.headers.location;
    if (!location) throw new Error("Page redirected without a Location header.");
    return safeFetchPage(new URL(location, url).href, redirects + 1);
  }
  return { url: url.href, status: response.status, headers: response.headers, body: response.body };
}

async function guard(content: string | Buffer, mode: "html" | "text") {
  return await runPython("scripts/guard_posting.py", mode === "html" ? { contentBase64: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(content).toString("base64"), mode } : { content: String(content), mode });
}

async function preparePosting(input: { mode: string; content: string }) {
  const mode = input.mode === "url" ? "url" : "text";
  let content = String(input.content || "").trim();
  let sourceUrl = "";
  let pageLinks: string[] = [];
  let guardResult: any;
  if (mode === "url") {
    const fetched = await safeFetchPage(content);
    sourceUrl = fetched.url;
    if (fetched.status < 200 || fetched.status >= 400) throw new Error(`Posting URL returned HTTP ${fetched.status}.`);
    guardResult = await guard(fetched.body, "html");
    pageLinks = (await runPython("scripts/extract_visible_links.py", { html: guardResult.decodedHtml || fetched.body.toString("utf8"), baseUrl: sourceUrl })).links;
    content = guardResult.cleanedText;
  } else guardResult = await guard(content, "text");
  if (mode === "text") content = guardResult.cleanedText;
  if (!content.trim()) throw new Error("No readable posting text was returned.");
  const literal = content.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const urls = [...new Set([...pageLinks, ...literal.map((link) => link.replace(/[.,;:!?]+$/g, ""))])].filter((url) => url !== sourceUrl).slice(0, 50);
  const linkedSources: Array<{ url: string; text: string; verdict: string }> = [];
  const linkErrors: Array<{ url: string; error: string }> = [];
  for (let offset = 0; offset < urls.length; offset += 5) {
    const batch = await Promise.all(urls.slice(offset, offset + 5).map(async (link) => {
      try {
        const fetched = await safeFetchPage(link);
        if (fetched.status < 200 || fetched.status >= 400) throw new Error(`HTTP ${fetched.status}`);
        const scanned = await guard(fetched.body, "html");
        return { source: { url: fetched.url, text: scanned.cleanedText.slice(0, 8_000), verdict: scanned.findings.verdict } };
      } catch (error: any) { return { error: { url: link, error: String(error.message || error).slice(0, 300) } }; }
    }));
    for (const result of batch) {
      if (result.source) linkedSources.push(result.source);
      else if (result.error) linkErrors.push(result.error);
    }
  }
  return { posting: content.slice(0, 60_000), sourceUrl, guard: guardResult.findings, linksFound: urls.length, linksFetched: linkedSources.length, linkedSources, linkErrors };
}

async function renderPdf(type: "cv" | "cover-letter", documents: any, profile: string) {
  const base = resolve(tmpdir(), `hosted-pdf-${crypto.randomUUID()}`);
  const input = `${base}.json`; const output = `${base}.pdf`;
  const contact = confirmedContactFromProfile(profile);
  await writeFile(input, JSON.stringify({ type, cvDocument: documents.cvDocument, coverLetterDocument: documents.coverLetterDocument, contact }), "utf8");
  try {
    const result = await new Promise<number>((resolvePromise, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", resolve(APP_ROOT, "src/pdf/render-application-pdf.tsx"), "--input-file", input, "--output-file", output], { cwd: APP_ROOT, windowsHide: true, stdio: "ignore" });
      const timer = setTimeout(() => child.kill(), 120_000);
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("close", (code) => { clearTimeout(timer); resolvePromise(code || 0); });
    });
    if (result !== 0) throw new Error("PDF rendering failed.");
    const info = await stat(output);
    if (info.size < 500 || info.size > 15 * 1024 * 1024) throw new Error("PDF output is empty or larger than 15 MB.");
    const bytes = await readFile(output);
    const required = [documents.cvDocument.fullName, ...(contact.phones || []), ...(contact.portfolioUrl ? [contact.portfolioUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")] : [])];
    const verification = await runPython("../tools/verify_pdf.py", undefined, [output, ...required.flatMap((value) => ["--contains", value])]);
    const pages = Number(String(verification).match(/pages:\s*(\d+)/i)?.[1] || 0);
    if (pages < 1 || pages > (type === "cv" ? 2 : 1)) throw new Error(`${type} PDF must be 1-${type === "cv" ? 2 : 1} page(s); found ${pages}.`);
    return bytes;
  } finally { await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})]); }
}

async function verifyRequest(req: any, body: Buffer) {
  const secret = process.env.APP_WORKER_SECRET;
  if (!secret) throw new Error("Worker authentication is not configured.");
  const timestamp = req.headers["x-worker-timestamp"];
  const nonce = req.headers["x-worker-nonce"];
  const signature = req.headers["x-worker-signature"];
  if (typeof timestamp !== "string" || typeof nonce !== "string" || typeof signature !== "string") throw new Error("Unauthorized worker request.");
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > 60_000 || nonce.length > 100) throw new Error("Unauthorized worker request.");
  for (const [key, until] of seenNonces) if (until < Date.now()) seenNonces.delete(key);
  if (seenNonces.has(nonce)) throw new Error("Worker request was already used.");
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.`).update(body).digest("hex");
  const left = Buffer.from(signature, "hex"); const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error("Unauthorized worker request.");
  seenNonces.set(nonce, Date.now() + 60_000);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "POST" || !["/posting/prepare", "/pdf/render"].includes(new URL(req.url || "/", "http://localhost").pathname)) return json(res, 404, { error: "Not found." });
    const body = await readBody(req);
    await verifyRequest(req, body);
    const path = new URL(req.url || "/", "http://localhost").pathname;
    const input = JSON.parse(body.toString("utf8"));
    if (path === "/posting/prepare") return json(res, 200, await preparePosting(input));
    const cv = await renderPdf("cv", input.documents, input.profile);
    const cover = await renderPdf("cover-letter", input.documents, input.profile);
    return json(res, 200, { cvPdf: cv.toString("base64"), coverLetterPdf: cover.toString("base64") });
  } catch (error: any) {
    const status = String(error.message || "").startsWith("Unauthorized") || String(error.message || "").startsWith("Worker authentication") ? 401 : 400;
    json(res, status, { error: String(error.message || "Worker request failed.").slice(0, 800) });
  }
});

const port = Number(process.env.PORT || 4180);
server.listen(port, "0.0.0.0", () => console.log(`Northstar private worker listening on ${port}`));
