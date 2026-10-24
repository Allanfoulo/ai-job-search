export type ApplicationRow = {
  date: string;
  company: string;
  sector: string;
  role: string;
  role_type: string;
  channel: string;
  status: string;
  contact_person: string;
  fit_rating: string;
  notes: string;
  cv_file: string;
  cover_letter_file: string;
  source: string;
  deadline: string;
  slug: string;
  location?: string;
  jobUrl?: string;
  createdAt?: string;
};

export type GuardResult = {
  verdict: string;
  findings: {
    hidden_blocks?: unknown[];
    instruction_like?: unknown[];
    hidden_urls?: unknown[];
    invisible_flagged?: number;
    homoglyph_runs?: unknown[];
    visible_url_count?: number;
  };
  cleaned: string;
};

export type ApplicationDetail = ApplicationRow & {
  posting: string;
  postingGuard?: { verdict: string; counts: Record<string, number> };
};
