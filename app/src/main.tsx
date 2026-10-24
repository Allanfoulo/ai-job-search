import { StrictMode, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { checkPosting, createApplication, fetchApplication, fetchApplications } from "./api";
import type { ApplicationDetail, ApplicationRow, GuardResult } from "./types";
import "./styles.css";

type Page = "overview" | "applications" | "profile" | "settings";
type View = { page: Page } | { page: "detail"; slug: string } | { page: "new" };

const formatDate = (value?: string) => {
  if (!value) return "Not set";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function App() {
  const [view, setView] = useState<View>({ page: "overview" });
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [profileAvailable, setProfileAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const result = await fetchApplications();
      setApplications(result.applications);
      setProfileAvailable(result.profileAvailable);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load local application data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (view.page !== "detail") {
      setDetail(null);
      return;
    }
    void fetchApplication(view.slug)
      .then(setDetail)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not open this application."));
  }, [view]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesText = !term || `${application.company} ${application.role} ${application.location ?? ""}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [applications, query, statusFilter]);

  const counts = useMemo(() => {
    const active = applications.filter((item) => !["hired", "rejected", "no_response", "offer_declined", "withdrawn"].includes(item.status));
    const drafts = applications.filter((item) => item.status === "drafted");
    const interviews = applications.filter((item) => item.status === "interview");
    const followups = applications.filter((item) => item.status === "applied" && item.date && Date.now() - new Date(`${item.date}T00:00:00`).getTime() > 10 * 86400000);
    return { active: active.length, drafts: drafts.length, interviews: interviews.length, followups: followups.length };
  }, [applications]);

  function openPage(page: Page) {
    setView({ page });
    setMobileNavOpen(false);
    setLoadError("");
  }

  function openDetail(slug: string) {
    setView({ page: "detail", slug });
    setLoadError("");
  }

  const isOverview = view.page === "overview";
  const title = view.page === "new" ? "New application" : view.page === "detail" ? detail?.role || "Application" : view.page === "profile" ? "Candidate profile" : view.page === "settings" ? "Settings" : isOverview ? "Overview" : "Applications";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.2} /></div>
          <div><div className="brand-name">Career Desk</div><div className="brand-caption">AI Job Search</div></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavItem active={view.page === "overview"} icon={<LayoutDashboard size={17} />} label="Overview" onClick={() => openPage("overview")} />
          <NavItem active={view.page === "applications" || view.page === "detail" || view.page === "new"} icon={<BriefcaseBusiness size={17} />} label="Applications" count={applications.length} onClick={() => openPage("applications")} />
          <NavItem active={view.page === "profile"} icon={<UserRound size={17} />} label="Candidate profile" onClick={() => openPage("profile")} />
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status"><span className="status-dot" /><span>Local workspace</span><LockKeyhole size={14} /></div>
          <button className={`nav-item ${view.page === "settings" ? "active" : ""}`} onClick={() => openPage("settings")}><Settings2 size={17} /><span>Settings</span></button>
          <div className="user-chip"><div className="avatar">AF</div><div className="user-meta"><strong>Local profile</strong><span>{profileAvailable ? "Profile file detected" : "Profile not found"}</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{title}</strong></div>
          <div className="topbar-right"><span className="local-pill"><span className="status-dot" />Private to this device</span><button className="icon-button help-button" title="Local-only workspace" aria-label="Local-only workspace"><CircleHelp size={18} /></button></div>
        </header>

        {loadError && <div className="global-error"><CircleAlert size={17} /><span>{loadError}</span><button onClick={() => void refresh()} className="text-button">Retry</button><button onClick={() => setLoadError("")} className="icon-button" aria-label="Dismiss error"><X size={16} /></button></div>}

        {view.page === "new" ? (
          <NewApplication onCancel={() => openPage("overview")} onSaved={(application) => { void refresh(); openDetail(application.slug); }} />
        ) : view.page === "detail" ? (
          <ApplicationDetailView detail={detail} loading={!detail && !loadError} onBack={() => openPage("applications")} />
        ) : view.page === "profile" ? (
          <ProfilePage available={profileAvailable} />
        ) : view.page === "settings" ? (
          <SettingsPage />
        ) : (
          <OverviewPage
            applications={filtered}
            allApplications={applications}
            counts={counts}
            loading={loading}
            query={query}
            statusFilter={statusFilter}
            setQuery={setQuery}
            setStatusFilter={setStatusFilter}
            showMetrics={isOverview}
            onNew={() => setView({ page: "new" })}
            onOpen={openDetail}
            onRefresh={() => void refresh()}
          />
        )}
      </main>
    </div>
  );
}

function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && count > 0 && <span className="nav-count">{count}</span>}</button>;
}

function OverviewPage(props: {
  applications: ApplicationRow[];
  allApplications: ApplicationRow[];
  counts: { active: number; drafts: number; interviews: number; followups: number };
  loading: boolean;
  query: string;
  statusFilter: string;
  setQuery: (value: string) => void;
  setStatusFilter: (value: string) => void;
  showMetrics: boolean;
  onNew: () => void;
  onOpen: (slug: string) => void;
  onRefresh: () => void;
}) {
  const { applications, allApplications, counts, loading, query, statusFilter } = props;
  return (
    <div className="page-content">
      <section className="page-heading">
        <div><div className="eyebrow">YOUR JOB SEARCH</div><h1>{props.showMetrics ? "Overview" : "Applications"}</h1><p>{props.showMetrics ? "Keep applications moving and know what needs attention." : "Review and manage every role in your pipeline."}</p></div>
        <button className="primary-button" onClick={props.onNew}><Plus size={17} /> New application</button>
      </section>

      {props.showMetrics && <section className="metric-grid" aria-label="Application summary">
        <Metric icon={<BriefcaseBusiness size={17} />} label="Active applications" value={counts.active} tone="green" />
        <Metric icon={<FileText size={17} />} label="Drafts to review" value={counts.drafts} tone="blue" />
        <Metric icon={<CalendarClock size={17} />} label="Interviews" value={counts.interviews} tone="orange" />
        <Metric icon={<Clock3 size={17} />} label="Follow-ups due" value={counts.followups} tone="red" />
      </section>}

      {props.showMetrics && <section className="next-step-banner">
        <div className="next-step-icon"><Sparkles size={18} /></div>
        <div className="next-step-copy"><strong>Start with a role you’re considering</strong><span>Add a posting, review it, and keep the draft in your private local workspace.</span></div>
        <button className="secondary-button banner-action" onClick={props.onNew}>Add a role <ArrowRight size={15} /></button>
      </section>}

      <section className="list-section">
        <div className="section-heading"><div><h2>{props.showMetrics ? "Recent applications" : "All applications"}</h2><p>{allApplications.length} {allApplications.length === 1 ? "role" : "roles"} in your tracker</p></div><button className="subtle-button" onClick={props.onRefresh} aria-label="Refresh applications"><ArrowDownUp size={15} /> Refresh</button></div>
        <div className="filter-row">
          <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search company or role" /></label>
          <label className="select-field"><Filter size={15} /><select value={statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{Array.from(new Set(allApplications.map((item) => item.status).filter(Boolean))).sort().map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={14} /></label>
        </div>
        <div className="table-wrap">
          <table className="application-table">
            <thead><tr><th>ROLE</th><th>STATUS</th><th>FIT</th><th>DATE</th><th aria-label="Open" /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="table-state"><LoaderCircle className="spin" size={18} />Loading your tracker…</div></td></tr> : applications.length ? applications.map((application, index) => <ApplicationTableRow key={`${application.slug}-${index}`} application={application} onClick={() => application.slug && props.onOpen(application.slug)} />) : (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon"><FolderOpen size={22} /></div><h3>{allApplications.length ? "No matching applications" : "Your application list is empty"}</h3><p>{allApplications.length ? "Try a different search or status filter." : "Start by adding a job posting. The app will save a local draft record; no application is sent."}</p>{!allApplications.length && <button className="primary-button" onClick={props.onNew}><Plus size={17} /> Add your first application</button>}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Stored in the repository’s local tracker</span><span><LockKeyhole size={13} /> This app never submits applications</span></div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-value">{value}</div><div className="metric-label">{label}</div></div>;
}

function ApplicationTableRow({ application, onClick }: { application: ApplicationRow; onClick: () => void }) {
  return <tr className="application-row" onClick={onClick} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onClick(); }}>
    <td><div className="role-cell"><div className="company-avatar">{application.company.slice(0, 1).toUpperCase()}</div><div className="role-copy"><strong>{application.role || "Untitled role"}</strong><span>{application.company || "Company not set"}{application.location ? ` · ${application.location}` : ""}</span></div></div></td>
    <td><StatusBadge status={application.status} /></td>
    <td><span className={application.fit_rating ? "fit-label" : "muted-label"}>{application.fit_rating || "Not assessed"}</span></td>
    <td className="date-cell">{formatDate(application.date)}</td>
    <td><button className="row-open" aria-label={`Open ${application.role} at ${application.company}`} onClick={(event) => { event.stopPropagation(); onClick(); }}><ArrowUpRight size={16} /></button></td>
  </tr>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status || "unknown";
  return <span className={`status-badge status-${normalized.replace(/[^a-z0-9]+/g, "-")}`}><span />{statusLabel(normalized)}</span>;
}

function NewApplication({ onCancel, onSaved }: { onCancel: () => void; onSaved: (application: ApplicationRow) => void }) {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [postingText, setPostingText] = useState("");
  const [guard, setGuard] = useState<GuardResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const warnings = guard ? (guard.findings.instruction_like?.length ?? 0) + (guard.findings.invisible_flagged ?? 0) + (guard.findings.homoglyph_runs?.length ?? 0) : 0;

  async function runGuard() {
    setBusy(true);
    setError("");
    try {
      const result = await checkPosting(postingText);
      setGuard(result);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check this posting.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    setError("");
    try {
      const result = await createApplication({ company, role, location, jobUrl, postingText });
      setSaved(true);
      onSaved(result.application);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this application.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-content new-page">
    <button className="back-link" onClick={onCancel}><ArrowLeft size={16} /> Back to overview</button>
    <section className="page-heading compact-heading"><div><div className="eyebrow">NEW APPLICATION</div><h1>Add a role</h1><p>Review the posting first. Nothing is sent to an employer.</p></div><div className="wizard-step-label">Step {step} of 2</div></section>
    <div className="wizard-layout">
      <div className="wizard-main">
        <div className="wizard-progress"><span className={step >= 1 ? "done" : ""} /><span className={step >= 2 ? "done" : ""} /></div>
        {step === 1 ? <section className="form-panel">
          <div className="form-panel-heading"><div className="step-icon"><BriefcaseBusiness size={18} /></div><div><h2>Job details</h2><p>Enter the role and paste its visible description.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Company <b>*</b></span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme" autoComplete="organization" /></label>
            <label className="field"><span>Job title <b>*</b></span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. AI Solutions Engineer" /></label>
            <label className="field"><span>Location <small>Optional</small></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Remote, South Africa" /></label>
            <label className="field"><span>Job posting URL <small>Optional</small></span><input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label>
            <label className="field field-wide"><span>Posting text <b>*</b></span><textarea value={postingText} onChange={(event) => setPostingText(event.target.value)} placeholder="Paste the job description here. For this first version, the app checks pasted text; it does not fetch URLs." rows={11} maxLength={250000} /><span className="field-hint">{postingText.length.toLocaleString()} / 250,000 characters</span></label>
          </div>
          {error && <div className="inline-error"><CircleAlert size={16} />{error}</div>}
          <div className="form-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy || !company.trim() || !role.trim() || !postingText.trim()} onClick={() => void runGuard()}>{busy ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />} Check posting <ArrowRight size={15} /></button></div>
        </section> : <section className="form-panel review-panel">
          <div className="form-panel-heading"><div className={`step-icon ${warnings ? "warning-step" : "success-step"}`}>{warnings ? <CircleAlert size={18} /> : <ShieldCheck size={18} />}</div><div><h2>Review before saving</h2><p>{company} · {role}{location ? ` · ${location}` : ""}</p></div></div>
          {guard && <div className={`guard-result ${warnings ? "guard-warning" : "guard-clean"}`}><div className="guard-title">{warnings ? "Review flagged content" : "Posting check complete"}<span>{guard.verdict}</span></div><div className="guard-counts"><GuardCount label="Hidden blocks" value={guard.findings.hidden_blocks?.length ?? 0} /><GuardCount label="Instruction-like lines" value={guard.findings.instruction_like?.length ?? 0} /><GuardCount label="Hidden URLs" value={guard.findings.hidden_urls?.length ?? 0} /><GuardCount label="Invisible characters" value={guard.findings.invisible_flagged ?? 0} /><GuardCount label="Mixed-script words" value={guard.findings.homoglyph_runs?.length ?? 0} /></div>{warnings > 0 && <p className="guard-explain">Inspect the cleaned posting below. The guard removes hidden text and surfaces instruction-shaped content; continue only if the visible job content looks legitimate.</p>}</div>}
          <label className="field cleaned-field"><span>Cleaned posting preview</span><textarea readOnly value={guard?.cleaned ?? ""} rows={12} /></label>
          {error && <div className="inline-error"><CircleAlert size={16} />{error}</div>}
          <div className="form-actions spread-actions"><button className="secondary-button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Edit details</button><button className="primary-button" disabled={busy || saved} onClick={() => void saveDraft()}>{busy ? <LoaderCircle className="spin" size={17} /> : saved ? <Check size={17} /> : <FileCheck2 size={17} />}{saved ? "Saved" : "Save local draft"}</button></div>
        </section>}
      </div>
      <aside className="wizard-aside">
        <div className="aside-heading"><ShieldCheck size={16} /> Local by design</div>
        <p>Your posting and application details stay in this repository. This step only creates a local draft record.</p>
        <div className="aside-divider" />
        <div className="aside-heading"><Sparkles size={16} /> What happens next</div>
        <ol className="aside-list"><li><span>1</span><div><strong>Check</strong><small>Review the pasted posting for hidden or suspicious content.</small></div></li><li><span>2</span><div><strong>Save a draft</strong><small>Archive the cleaned posting and add a “Drafted” tracker row.</small></div></li><li className="pending-step"><span>3</span><div><strong>Assess and prepare</strong><small>AI fit review and document generation are not connected in this UI yet.</small></div></li></ol>
        <div className="aside-note"><LockKeyhole size={14} /><span>The app never submits an application or sends email.</span></div>
      </aside>
    </div>
  </div>;
}

function GuardCount({ label, value }: { label: string; value: number }) {
  return <div className="guard-count"><strong>{value}</strong><span>{label}</span></div>;
}

function ApplicationDetailView({ detail, loading, onBack }: { detail: ApplicationDetail | null; loading: boolean; onBack: () => void }) {
  if (loading) return <div className="page-content"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Applications</button><div className="loading-panel"><LoaderCircle className="spin" size={19} />Loading application…</div></div>;
  if (!detail) return <div className="page-content"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Applications</button><div className="loading-panel">Application details unavailable.</div></div>;
  return <div className="page-content">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Applications</button>
    <section className="detail-heading"><div><div className="eyebrow">APPLICATION RECORD</div><h1>{detail.role}</h1><p>{detail.company}{detail.location ? ` · ${detail.location}` : ""}</p></div><StatusBadge status={detail.status} /></section>
    <div className="detail-grid">
      <section className="detail-panel"><div className="section-heading"><div><h2>Job posting</h2><p>Cleaned text archived locally</p></div>{detail.jobUrl && isHttpsUrl(detail.jobUrl) && <a className="subtle-button link-button" href={detail.jobUrl} target="_blank" rel="noreferrer">Original posting <ArrowUpRight size={14} /></a>}</div><pre className="posting-text">{detail.posting}</pre></section>
      <aside className="detail-sidebar"><section className="detail-panel"><h2>Application status</h2><div className="detail-property"><span>Status</span><StatusBadge status={detail.status} /></div><div className="detail-property"><span>Created</span><strong>{formatDate(detail.date)}</strong></div><div className="detail-property"><span>Fit assessment</span><strong className="muted-label">Not assessed</strong></div></section><section className="detail-panel"><h2>Documents</h2><div className="document-placeholder"><FileText size={17} /><div><strong>Application pack</strong><span>Not generated in this version</span></div></div></section></aside>
    </div>
  </div>;
}

function ProfilePage({ available }: { available: boolean }) {
  return <div className="page-content"><section className="page-heading"><div><div className="eyebrow">SOURCE OF TRUTH</div><h1>Candidate profile</h1><p>Profile details are read from the repository’s canonical files.</p></div></section><section className="profile-status-panel"><div className={`profile-status-icon ${available ? "ok" : "missing"}`}>{available ? <Check size={21} /> : <CircleAlert size={21} />}</div><div><h2>{available ? "Profile file detected" : "No profile file found"}</h2><p>{available ? "CLAUDE.md is present in this repository. Profile review and editing will be added in a later step." : "Set up your candidate profile using the existing setup workflow, then return here."}</p></div><span className="file-chip">CLAUDE.md</span></section><div className="notice-panel"><LockKeyhole size={17} /><p>Profile editing is not enabled in this UI yet. This page will not change canonical candidate facts.</p></div></div>;
}

function SettingsPage() {
  return <div className="page-content"><section className="page-heading"><div><div className="eyebrow">LOCAL CONFIGURATION</div><h1>Settings</h1><p>Manage this local workspace and provider connections.</p></div></section><section className="settings-panel"><div className="settings-icon"><LockKeyhole size={18} /></div><div className="settings-copy"><h2>Local workspace</h2><p>The service binds to 127.0.0.1. Candidate data and application files are stored in this repository.</p></div><span className="settings-value"><span className="status-dot" />Enabled</span></section><section className="settings-panel disabled-setting"><div className="settings-icon purple"><Sparkles size={18} /></div><div className="settings-copy"><h2>AI provider</h2><p>Ollama Cloud preview and explicit consent controls are planned; this version does not send profile or posting data to an AI provider.</p></div><span className="coming-soon">Not connected</span></section><div className="notice-panel"><CircleAlert size={17} /><p>Hosted access is not enabled. Do not expose this service beyond your device.</p></div></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
