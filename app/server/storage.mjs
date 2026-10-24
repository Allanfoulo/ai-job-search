import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const TRACKER_HEADER = [
  "date",
  "company",
  "sector",
  "role",
  "role_type",
  "channel",
  "status",
  "contact_person",
  "fit_rating",
  "notes",
  "cv_file",
  "cover_letter_file",
  "source",
  "deadline",
];

const FINAL_STATUSES = new Set([
  "hired",
  "rejected",
  "no_response",
  "offer_declined",
  "withdrawn",
]);

export function makeSlug(company, role) {
  const clean = (value) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const slug = `${clean(company)}_${clean(role)}`.replace(/_+/g, "_");
  if (!slug || slug === "_") throw new Error("Company and role must include letters or numbers.");
  return slug;
}

function readRows(csvText) {
  if (!csvText.trim()) return { headers: [...TRACKER_HEADER], rows: [] };
  const records = parse(csvText, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });
  if (!records.length) return { headers: [...TRACKER_HEADER], rows: [] };
  const headers = records[0].map((value) => String(value).trim());
  const rows = records.slice(1).map((record) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = record[index] ?? "";
    });
    return row;
  });
  if (!headers.includes("deadline")) headers.push("deadline");
  for (const required of TRACKER_HEADER) {
    if (!headers.includes(required)) {
      throw new Error(`Tracker is missing the required '${required}' column.`);
    }
  }
  return { headers, rows };
}

async function loadTracker(repoRoot) {
  const trackerPath = path.join(repoRoot, "job_search_tracker.csv");
  try {
    const csvText = await readFile(trackerPath, "utf8");
    return { trackerPath, ...readRows(csvText) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { trackerPath, headers: [...TRACKER_HEADER], rows: [] };
    }
    throw error;
  }
}

export async function listApplications(repoRoot) {
  const { rows } = await loadTracker(repoRoot);
  return rows
    .filter((row) => row.company || row.role)
    .map((row) => ({
      ...row,
      slug: row.company && row.role ? makeSlug(row.company, row.role) : "",
    }));
}

function guardCounts(findings = {}) {
  return {
    hidden_blocks: findings.hidden_blocks?.length ?? 0,
    instruction_like: findings.instruction_like?.length ?? 0,
    hidden_urls: findings.hidden_urls?.length ?? 0,
    invisible_characters: findings.invisible_flagged ?? 0,
    mixed_script_words: findings.homoglyph_runs?.length ?? 0,
  };
}

function trackerCsv(headers, rows) {
  return stringify([headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function createDraft(repoRoot, input, guarded) {
  const company = input.company.trim();
  const role = input.role.trim();
  const location = (input.location ?? "").trim();
  const jobUrl = (input.jobUrl ?? "").trim();
  if (!company || !role) throw new Error("Company and role are required.");
  if (!guarded.cleaned?.trim()) throw new Error("The cleaned posting is empty.");
  if (jobUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(jobUrl);
    } catch {
      throw new Error("Enter a valid HTTPS job posting URL.");
    }
    if (parsedUrl.protocol !== "https:") throw new Error("Job posting links must use HTTPS.");
  }

  const slug = makeSlug(company, role);
  const archiveRoot = path.resolve(repoRoot, "documents", "applications");
  const archivePath = path.resolve(archiveRoot, slug);
  if (!archivePath.startsWith(`${archiveRoot}${path.sep}`)) {
    throw new Error("Invalid application archive path.");
  }
  if (await exists(archivePath)) {
    throw new Error("An archive already exists for this company and role. Open that application instead of overwriting it.");
  }

  const { trackerPath, headers, rows } = await loadTracker(repoRoot);
  const matchingOpen = rows.some(
    (row) =>
      row.company?.trim().toLowerCase() === company.toLowerCase() &&
      row.role?.trim().toLowerCase() === role.toLowerCase() &&
      !FINAL_STATUSES.has(row.status?.trim().toLowerCase()),
  );
  if (matchingOpen) {
    throw new Error("An open tracker entry already exists for this company and role.");
  }

  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const row = Object.fromEntries(headers.map((header) => [header, ""]));
  Object.assign(row, {
    date,
    company,
    role,
    status: "drafted",
    notes: "Created in local application UI",
    source: jobUrl,
  });

  const archiveId = `.local-ui-${randomUUID()}`;
  const stagedArchive = path.join(archiveRoot, archiveId);
  const stagedTracker = `${trackerPath}.${archiveId}.tmp`;
  const counts = guardCounts(guarded.findings);
  const posting = `${guarded.cleaned.trim()}\n\n## posting_guard\n\nVerdict: ${guarded.verdict}\n\n` +
    Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join("\n") + "\n";
  const metadata = {
    company,
    role,
    location,
    jobUrl,
    status: "drafted",
    createdAt: now.toISOString(),
    postingGuard: { verdict: guarded.verdict, counts },
  };

  await mkdir(archiveRoot, { recursive: true });
  try {
    await mkdir(stagedArchive);
    await writeFile(path.join(stagedArchive, "job_posting.md"), posting, { encoding: "utf8", flag: "wx" });
    await writeFile(path.join(stagedArchive, "application.json"), `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await writeFile(stagedTracker, trackerCsv(headers, [...rows, row]), { encoding: "utf8", flag: "wx" });
    await rename(stagedArchive, archivePath);
    try {
      await rename(stagedTracker, trackerPath);
    } catch (error) {
      await rm(archivePath, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    await rm(stagedArchive, { recursive: true, force: true });
    await rm(stagedTracker, { force: true });
    throw error;
  }

  return { ...row, slug, location, jobUrl, createdAt: now.toISOString() };
}

export async function readApplication(repoRoot, slug) {
  if (!/^[a-z0-9_]+$/.test(slug)) throw new Error("Invalid application identifier.");
  const archiveRoot = path.resolve(repoRoot, "documents", "applications");
  const archivePath = path.resolve(archiveRoot, slug);
  if (!archivePath.startsWith(`${archiveRoot}${path.sep}`)) throw new Error("Invalid application path.");
  const [posting, metadataResult] = await Promise.all([
    readFile(path.join(archivePath, "job_posting.md"), "utf8"),
    readFile(path.join(archivePath, "application.json"), "utf8").then(
      (text) => ({ text }),
      (error) => ({ error }),
    ),
  ]);
  if (metadataResult.error && metadataResult.error.code !== "ENOENT") throw metadataResult.error;
  if (!metadataResult.error) return { ...JSON.parse(metadataResult.text), slug, posting };

  const { rows } = await loadTracker(repoRoot);
  const row = rows.find((item) => item.company && item.role && makeSlug(item.company, item.role) === slug);
  if (!row) throw Object.assign(new Error("Application metadata was not found."), { code: "ENOENT" });
  return {
    ...row,
    slug,
    jobUrl: row.source || "",
    location: "",
    posting,
  };
}
