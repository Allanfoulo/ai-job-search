export type CandidateContact = {
  phones: string[];
  portfolioUrl?: string;
};

export type CvEntry = {
  dateRange?: string;
  title?: string;
  company?: string;
  location?: string;
  bullets?: string[];
  description?: string;
};

export type CvDocument = {
  fullName: string;
  contact?: CandidateContact;
  headline?: string;
  summary: string;
  competencies?: Array<{ label?: string; details?: string } | string>;
  experience?: CvEntry[];
  education?: Array<{
    dateRange?: string;
    qualification?: string;
    institution?: string;
    location?: string;
    description?: string;
  }>;
  technicalSkills?: string[];
  languages?: Array<{ language: string; proficiency?: string } | string>;
  additionalSections?: Array<{ heading: string; items: string[] }>;
};

export type CoverLetterDocument = {
  fullName?: string;
  contact?: CandidateContact;
  salutation: string;
  paragraphs: string[];
  bulletIntro?: string;
  bullets?: Array<{ label?: string; text?: string } | string>;
  closing?: string;
};

export type ApplicationDocuments = {
  cvDocument: CvDocument;
  coverLetterDocument: CoverLetterDocument;
  answers?: Array<{ question?: string; label?: string; answer?: string; text?: string; wordCount?: number }>;
  notes?: string[];
};

const text = (value: unknown) => String(value ?? '').trim();
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];

export function confirmedContactFromProfile(profile: string): CandidateContact {
  const phoneLine = profile.match(/^\s*- \*\*Phone:\*\* (.+)$/m)?.[1] || '';
  const phones = [...phoneLine.matchAll(/\+\s*\d[\d\s().-]{6,}\d/g)]
    .map(([match]) => match.replace(/\s+/g, ' ').trim())
    .filter((phone, index, all) => all.indexOf(phone) === index);
  const portfolioUrl = profile.match(/^\s*- \*\*Personal portfolio:\*\* `([^`]+)`/m)?.[1]?.trim();
  return { phones, portfolioUrl };
}

function escapeLatex(value: unknown): string {
  return text(value).replace(/[\\{}%$#&_~^]/g, (char) => ({
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '&': '\\&',
    '_': '\\_',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  }[char] || char));
}

function escapeUrl(value: string): string {
  return value.replace(/([{}\\])/g, '\\$1').replace(/%/g, '\\%');
}

function replacePreambleValue(source: string, pattern: RegExp, replacement: string) {
  if (!pattern.test(source)) throw new Error('The active LaTeX template is missing a required personal-data field.');
  return source.replace(pattern, replacement);
}

function cvPreamble(template: string, doc: CvDocument, contact: CandidateContact): string {
  const begin = template.indexOf('\\begin{document}');
  if (begin < 0) throw new Error('The CV template has no document start marker.');
  let preamble = template.slice(0, begin + '\\begin{document}'.length);
  const fullName = text(doc.fullName);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  if (!nameParts.length) throw new Error('The generated CV has no candidate name.');
  const last = nameParts.length > 1 ? nameParts.pop()! : '';
  const first = nameParts.join(' ');
  preamble = replacePreambleValue(preamble, /\\name\{[^{}]*\}\{[^{}]*\}/, `\\name{${escapeLatex(first)}}{${escapeLatex(last)}}`);
  preamble = preamble.replace(/^\s*\\address\{[^{}]*\}\{[^{}]*\}\{[^{}]*\}\s*$/m, '');
  const phoneCommands = contact.phones.slice(0, 2).map((phone, index) => `\\phone[${index ? 'fixed' : 'mobile'}]{${escapeLatex(phone)}}`).join('\n');
  preamble = preamble.replace(/^\s*\\phone\[[^\]]+\]\{[^{}]*\}\s*$/m, phoneCommands);
  preamble = preamble.replace(/^\s*\\email\{[^{}]*\}\s*$/m, '');
  const extraInfo = contact.portfolioUrl
    ? `\\extrainfo{\\href{${escapeUrl(contact.portfolioUrl)}}{Portfolio}}`
    : '';
  preamble = replacePreambleValue(preamble, /^\s*\\extrainfo\{.*$/m, extraInfo);
  preamble = preamble.replace(/pdftitle=\{[^{}]*\}/, `pdftitle={${escapeLatex(fullName)} - CV}`);
  return preamble;
}

function sectionStart(title: string) {
  return `\\section{${escapeLatex(title)}}\n\\vspace{1pt}\n`;
}

function itemize(items: string[]) {
  const values = items.map((item) => text(item)).filter(Boolean);
  return values.length ? `\\begin{itemize}\n${values.map((item) => `\\item ${escapeLatex(item)}`).join('\n')}\n\\end{itemize}\n` : '';
}

function competencyText(value: any): string {
  if (typeof value === 'string') return text(value);
  const label = text(value?.label);
  const details = text(value?.details || value?.text);
  return [label, details].filter(Boolean).join(': ');
}

function entryLatex(entry: CvEntry, title: string, organization: string, location: string, dateRange: string) {
  const description = text(entry.description);
  const bullets = itemize(list(entry.bullets).map(text));
  const body = [description ? escapeLatex(description) : '', bullets].filter(Boolean).join('\n');
  return `\\item{\\cventry{${escapeLatex(dateRange)}}{${escapeLatex(title)}}{${escapeLatex(organization)}}{${escapeLatex(location)}}{}{${body}}}`;
}

export function buildCvTex(template: string, doc: CvDocument, contact: CandidateContact): string {
  const body: string[] = [cvPreamble(template, doc, contact), '\\makecvtitle'];
  if (text(doc.headline)) body.push(`\\begin{center}\\textbf{${escapeLatex(doc.headline)}}\\end{center}`);
  if (text(doc.summary)) body.push(`\\vspace{4pt}\n\\small{${escapeLatex(doc.summary)}}`);

  const competencies = list(doc.competencies).map(competencyText).filter(Boolean);
  if (competencies.length) body.push(sectionStart('Core Competencies'), itemize(competencies));

  const experience = list(doc.experience);
  if (experience.length) {
    body.push(sectionStart('Professional Experience'), '\\begin{itemize}');
    for (const entry of experience) {
      body.push(entryLatex(entry, text(entry.title), text(entry.company), text(entry.location), text(entry.dateRange)));
      body.push('\\vspace{3pt}');
    }
    body.push('\\end{itemize}');
  }

  const education = list(doc.education);
  if (education.length) {
    body.push(sectionStart('Education'), '\\begin{itemize}');
    for (const entry of education) {
      body.push(entryLatex(entry, text(entry.qualification), text(entry.institution), text(entry.location), text(entry.dateRange)));
    }
    body.push('\\end{itemize}');
  }

  const skills = list(doc.technicalSkills).map(text).filter(Boolean);
  if (skills.length) body.push(sectionStart('Technical Skills'), itemize(skills));

  const languages = list(doc.languages).map((language: any) => typeof language === 'string'
    ? text(language)
    : [text(language.language), text(language.proficiency)].filter(Boolean).join(' - ')).filter(Boolean);
  if (languages.length) body.push(sectionStart('Languages'), itemize(languages));

  for (const section of list(doc.additionalSections)) {
    const heading = text(section?.heading);
    const items = list(section?.items).map(text).filter(Boolean);
    if (heading && items.length) body.push(sectionStart(heading), itemize(items));
  }

  body.push('\\end{document}');
  return body.join('\n\n') + '\n';
}

function coverPreamble(template: string) {
  const begin = template.indexOf('\\begin{document}');
  if (begin < 0) throw new Error('The cover-letter template has no document start marker.');
  return template.slice(0, begin + '\\begin{document}'.length);
}

function contactLine(contact: CandidateContact) {
  const values = [...contact.phones];
  if (contact.portfolioUrl) values.push(`\\urlstyle{same}\\href{${escapeUrl(contact.portfolioUrl)}}{Portfolio}`);
  return values.join(' | ');
}

export function buildCoverLetterTex(template: string, doc: CoverLetterDocument, cv: CvDocument, contact: CandidateContact): string {
  const fullName = text(doc.fullName || cv.fullName);
  if (!fullName) throw new Error('The cover letter has no candidate name.');
  if (!text(doc.salutation)) throw new Error('The cover letter has no salutation.');
  const body: string[] = [
    coverPreamble(template),
    `\\namesection{}{\\Huge{${escapeLatex(fullName)}}}{${contactLine(contact)}}`,
    '\\currentdate{\\today}',
    `\\lettercontent{${escapeLatex(doc.salutation)}}`,
  ];
  for (const paragraph of list(doc.paragraphs).map(text).filter(Boolean)) body.push(`\\lettercontent{${escapeLatex(paragraph)}}`);
  const bullets = list(doc.bullets).map((bullet: any) => typeof bullet === 'string'
    ? text(bullet)
    : [text(bullet?.label) ? `\\textbf{${escapeLatex(bullet.label)}:}` : '', escapeLatex(bullet?.text)].filter(Boolean).join(' ')).filter(Boolean);
  if (bullets.length) {
    if (text(doc.bulletIntro)) body.push(`\\lettercontent{${escapeLatex(doc.bulletIntro)}}`);
    body.push([
      '{\\raggedright\\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\\fontsize{11pt}{13pt}\\selectfont',
      '\\begin{itemize}',
      ...bullets.map((bullet) => `\\item ${bullet}`),
      '\\end{itemize}\\par}',
      '\\vspace{6pt}',
    ].join('\n'));
  }
  body.push('\\begin{flushright}');
  body.push(`\\closing{${escapeLatex(doc.closing || 'Kind regards,')}}`);
  body.push(`\\signature{${escapeLatex(fullName)}}`);
  body.push('\\end{flushright}', '\\end{document}');
  return body.join('\n\n') + '\n';
}

export function validateApplicationDocuments(value: any): asserts value is ApplicationDocuments {
  if (!value?.cvDocument || typeof value.cvDocument !== 'object') throw new Error('The application draft is missing its structured CV content.');
  if (!text(value.cvDocument.fullName) || !text(value.cvDocument.summary)) throw new Error('The CV must include a name and profile summary.');
  if (!value?.coverLetterDocument || typeof value.coverLetterDocument !== 'object') throw new Error('The application draft is missing its structured cover-letter content.');
  if (!text(value.coverLetterDocument.salutation) || !list(value.coverLetterDocument.paragraphs).some((paragraph) => text(paragraph))) throw new Error('The cover letter must include a salutation and at least one paragraph.');
}
