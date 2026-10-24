import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDraft, listApplications, readApplication, TRACKER_HEADER } from "./storage.mjs";

async function withRepo(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "job-search-ui-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const guarded = {
  verdict: "clean",
  cleaned: "Senior software engineer. Build reliable systems.",
  findings: {},
};

test("creates an archived local draft and standard tracker row", async () => {
  await withRepo(async (root) => {
    const saved = await createDraft(root, {
      company: "Example Co",
      role: "AI Engineer",
      location: "Remote",
      jobUrl: "https://example.com/jobs/ai",
    }, guarded);
    assert.equal(saved.status, "drafted");
    assert.equal(saved.slug, "example_co_ai_engineer");
    assert.deepEqual(Object.keys((await listApplications(root))[0]).slice(0, TRACKER_HEADER.length), TRACKER_HEADER);
    const detail = await readApplication(root, saved.slug);
    assert.match(detail.posting, /Verdict: clean/);
    assert.equal(detail.jobUrl, "https://example.com/jobs/ai");
  });
});

test("rejects non-HTTPS posting links", async () => {
  await withRepo(async (root) => {
    await assert.rejects(
      createDraft(root, { company: "Example", role: "Engineer", jobUrl: "javascript:alert(1)" }, guarded),
      /HTTPS/,
    );
  });
});

test("does not overwrite an existing archive or duplicate open tracker entry", async () => {
  await withRepo(async (root) => {
    await createDraft(root, { company: "Example", role: "Engineer" }, guarded);
    await assert.rejects(createDraft(root, { company: "Example", role: "Engineer" }, guarded), /archive already exists/);
  });
});

test("opens legacy archives without application.json using the tracker row", async () => {
  await withRepo(async (root) => {
    const archive = path.join(root, "documents", "applications", "legacy_co_analyst");
    await mkdir(archive, { recursive: true });
    await writeFile(path.join(archive, "job_posting.md"), "Old archived posting", "utf8");
    const tracker = [TRACKER_HEADER.join(","), "2026-10-01,Legacy Co,Technology,Analyst,Full-time,LinkedIn,drafted,,,,,,https://example.com,\n"].join("\n");
    await writeFile(path.join(root, "job_search_tracker.csv"), tracker, "utf8");
    const detail = await readApplication(root, "legacy_co_analyst");
    assert.equal(detail.company, "Legacy Co");
    assert.equal(detail.posting, "Old archived posting");
  });
});
