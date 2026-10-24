import type { ApplicationDetail, ApplicationRow, GuardResult } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

export function fetchApplications() {
  return request<{ applications: ApplicationRow[]; counts: Record<string, number>; profileAvailable: boolean }>("/api/applications");
}

export function fetchApplication(slug: string) {
  return request<ApplicationDetail>(`/api/applications/${encodeURIComponent(slug)}`);
}

export function checkPosting(postingText: string) {
  return request<GuardResult>("/api/guard", { method: "POST", body: JSON.stringify({ postingText }) });
}

export function createApplication(input: {
  company: string;
  role: string;
  location: string;
  jobUrl: string;
  postingText: string;
}) {
  return request<{ application: ApplicationRow }>("/api/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
