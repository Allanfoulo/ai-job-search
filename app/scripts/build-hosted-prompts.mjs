import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const entries = {
  evaluation: ["../.claude/skills/job-application-assistant/04-job-evaluation.md", "../.claude/skills/job-application-assistant/09-web-research.md"],
  drafting: ["../.claude/commands/apply.md", "../.claude/skills/job-application-assistant/03-writing-style.md", "../.claude/skills/job-application-assistant/05-cv-templates.md", "../.claude/skills/job-application-assistant/06-cover-letter-templates.md", "../.claude/skills/job-application-assistant/08-application-forms.md"],
  interview: ["../.claude/skills/job-application-assistant/07-interview-prep.md"],
};

async function source(paths) {
  return (await Promise.all(paths.map(async (path) => {
    const absolute = resolve(process.cwd(), path);
    return `## CANONICAL SOURCE ${path}\n${await readFile(absolute, "utf8")}`;
  }))).join("\n\n");
}

const values = {
  evaluationRules: await source(entries.evaluation),
  draftingRules: await source(entries.drafting),
  interviewRules: await source(entries.interview),
  cvTemplate: await readFile(resolve(process.cwd(), "../cv/main_example.tex"), "utf8"),
  coverLetterTemplate: await readFile(resolve(process.cwd(), "../cover_letters/cover_example.tex"), "utf8"),
};
const output = `// Generated from repository sources. Edit the canonical files under .claude/ and rerun the prompt build.\n${Object.entries(values).map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`).join("\n")}\n`;
await writeFile(resolve(process.cwd(), "convex/prompts.generated.ts"), output, "utf8");
console.log("Generated Convex prompt and template assets from the canonical repository sources.");
