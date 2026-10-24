import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..", "..");
const guardPath = path.join(repoRoot, "tools", "posting_guard.py");

export function runPostingGuard(text) {
  const python = process.env.PYTHON_EXECUTABLE || (process.platform === "win32" ? "python" : "python3");
  return new Promise((resolve, reject) => {
    const child = spawn(python, [guardPath, "--text", "--json"], {
      cwd: repoRoot,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || "Posting guard failed."));
      try {
        const findingsMarker = "--- findings ---\n";
        const textMarker = "\n--- text ---\n";
        const start = stdout.indexOf(findingsMarker);
        const end = stdout.indexOf(textMarker, start + findingsMarker.length);
        if (start < 0 || end < 0) throw new Error("Posting guard returned an unexpected result.");
        const verdict = stdout.slice(0, start).trim();
        const findings = JSON.parse(stdout.slice(start + findingsMarker.length, end));
        const cleaned = stdout.slice(end + textMarker.length).trim();
        resolve({ verdict, findings, cleaned });
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(text, "utf8");
  });
}
