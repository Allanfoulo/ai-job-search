import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type ViewName = "overview" | "applications" | "profile" | "settings" | "new";
type AppRecord = {
  _id: Id<"applications">; date: string; company: string; role: string; status: string; fit_rating: string;
  deadline: string; notes: string; sector: string; role_type: string; channel: string; source: string;
};

const statusOptions = ["drafted", "applied", "interview", "offer", "hired", "rejected", "no_response", "offer_declined", "withdrawn"];
const labelStatus = (status: string) => status.replaceAll("_", " ");
const formatDate = (value: string) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <div className="auth-loading"><span className="spinner" />Loading sign-in…</div>;
  if (!isAuthenticated) return <AuthScreen />;
  return <Workspace />;
}

function AuthScreen() {
  const { signIn } = useAuthActions();
  const initialInviteCode = new URLSearchParams(window.location.hash.slice(1)).get("invite") || new URLSearchParams(window.location.search).get("invite") || "";
  const [mode, setMode] = useState<"signIn" | "signUp">(initialInviteCode ? "signUp" : "signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await signIn("password", { email, password, flow: mode, ...(mode === "signUp" ? { inviteCode } : {}) });
      if (!result) setError("Sign-in was not completed. Check your details and invite code.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed. Check your details and try again."); }
    finally { setBusy(false); }
  }
  return <main className="auth-screen"><section className="auth-brand"><div className="brand-mark">N</div><span>NORTHSTAR</span><p>A clearer view of your job search.</p><div className="auth-brand-note"><span className="status-dot" /> Private workspace for your next move</div></section><section className="auth-card"><h1>{mode === "signUp" ? "Create your account." : "Welcome back."}</h1><p>{mode === "signUp" ? "Use your invited email and private code. The owner uses their configured email and owner setup code." : "Sign in to your private application workspace."}</p><form className="auth-form" onSubmit={submit}><label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{mode === "signUp" && <label className="field"><span>Invitation or owner setup code</span><input className="input" autoComplete="one-time-code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} /></label>}<label className="field"><span>Password</span><input className="input" type="password" autoComplete={mode === "signUp" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="notice danger compact">{error}</div>}<button className="button button-primary full-width" disabled={busy}>{busy ? "Please wait…" : mode === "signUp" ? "Create private workspace" : "Sign in"}</button></form><button className="link-button auth-switch" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}>{mode === "signUp" ? "Already have an account? Sign in" : "Have an invitation? Create an account"}</button></section></main>;
}

function Workspace() {
  const user = useQuery(api.users.current, {}) as { name: string; email: string } | null | undefined;
  const { signOut } = useAuthActions();
  const [view, setView] = useState<ViewName>("overview");
  const [notice, setNotice] = useState("");
  return <>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="#overview"><span className="brand-mark">N</span><span><strong>Northstar</strong><small>APPLICATION WORKSPACE</small></span></a>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <nav className="main-nav" aria-label="Main navigation">
            <NavButton view="overview" active={view} onClick={setView} icon="overview">Overview</NavButton>
            <NavButton view="applications" active={view} onClick={setView} icon="applications">Applications</NavButton>
            <NavButton view="profile" active={view} onClick={setView} icon="profile">Candidate profile</NavButton>
            <NavButton view="settings" active={view} onClick={setView} icon="settings">Settings</NavButton>
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card"><strong>A little more focused.</strong><p>Your workspace is private to your account.</p></div>
            <div className="profile-chip"><div className="avatar">{(user?.name?.[0] || user?.email?.[0] || "N").toUpperCase()}</div><div className="user-identity"><strong>{user?.name || "Your workspace"}</strong><small>Private workspace</small></div><button className="text-button" onClick={() => void signOut()}>Sign out</button></div>
          </div>
        </aside>
        <main className="main-area">
          <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><strong>{view === "profile" ? "Candidate profile" : view[0].toUpperCase() + view.slice(1)}</strong></div><div className="topbar-actions"><span className="cloud-indicator"><i /> Private cloud workspace</span><div className="avatar small">{(user?.name?.[0] || "N").toUpperCase()}</div></div></header>
          <section className="view" aria-live="polite">{view === "overview" ? <Overview setView={setView} /> : view === "applications" ? <Applications notice={setNotice} setView={setView} /> : view === "profile" ? <Profile notice={setNotice} /> : view === "settings" ? <Settings notice={setNotice} /> : <NewApplication notice={setNotice} setView={setView} />}</section>
        </main>
      </div>
      <div className={`toast ${notice ? "show" : ""}`} role="status">{notice}</div>
  </>;
}

function NavButton({ view, active, onClick, icon, children }: { view: ViewName; active: ViewName; onClick: (view: ViewName) => void; icon: string; children: string }) {
  return <button className={`nav-item ${active === view ? "active" : ""}`} onClick={() => onClick(view)}><span className="nav-icon" aria-hidden="true"><NavIcon name={icon} /></span>{children}</button>;
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4" rx="1.5" /><rect x="13.5" y="10.5" width="7" height="10" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    applications: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.4 3.1-5.2 7-5.2s6.3 1.8 7 5.2" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8-.1 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.1l-.2.1-1.7-2.9.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1H5v-3.4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8.1 1.7 1.7 0 0 0 1-1.5v-.2h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.1l.2-.1 1.7 2.9-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2V14h-.2a1.7 1.7 0 0 0-1.4 1Z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">{paths[name] || paths.overview}</svg>;
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ setView }: { setView: (view: ViewName) => void }) {
  const applications = useQuery(api.applications.listMine, {}) as AppRecord[] | undefined;
  const profile = useQuery(api.profiles.getMine, {}) as { markdown: string; revision: number } | null | undefined;
  if (applications === undefined || profile === undefined) return <Loading />;
  const active = applications.filter((row) => !["hired", "rejected", "no_response", "offer_declined", "withdrawn"].includes(row.status)).length;
  const interviews = applications.filter((row) => row.status === "interview").length;
  const recent = applications.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const ready = Boolean(profile?.markdown.trim());
  return <>
    <PageHeading title="Good to see you." description="A clear view of where things stand and what you can do next." />
    <section className="next-action"><div><span className="next-action-label">NEXT UP</span><h2>Start a tailored application</h2><p>Add a posting, review its sources, then shape your application pack.</p></div><button className="button button-light" onClick={() => setView("new")}>Begin application <span aria-hidden="true">-&gt;</span></button></section>
    <div className="stats-grid"><Stat title="Active applications" value={active} caption="Roles still in progress" /><Stat title="Interviews" value={interviews} caption="Conversations underway" /><Stat title="Total tracked" value={applications.length} caption="Applications in your workspace" /></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-header"><div><div className="panel-title">Recent applications</div><div className="panel-subtitle">Your latest roles and their current stage</div></div><button className="link-button" onClick={() => setView("applications")}>View all applications</button></div><ApplicationTable rows={recent} /></section><section className="panel"><div className="panel-header"><div><div className="panel-title">Profile readiness</div><div className="panel-subtitle">Candidate details used by application drafts</div></div></div><div className="progress-card"><div className="progress-line"><span>Canonical profile</span><strong>{ready ? "Ready to review" : "Needs setup"}</strong></div><div className="progress-track"><span style={{ width: ready ? "100%" : "12%" }} /></div><small>{ready ? "Your profile is saved to your private workspace." : "Add or import your profile before preparing applications."}</small><button className="button button-secondary full-width" onClick={() => setView("profile")}>Open candidate profile</button></div></section></div>
    <div className="notice info"><strong>Private by account</strong><span>Invited collaborators get their own workspace. They cannot see your profile, applications, or files.</span></div>
  </>;
}

function Stat({ title, value, caption }: { title: string; value: number; caption: string }) {
  return <article className="stat-card"><div className="stat-top">{title}</div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>;
}

function ApplicationTable({ rows }: { rows: AppRecord[] }) {
  if (!rows.length) return <div className="empty-state"><strong>No applications yet</strong><p>Add a role to begin tracking your search.</p></div>;
  return <div className="table-wrap"><table className="table"><thead><tr><th>Role</th><th>Status</th><th>Added</th><th>Fit</th><th>Deadline</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id}><td><div className="role-name">{row.role}</div><div className="company-name">{row.company}</div></td><td><span className={`status-pill status-${row.status}`}>{labelStatus(row.status)}</span></td><td>{formatDate(row.date)}</td><td>{row.fit_rating || "—"}</td><td>{formatDate(row.deadline)}</td></tr>)}</tbody></table></div>;
}

function Applications({ notice, setView }: { notice: (message: string) => void; setView: (view: ViewName) => void }) {
  const rows = useQuery(api.applications.listMine, {}) as AppRecord[] | undefined;
  const create = useMutation(api.applications.createMine);
  const updateStatus = useMutation(api.applications.updateStatus);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => (rows || []).filter((row) => `${row.company} ${row.role}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  if (!rows) return <Loading />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await create({
        date: new Date().toISOString().slice(0, 10), company: String(data.get("company") || "").trim(), role: String(data.get("role") || "").trim(),
        sector: "", role_type: "", channel: "", status: "drafted", contact_person: "", fit_rating: "", notes: "", cv_file: "", cover_letter_file: "", source: "", deadline: String(data.get("deadline") || ""),
      });
      setCreating(false); notice("Application added.");
    } catch (error) { notice(error instanceof Error ? error.message : "Could not add application."); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading title="Applications" description="Track every role from first draft through final outcome." action={<div className="button-row"><button className="button button-primary" onClick={() => setView("new")}>New application pack</button><button className="button button-secondary" onClick={() => setCreating((value) => !value)}>Quick add</button></div>} />
    {creating && <section className="panel form-panel"><div className="panel-header"><div><div className="panel-title">Add a role</div><div className="panel-subtitle">Application documents and AI drafting are in the next migration slice.</div></div><button className="icon-button" onClick={() => setCreating(false)} aria-label="Close"><NavIcon name="close" /></button></div><form className="application-form" onSubmit={submit}><label className="field"><span>Company</span><input name="company" required maxLength={120} placeholder="Company name" /></label><label className="field"><span>Role title</span><input name="role" required maxLength={160} placeholder="Role title" /></label><label className="field"><span>Deadline <small>(optional)</small></span><input name="deadline" type="date" /></label><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save application"}</button></form></section>}
    <section className="panel"><div className="panel-header"><div><div className="panel-title">All applications</div><div className="panel-subtitle">{rows.length} roles in your private workspace</div></div><input className="input search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles or companies" /></div>{!filtered.length ? <div className="empty-state"><strong>{rows.length ? "No matching roles" : "No applications yet"}</strong><p>{rows.length ? "Try a different search." : "Add a role to start your tracker."}</p></div> : <div className="table-wrap"><table className="table"><thead><tr><th>Role</th><th>Status</th><th>Added</th><th>Fit</th><th>Deadline</th></tr></thead><tbody>{filtered.map((row) => <tr key={row._id}><td><div className="role-name">{row.role}</div><div className="company-name">{row.company}</div></td><td><select aria-label={`Status for ${row.role} at ${row.company}`} className={`status-select status-${row.status}`} value={row.status} onChange={async (event) => { try { await updateStatus({ applicationId: row._id as never, status: event.target.value }); notice("Application status updated."); } catch (error) { notice(error instanceof Error ? error.message : "Could not update status."); } }}>{statusOptions.map((status) => <option key={status} value={status}>{labelStatus(status)}</option>)}</select></td><td>{formatDate(row.date)}</td><td>{row.fit_rating || "—"}</td><td>{formatDate(row.deadline)}</td></tr>)}</tbody></table></div>}</section>
    {rows.length > 0 && <FileLibrary applications={rows} notice={notice} />}
  </>;
}

function FileLibrary({ applications, notice }: { applications: AppRecord[]; notice: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(applications[0]._id);
  const files = useQuery(api.files.listMine, selectedId ? { applicationId: selectedId as never } : "skip") as Array<{ _id: string; fileName: string; contentType: string; byteLength: number }> | undefined;
  const uploadUrl = useMutation(api.files.uploadUrl);
  const attach = useMutation(api.files.attach);
  const remove = useMutation(api.files.removeMine);
  const token = useAuthToken();
  const selected = applications.find((row) => row._id === selectedId) || applications[0];
  async function upload(file?: File) {
    if (!file || !selected) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Files must be smaller than 25 MB.");
      const url = await uploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error("File upload did not complete.");
      const { storageId } = await response.json();
      await attach({ applicationId: selected._id as never, storageId, fileName: file.name, artifactType: file.name.split(" - ").at(-1)?.replace(/\.[^.]+$/, "") || "Application file", contentType: file.type || "application/octet-stream", byteLength: file.size });
      notice("File saved to your private workspace.");
    } catch (error) { notice(error instanceof Error ? error.message : "Could not upload file."); }
  }
  async function download(fileId: string, fileName: string) {
    try {
      if (!token) throw new Error("Sign in again to download this file.");
      const base = import.meta.env.VITE_CONVEX_SITE_URL;
      const response = await fetch(`${base}/private-files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("File could not be downloaded.");
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = fileName; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) { notice(error instanceof Error ? error.message : "Could not download file."); }
  }
  return <section className="panel"><div className="panel-header"><div><div className="panel-title">Application files</div><div className="panel-subtitle">Private uploads and generated documents for a role</div></div><select className="input role-picker" value={selected._id} onChange={(event) => setSelectedId(event.target.value as Id<"applications">)}>{applications.map((row) => <option key={row._id} value={row._id}>{row.role} · {row.company}</option>)}</select></div><div className="file-list">{files === undefined ? <Loading /> : !files.length ? <p className="subtle">No files saved for this role yet.</p> : files.map((file) => <div className="file-row" key={file._id}><div className="file-type">{file.contentType === "application/pdf" ? "PDF" : "FILE"}</div><div className="file-name"><strong>{file.fileName}</strong><small>{Math.max(1, Math.round(file.byteLength / 1024))} KB</small></div><button className="link-button" onClick={() => download(file._id, file.fileName)}>Download</button><button className="text-button" onClick={async () => { try { await remove({ fileId: file._id as never }); notice("File removed."); } catch (error) { notice(error instanceof Error ? error.message : "Could not remove file."); } }}>Remove</button></div>)}</div><label className="button button-secondary upload-button"><input type="file" accept=".pdf,.tex,.md,.txt" onChange={(event) => upload(event.currentTarget.files?.[0])} />＋ Add a file <small>PDF, LaTeX, Markdown, or text · max 25 MB</small></label></section>;
}

function redactContacts(value: string) {
  return value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email redacted]").replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone number redacted]");
}

function NewApplication({ notice, setView }: { notice: (message: string) => void; setView: (view: ViewName) => void }) {
  const applications = useQuery(api.applications.listMine, {}) as AppRecord[] | undefined;
  const create = useMutation(api.applications.createMine);
  const prepare = useAction(api.hostedActions.preparePosting);
  const assessFit = useAction(api.hostedActions.assessFit);
  const generate = useAction(api.hostedActions.generatePack);
  const profile = useQuery(api.profiles.getMine, {}) as { markdown: string } | null | undefined;
  const [stage, setStage] = useState<"posting" | "review" | "fit" | "draft" | "complete">("posting");
  const [mode, setMode] = useState<"url" | "text">("url");
  const [applicationId, setApplicationId] = useState<Id<"applications"> | null>(null);
  const workflow = useQuery(api.workflows.getMine, applicationId ? { applicationId: applicationId as never } : "skip") as any;
  const [prepared, setPrepared] = useState<any>(null);
  const [fit, setFit] = useState<any>(null);
  const [fitConsent, setFitConsent] = useState(false);
  const [draftConsent, setDraftConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [postingContent, setPostingContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profileText = profile?.markdown || "";
  const postingData = prepared || workflow;
  const assessment = fit || workflow?.fitAssessment;
  const allowed = assessment && assessment.proceedAllowed !== false && String(assessment.proceedAllowed ?? assessment.proceed_allowed).toLowerCase() !== "false";

  async function submitPosting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const nextCompany = String(data.get("company") || "").trim();
    const nextRole = String(data.get("role") || "").trim();
    const content = String(data.get("posting") || "").trim();
    setPostingContent(content);
    setCompany(nextCompany); setRole(nextRole);
    try {
      const existing = applications?.find((row) => row.company.toLowerCase() === nextCompany.toLowerCase() && row.role.toLowerCase() === nextRole.toLowerCase());
      const id = existing?._id || await create({ date: new Date().toISOString().slice(0, 10), company: nextCompany, role: nextRole, sector: "", role_type: "", channel: mode === "url" ? "Job posting URL" : "Pasted posting", status: "drafted", contact_person: "", fit_rating: "", notes: "", cv_file: "", cover_letter_file: "", source: mode === "url" ? content : "", deadline: "" });
      setApplicationId(id); setStage("review");
      const result = await prepare({ applicationId: id, mode, content });
      setPrepared(result); notice("Posting checked and linked sources fetched.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare this posting."); }
    finally { setBusy(false); }
  }
  async function runFit() {
    if (!fitConsent || !applicationId) return;
    setBusy(true); setError("");
    try { const result = await assessFit({ applicationId: applicationId as never, confirmSend: true }); setFit(result); setStage("fit"); setFitConsent(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Fit assessment failed."); }
    finally { setBusy(false); }
  }
  async function createPack() {
    if (!draftConsent || !applicationId) return;
    setBusy(true); setError("");
    try { const result = await generate({ applicationId: applicationId as never, confirmSend: true }); notice(`Application pack saved · ${result.filenames.length} files created.`); setDraftConsent(false); setStage("complete"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Draft generation failed."); }
    finally { setBusy(false); }
  }
  const step = stage === "posting" ? 1 : stage === "review" ? 2 : stage === "fit" ? 3 : stage === "draft" ? 4 : 5;
  return <>
    <PageHeading title="Build an application pack" description="Check a posting, review fit, and generate a tailored CV and cover letter." />
    <section className="panel workflow-panel"><div className="steps-row">{["Posting", "Source check", "Fit review", "Draft pack"].map((title, index) => <div className={`workflow-step ${index + 1 <= Math.min(step, 4) ? "active" : ""}`} key={title}><span>{index + 1 < step ? <NavIcon name="check" /> : index + 1}</span>{title}</div>)}</div>
      {stage === "posting" && <form onSubmit={submitPosting} className="workflow-form"><div><h2>Add the job posting</h2><p className="panel-subtitle">The hosted worker checks public HTTPS links and applies the repository posting guard before any AI call.</p></div><div className="segmented"><button type="button" className={mode === "url" ? "selected" : ""} onClick={() => setMode("url")}>Posting URL</button><button type="button" className={mode === "text" ? "selected" : ""} onClick={() => setMode("text")}>Paste text</button></div><div className="field"><span>Company</span><input className="input" name="company" required maxLength={120} placeholder="Company name" value={company} onChange={(event) => setCompany(event.target.value)} /></div><div className="field"><span>Role title</span><input className="input" name="role" required maxLength={160} placeholder="Role title" value={role} onChange={(event) => setRole(event.target.value)} /></div><div className="field"><span>{mode === "url" ? "Job posting link" : "Job posting text"}</span>{mode === "url" ? <input className="input" name="posting" type="url" required placeholder="https://company.com/careers/role" /> : <textarea className="textarea" name="posting" required maxLength={60000} placeholder="Paste the complete job description" />}</div><div className="notice info"><strong>Public links</strong><span>Visible links found in the posting are fetched automatically, up to 50 links. Only public HTTPS pages are allowed.</span></div>{error && <div className="notice danger compact">{error}</div>}<div className="flow-actions"><button type="button" className="button button-secondary" onClick={() => setView("applications")}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Checking posting and links…" : "Check posting"}</button></div></form>}
      {stage === "review" && <div className="workflow-form"><div><h2>Posting checked</h2><p className="panel-subtitle">Review the posting guard findings and linked sources.</p></div>{!postingData ? <>{busy ? <Loading /> : <div className="notice warning">The source check did not finish. {error || "Retry the check when the worker is available."}<button className="button button-secondary" disabled={!applicationId} onClick={async () => { if (!applicationId) return; setBusy(true); setError(""); try { const result = await prepare({ applicationId: applicationId as never, mode, content: postingContent }); setPrepared(result); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare this posting."); } finally { setBusy(false); } }}>Retry source check</button></div>}</> : <><div className="notice info"><strong>{postingData.guard?.verdict || "Guard complete"}</strong><span>{postingData.guard?.instruction_like?.length || 0} instruction-like lines flagged · {postingData.linksFetched ?? postingData.linkedSources?.length ?? 0} visible links fetched</span></div><details className="result-details"><summary>Job posting sent for fit review</summary><pre>{postingData.postingText || postingData.posting}</pre></details>{(postingData.linkedSources || []).length > 0 && <details className="result-details"><summary>Linked sources fetched ({postingData.linkedSources.length})</summary>{postingData.linkedSources.map((source: any) => <div className="linked-source" key={source.url}><strong>{source.url}</strong><pre>{source.text}</pre></div>)}</details>}{(postingData.linkErrors || []).length > 0 && <details className="result-details"><summary>Links that could not be fetched ({postingData.linkErrors.length})</summary>{postingData.linkErrors.map((source: any) => <div className="linked-source" key={source.url}><strong>{source.url}</strong><p>{source.error}</p></div>)}</details>}<details className="result-details"><summary>Redacted candidate profile sent to Ollama Cloud</summary><pre>{redactContacts(profileText)}</pre></details><div className="notice warning"><strong>Ollama Cloud transfer</strong><span>Your redacted profile, posting text, and linked source text will be sent to Ollama Cloud for fit assessment. Phone numbers and email are redacted.</span></div><label className="consent-row"><input type="checkbox" checked={fitConsent} onChange={(event) => setFitConsent(event.target.checked)} /><span>I reviewed the content above and approve this fit assessment request.</span></label>{error && <div className="notice danger compact">{error}</div>}<div className="flow-actions"><button className="button button-secondary" onClick={() => setStage("posting")}>Back</button><button className="button button-primary" disabled={!fitConsent || busy || !profileText.trim()} onClick={runFit}>{busy ? "Assessing fit…" : "Approve and assess fit"}</button></div></>}</div>}
      {stage === "fit" && <div className="workflow-form"><div><h2>Fit review</h2><p className="panel-subtitle">Eligibility and language gates run before the fit score.</p></div>{!assessment ? <Loading /> : <div className="fit-result"><div className="fit-score-large">{assessment.overallScore ?? "—"}<small>{typeof assessment.overallScore === "number" ? " / 100" : ""}</small></div><div className="score-row"><span className="score-chip">Eligibility · {assessment.eligibility?.verdict || "Reviewed"}</span><span className="score-chip">Language · {assessment.languageGate?.verdict || "Reviewed"}</span><span className="score-chip">Recommendation · {assessment.verdict || assessment.recommendation || "Review"}</span></div><p>{assessment.summary || "Review the eligibility and language findings before proceeding."}</p>{assessment.eligibility?.reason && <div className="source-card"><strong>Eligibility</strong><br />{assessment.eligibility.reason}{assessment.eligibility.sourceQuote && <blockquote>“{assessment.eligibility.sourceQuote}”</blockquote>}</div>}{assessment.languageGate?.reason && <div className="source-card"><strong>Language</strong><br />{assessment.languageGate.reason}{assessment.languageGate.sourceQuote && <blockquote>“{assessment.languageGate.sourceQuote}”</blockquote>}</div>}</div>}{!allowed ? <div className="notice danger">A hard eligibility gate did not clear. Pack generation is blocked.</div> : <><details className="result-details"><summary>Redacted profile, posting, links, and fit data to be sent</summary><pre>{JSON.stringify({ profile: redactContacts(profileText), posting: postingData?.postingText || postingData?.posting, linkedSources: postingData?.linkedSources, fitAssessment: assessment }, null, 2)}</pre></details><div className="notice warning"><strong>Draft and review transfer</strong><span>Two Ollama Cloud calls will draft and then review your CV, cover letter, and application answers. Email and phone are redacted. The private PDF worker receives your profile and the reviewed document content to render PDFs that include your confirmed phone numbers and portfolio.</span></div><label className="consent-row"><input type="checkbox" checked={draftConsent} onChange={(event) => setDraftConsent(event.target.checked)} /><span>I approve these Ollama Cloud calls and PDF rendering for this application pack.</span></label></>}{error && <div className="notice danger compact">{error}</div>}<div className="flow-actions"><button className="button button-secondary" onClick={() => setStage("review")}>Back</button><button className="button button-primary" disabled={!allowed || !draftConsent || busy} onClick={createPack}>{busy ? "Drafting and rendering PDFs…" : "Generate and save pack"}</button></div></div>}
      {stage === "complete" && <div className="workflow-form complete-state"><div className="complete-mark"><NavIcon name="check" /></div><div><h2>Application pack saved</h2><p className="panel-subtitle">The tailored CV and cover letter PDFs, editable sources, fit review, posting, and related notes are saved in your private Convex workspace.</p></div><button className="button button-primary" onClick={() => setView("applications")}>Open application files</button></div>}
    </section>
  </>;
}

function Profile({ notice }: { notice: (message: string) => void }) {
  const profile = useQuery(api.profiles.getMine, {}) as { markdown: string; revision: number; updatedAt: number } | null | undefined;
  const save = useMutation(api.profiles.saveMine);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const markdown = draft ?? profile?.markdown ?? "";
  const dirty = profile !== undefined && markdown !== (profile?.markdown || "");
  if (profile === undefined) return <Loading />;
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (draft === null) return;
    setSaving(true);
    try {
      const result = await save({ markdown: draft, expectedRevision: profile?.revision ?? 0 });
      setDraft(null); notice(`Profile saved · revision ${result.revision}.`);
    } catch (error) { notice(error instanceof Error ? error.message : "Could not save your profile."); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading title="Your story, kept current." description="Edit the profile used to ground your application materials. Changes save to your private Convex workspace." />
    <div className="profile-layout"><section className="panel profile-editor-panel"><div className="panel-header"><div><div className="panel-title">Canonical candidate profile</div><div className="panel-subtitle">Markdown preserves source notes, provenance, and unconfirmed facts.</div></div>{profile ? <span className="revision-badge">Revision {profile.revision}</span> : <span className="revision-badge">Not imported</span>}</div>
      <form onSubmit={saveProfile}><label className="sr-only" htmlFor="profile-markdown">Candidate profile Markdown</label><textarea id="profile-markdown" className="profile-editor" value={markdown} onChange={(event) => setDraft(event.target.value)} placeholder={'## Identity and links\n\n- **Name:** Your name\n- **Languages:** English — Native\n\n## Experience\n\nAdd confirmed experience and preserve provenance notes.'} spellCheck={false} /><div className="editor-footer"><span>{markdown.length.toLocaleString()} characters{profile?.updatedAt ? ` · saved ${new Date(profile.updatedAt).toLocaleString()}` : " · new profile"}</span><div className="button-row"><button className="button button-secondary" type="button" disabled={!dirty || saving} onClick={() => setDraft(null)}>Discard</button><button className="button button-primary" disabled={!dirty || saving}>{saving ? "Saving…" : "Save profile"}</button></div></div></form>
      {!profile && <div className="notice warning"><strong>Your existing profile is still local.</strong><span>Use Settings → Import workspace to preview and deliberately copy your profile into this account.</span></div>}
    </section><aside className="panel profile-guidance"><div className="panel-title">Profile guidance</div><ul><li>Keep only claims you can support.</li><li>Leave provenance comments beside facts that need verification.</li><li>Both English and Sesotho are recorded at native proficiency in your local profile.</li></ul><div className="notice info compact"><strong>Account isolation</strong><span>Collaborators cannot open this profile.</span></div></aside></div>
  </>;
}

function Settings({ notice }: { notice: (message: string) => void }) {
  const pref = useQuery(api.preferences.getMine, {}) as { model: string } | null | undefined;
  const save = useMutation(api.preferences.saveMine);
  const test = useAction(api.hostedActions.testConnection);
  const [model, setModel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  if (pref === undefined) return <Loading />;
  const value = model ?? pref?.model ?? "gemma4:31b";
  async function saveModel(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try { await save({ model: value }); setModel(null); notice("Model preference saved."); }
    catch (error) { notice(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading title="Settings" description="Manage your private workspace and cloud AI preferences." />
    <div className="settings-grid"><section className="panel settings-panel"><h2>Ollama Cloud</h2><p>The API key is configured as a Convex deployment secret and is never sent to your browser. Each AI action will ask for your approval before sending application data.</p><form onSubmit={saveModel}><label className="field"><span>Model name</span><input className="input" value={value} onChange={(event) => setModel(event.target.value)} maxLength={100} placeholder="Model available to Ollama Cloud" /></label><div className="button-row"><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save model"}</button><button type="button" className="button button-secondary" disabled={testing} onClick={async () => { setTesting(true); setTestResult(""); try { const result = await test({ model: value }); setTestResult(result.connected ? "Connected to Ollama Cloud." : "Ollama did not confirm the connection."); } catch (error) { setTestResult(error instanceof Error ? error.message : "Connection failed."); } finally { setTesting(false); } }}>{testing ? "Testing…" : "Test connection"}</button></div><div className="footer-note" role="status">{testResult}</div></form></section><section className="panel settings-panel"><h2>Import your local workspace</h2><p>Export from the local app at <code>127.0.0.1:4173</code>, then preview the JSON here. Nothing transfers until you confirm.</p><WorkspaceImport notice={notice} /></section><section className="panel settings-panel"><h2>Private by account</h2><p>Your profile, application tracker, and generated files are scoped to your signed-in account. Collaborators receive separate workspaces.</p><div className="detail-meta"><small>Database</small><strong>Convex</strong></div><div className="detail-meta"><small>Sign-in</small><strong>Convex Auth</strong></div><div className="detail-meta"><small>AI credential</small><strong>Server-side secret</strong></div></section></div>
    <InviteManager notice={notice} />
  </>;
}

function InviteManager({ notice }: { notice: (message: string) => void }) {
  const data = useQuery(api.invitations.listMine, {}) as { isOwner: boolean; invitations: Array<{ _id: string; email: string; createdAt: number }> } | undefined;
  const create = useMutation(api.invitations.createMine);
  const remove = useMutation(api.invitations.removeMine);
  const [email, setEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ email: string; inviteCode: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (data === undefined || !data.isOwner) return null;
  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setCreatedInvite(null);
    try { setCreatedInvite(await create({ email })); setEmail(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the invitation."); }
    finally { setBusy(false); }
  }
  const inviteUrl = `${window.location.origin}/#invite=${encodeURIComponent(createdInvite?.inviteCode || "")}`;
  return <section className="panel invite-panel"><div className="panel-header"><div><div className="panel-title">Invite collaborators</div><div className="panel-subtitle">Invited people create a separate private workspace. Their profile and application data are not visible to you.</div></div></div><form className="invite-form" onSubmit={invite}><label className="field"><span>Collaborator email</span><input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="button button-primary" disabled={busy}>{busy ? "Creating…" : "Create invitation"}</button></form>{createdInvite && <div className="notice info invite-created"><strong>Share this private invite with {createdInvite.email}</strong><span>It includes a one-time secret for account creation. Copy it now; the code will not be shown again.</span><code>{inviteUrl}</code><code>Invitation code: {createdInvite.inviteCode}</code><button className="button button-secondary" onClick={async () => { await navigator.clipboard.writeText(`Northstar invite for ${createdInvite.email}\nOpen: ${inviteUrl}\nInvitation code: ${createdInvite.inviteCode}`); notice("Invitation details copied."); }}>Copy invite details</button></div>}{error && <div className="notice danger compact">{error}</div>}<div className="invite-list">{data.invitations.map((item) => <div className="invite-row" key={item._id}><div><strong>{item.email}</strong><small>Invited {formatDate(new Date(item.createdAt).toISOString())}</small></div><button className="text-button" onClick={async () => { try { await remove({ invitationId: item._id as never }); notice("Invitation removed."); } catch (cause) { notice(cause instanceof Error ? cause.message : "Could not remove invitation."); } }}>Revoke</button></div>)}</div></section>;
}

type ImportBundle = { version: number; exportedAt: string; profile: string; applications: Array<Record<string, string>>; files: Array<{ applicationKey: string; fileName: string; contentType: string; byteLength: number; dataBase64: string }>; skippedFiles?: number };

function WorkspaceImport({ notice }: { notice: (message: string) => void }) {
  const profile = useQuery(api.profiles.getMine, {}) as { revision: number } | null | undefined;
  const applications = useQuery(api.applications.listMine, {}) as AppRecord[] | undefined;
  const importData = useMutation(api.profiles.importMine);
  const uploadUrl = useMutation(api.files.uploadUrl);
  const attach = useMutation(api.files.attach);
  const [bundle, setBundle] = useState<ImportBundle | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const token = useAuthToken();
  const ready = profile !== undefined && applications !== undefined;
  async function selectFile(file?: File) {
    setBundle(null); setError(""); if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error("The export is larger than 100 MB.");
      const data = JSON.parse(await file.text()) as ImportBundle;
      if (data.version !== 1 || typeof data.profile !== "string" || !Array.isArray(data.applications) || !Array.isArray(data.files)) throw new Error("This is not a supported workspace export.");
      setBundle(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read this export."); }
  }
  async function confirmImport() {
    if (!bundle || !ready || profile === undefined || !applications || running) return;
    setRunning(true); setError("");
    try {
      const rows = bundle.applications.map((row) => ({
        date: row.date || new Date().toISOString().slice(0, 10), company: row.company || "", sector: row.sector || "", role: row.role || "",
        role_type: row.role_type || "", channel: row.channel || "", status: row.status || "drafted", contact_person: row.contact_person || "",
        fit_rating: row.fit_rating || "", notes: row.notes || "", cv_file: row.cv_file || "", cover_letter_file: row.cover_letter_file || "", source: row.source || "", deadline: row.deadline || "",
      }));
      const result = await importData({ markdown: bundle.profile, expectedRevision: profile?.revision || 0, applications: rows });
      let filesSaved = 0, filesSkipped = bundle.skippedFiles || 0;
      const idByKey = new Map(result.applicationIds.map((item: { applicationKey: string; applicationId: string }) => [item.applicationKey, item.applicationId]));
      for (const file of bundle.files) {
        const resolvedId = idByKey.get(file.applicationKey);
        if (!resolvedId) { filesSkipped++; continue; }
        const bytes = Uint8Array.from(atob(file.dataBase64), (char) => char.charCodeAt(0));
        const url = await uploadUrl({});
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.contentType || "application/octet-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: bytes });
        if (!response.ok) { filesSkipped++; continue; }
        const { storageId } = await response.json();
        await attach({ applicationId: resolvedId as never, storageId, fileName: file.fileName, artifactType: file.fileName.split(" - ").at(-1)?.replace(/\.[^.]+$/, "") || "Application file", contentType: file.contentType || "application/octet-stream", byteLength: bytes.byteLength });
        filesSaved++;
      }
      notice(`Import finished · ${result.imported} applications added, ${result.skipped} duplicates skipped, ${filesSaved} files copied${filesSkipped ? `, ${filesSkipped} files skipped` : ""}.`);
      setBundle(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import did not complete. Local files were not changed."); }
    finally { setRunning(false); }
  }
  const duplicateCount = bundle && applications ? bundle.applications.filter((row) => applications.some((app) => app.company.trim().toLowerCase() === String(row.company || "").trim().toLowerCase() && app.role.trim().toLowerCase() === String(row.role || "").trim().toLowerCase())).length : 0;
  return <div className="import-box"><label className="button button-secondary file-pick"><input type="file" accept="application/json,.json" onChange={(event) => selectFile(event.currentTarget.files?.[0])} />Choose local export</label>{error && <div className="notice danger compact">{error}</div>}{bundle && <><div className="import-summary"><strong>Preview ready · exported {new Date(bundle.exportedAt).toLocaleString()}</strong><span>{bundle.applications.length} application records ({duplicateCount} already present)</span><span>{bundle.files.length} files{bundle.skippedFiles ? ` · ${bundle.skippedFiles} local files exceed import limits or are not linked to a tracker row` : ""}</span><span>{bundle.profile.length.toLocaleString()} profile characters</span></div><div className="notice warning compact">{profile ? "This replaces the candidate profile in this account and adds any missing applications/files." : "This copies your profile, tracker rows, and listed documents into this account."} It will not edit or delete local files. Review the counts before confirming.</div><button className="button button-primary" disabled={running || !ready} onClick={confirmImport}>{running ? "Importing…" : "Confirm import"}</button></>}{!bundle && !error && <small>Choose the JSON export downloaded from your local app. The file is only previewed in your browser until you confirm.</small>}</div>;
}

function Loading() { return <div className="loading"><span className="spinner" />Loading your workspace…</div>; }
