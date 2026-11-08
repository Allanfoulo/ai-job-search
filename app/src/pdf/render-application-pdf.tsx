import { readFile, writeFile } from 'node:fs/promises';
import { createElement, type ReactNode } from 'react';
import { render } from 'takumi-pdf';
import { PageNumber as PdfPageNumber } from '@/components/pdf/page-number/page-number';
import { PageFooter } from '@/components/pdf/page-footer/page-footer';
import { Heading } from '@/components/pdf/heading/heading';
import { Link } from '@/components/pdf/link/link';
import { PdfList } from '@/components/pdf/list/list';
import { Section } from '@/components/pdf/section/section';
import { Text } from '@/components/pdf/text/text';
import { PdfcnThemeProvider } from '@/components/pdf/theme-provider';
import { professionalTheme } from '@/lib/pdf-themes/professional';
import { Document, Page } from '@/lib/pdf-primitives';

const h = createElement;
const headingColor = professionalTheme.colors.primary;
const titleStyle = { marginTop: 0, marginBottom: 2 };
const cvTheme = {
  ...professionalTheme,
  primitives: {
    ...professionalTheme.primitives,
    spacing: { ...professionalTheme.primitives.spacing, 2: 5, 3: 7, 4: 9, 5: 11, 6: 13, 8: 17, 10: 20, 12: 24, 16: 30 },
    typography: { ...professionalTheme.primitives.typography, xs: 8, sm: 8.5, base: 9.5, lg: 11, xl: 12, '2xl': 14, '3xl': 22 },
  },
  spacing: { ...professionalTheme.spacing, paragraphGap: 3, componentGap: 4, sectionGap: 7 },
  typography: {
    ...professionalTheme.typography,
    body: { ...professionalTheme.typography.body, fontSize: 9.5, lineHeight: 1.2 },
    heading: { ...professionalTheme.typography.heading, lineHeight: 1.1, fontSize: { h1: 23, h2: 14, h3: 11, h4: 10, h5: 9, h6: 9 } },
  },
};
const letterTheme = {
  ...professionalTheme,
  primitives: {
    ...professionalTheme.primitives,
    spacing: { ...professionalTheme.primitives.spacing, 2: 5, 3: 7, 4: 9, 5: 11, 6: 13 },
    typography: { ...professionalTheme.primitives.typography, base: 10, lg: 11, xl: 13, '2xl': 16, '3xl': 22 },
  },
  spacing: { ...professionalTheme.spacing, paragraphGap: 4, componentGap: 4, sectionGap: 8 },
  typography: {
    ...professionalTheme.typography,
    body: { ...professionalTheme.typography.body, fontSize: 10, lineHeight: 1.22 },
    heading: { ...professionalTheme.typography.heading, lineHeight: 1.1, fontSize: { h1: 23, h2: 15, h3: 12, h4: 10, h5: 9, h6: 9 } },
  },
};

function contactLine(contact: any): string {
  return [...(contact?.phones || [])].join('  |  ');
}

function stringList(items: unknown): string[] {
  return Array.isArray(items) ? items.map((item) => String(item ?? '').trim()).filter(Boolean) : [];
}

function PdfHeader({ name, headline, contact }: any) {
  return h(Section, { spacing: 'sm', padding: 'none', children: [
    h(Heading, { key: 'name', level: 1, color: headingColor, noMargin: true, style: titleStyle, children: name }),
    headline ? h(Text, { key: 'headline', variant: 'lg', weight: 'semibold', color: professionalTheme.colors.mutedForeground, children: headline }) : null,
    contactLine(contact) ? h(Text, { key: 'contact', variant: 'sm', children: contactLine(contact) }) : null,
    contact?.portfolioUrl ? h(Link, {
      key: 'portfolio',
      href: contact.portfolioUrl,
      children: contact.portfolioUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    }) : null,
  ] });
}

function CvSection({ title, children }: { title: string; children: ReactNode }) {
  return h(Section, { spacing: 'sm', padding: 'none', children: [
    h(Heading, { key: 'heading', level: 2, color: headingColor, tracking: 'wide', children: title }),
    children,
  ] });
}

function CvLayout({ document }: { document: any }) {
  const experience = Array.isArray(document.experience) ? document.experience : [];
  const education = Array.isArray(document.education) ? document.education : [];
  const competencies = Array.isArray(document.competencies) ? document.competencies : [];
  const languages = Array.isArray(document.languages) ? document.languages : [];
  const additional = Array.isArray(document.additionalSections) ? document.additionalSections : [];
  const nodes: ReactNode[] = [
    h(PdfHeader, { key: 'header', name: document.fullName, headline: document.headline, contact: document.contact }),
  ];
  if (document.summary) nodes.push(h(Text, { key: 'summary', variant: 'base', children: document.summary }));
  if (competencies.length) {
    const items = competencies.map((item: any) => typeof item === 'string'
      ? item
      : [item.label, item.details || item.text].filter(Boolean).join(': '));
    nodes.push(h(CvSection, { key: 'competencies', title: 'Core Competencies', children: h(PdfList, { items: items.map((text: string) => ({ text })), gap: 'xs' }) }));
  }
  if (experience.length) nodes.push(h(CvSection, {
    key: 'experience', title: 'Professional Experience', children: experience.map((entry: any, index: number) => h(Section, {
    key: `experience-${index}`, spacing: 'none', padding: 'none', noWrap: true, children: [
        h(Heading, { key: 'title', level: 3, weight: 'semibold', noMargin: true, children: [entry.title, entry.company ? ` | ${entry.company}` : ''].join('') }),
        h(Text, { key: 'meta', variant: 'sm', color: professionalTheme.colors.mutedForeground, children: [entry.dateRange, entry.location].filter(Boolean).join(' | ') }),
        entry.description ? h(Text, { key: 'description', children: entry.description }) : null,
        stringList(entry.bullets).length ? h(PdfList, { key: 'bullets', items: stringList(entry.bullets).map((text) => ({ text })), gap: 'xs' }) : null,
      ],
    })),
  }));
  if (education.length) nodes.push(h(CvSection, {
    key: 'education', title: 'Education', children: education.map((entry: any, index: number) => h(Section, {
      key: `education-${index}`, spacing: 'none', padding: 'none', noWrap: true, children: [
        h(Heading, { key: 'qualification', level: 3, weight: 'semibold', noMargin: true, children: [entry.qualification, entry.institution ? ` | ${entry.institution}` : ''].join('') }),
        h(Text, { key: 'meta', variant: 'sm', color: professionalTheme.colors.mutedForeground, children: [entry.dateRange, entry.location].filter(Boolean).join(' | ') }),
        entry.description ? h(Text, { key: 'description', children: entry.description }) : null,
      ],
    })),
  }));
  if (stringList(document.technicalSkills).length) nodes.push(h(CvSection, {
    key: 'skills', title: 'Technical Skills', children: h(PdfList, { items: stringList(document.technicalSkills).map((text) => ({ text })), gap: 'xs' }),
  }));
  if (languages.length) nodes.push(h(CvSection, {
    key: 'languages', title: 'Languages', children: h(PdfList, { items: languages.map((language: any) => ({
      text: typeof language === 'string' ? language : [language.language, language.proficiency].filter(Boolean).join(' - '),
    })), gap: 'xs' }),
  }));
  for (const [index, section] of additional.entries()) {
    if (!section?.heading || !Array.isArray(section.items) || !section.items.length) continue;
    nodes.push(h(CvSection, { key: `additional-${index}`, title: section.heading, children: h(PdfList, { items: section.items.map((text: string) => ({ text })), gap: 'xs' }) }));
  }
  return h(Document, { title: `${document.fullName} CV`, children: h(Page, { size: 'a4', children: h(PdfcnThemeProvider, { theme: cvTheme, children: nodes }) }) });
}

function CoverLetterLayout({ document, cv }: { document: any; cv: any }) {
  const paragraphs = stringList(document.paragraphs);
  const bullets = Array.isArray(document.bullets) ? document.bullets : [];
  const name = document.fullName || cv.fullName;
  const companyAndRole = [document.roleTitle, document.company].filter(Boolean).join(' | ');
  const nodes: ReactNode[] = [
    h(PdfHeader, { key: 'header', name, headline: companyAndRole, contact: document.contact }),
    h(Text, { key: 'date', variant: 'sm', align: 'right', color: professionalTheme.colors.mutedForeground, children: new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long' }).format(new Date()) }),
    h(Text, { key: 'salutation', weight: 'semibold', children: document.salutation }),
    ...paragraphs.map((paragraph, index) => h(Text, { key: `paragraph-${index}`, variant: 'base', children: paragraph })),
  ];
  if (document.bulletIntro) nodes.push(h(Text, { key: 'bullet-intro', children: document.bulletIntro }));
  if (bullets.length) nodes.push(h(PdfList, { key: 'bullets', items: bullets.map((bullet: any) => ({
    text: typeof bullet === 'string' ? bullet : [bullet.label ? `${bullet.label}:` : '', bullet.text].filter(Boolean).join(' '),
  })), gap: 'sm' }));
  nodes.push(h(Text, { key: 'closing', children: document.closing || 'Kind regards,' }));
  nodes.push(h(Text, { key: 'signature', variant: 'lg', weight: 'semibold', align: 'right', children: name }));
  return h(Document, { title: `${name} Cover Letter`, children: h(Page, { size: 'a4', children: h(PdfcnThemeProvider, { theme: letterTheme, children: h(Section, { spacing: 'sm', padding: 'none', children: nodes }) }) }) });
}

async function main() {
  const inputFlag = process.argv.indexOf('--input-file');
  const outputFlag = process.argv.indexOf('--output-file');
  if (inputFlag < 0 || outputFlag < 0 || !process.argv[inputFlag + 1] || !process.argv[outputFlag + 1]) {
    throw new Error('Renderer requires --input-file and --output-file.');
  }
  const input = JSON.parse(await readFile(process.argv[inputFlag + 1], 'utf8'));
  const type = input.type === 'cover-letter' ? 'cover-letter' : input.type === 'cv' ? 'cv' : '';
  if (!type) throw new Error('Unknown PDF document type.');
  const cv = input.cvDocument;
  const document = type === 'cv' ? input.cvDocument : input.coverLetterDocument;
  if (!document || !cv) throw new Error('Renderer input is missing the reviewed document content.');
  document.contact = input.contact || {};
  const theme = type === 'cv' ? cvTheme : letterTheme;
  const footer = h(PdfcnThemeProvider, {
    theme,
    children: h(PageFooter, {
      variant: 'simple',
      leftText: type === 'cv' ? 'Curriculum Vitae' : 'Cover Letter',
      rightText: h(PdfPageNumber, { align: 'right', format: 'Page {page} of {total}', size: 'xs' }),
      pagePadding: 48,
    }),
  });
  const node = type === 'cv'
    ? h(CvLayout, { document })
    : h(CoverLetterLayout, { document, cv });
  const pdf = await render(node, {
    size: 'a4',
    margin: type === 'cv' ? { top: 36, right: 40, bottom: 46, left: 40 } : { top: 36, right: 40, bottom: 42, left: 40 },
    footer,
  });
  await writeFile(process.argv[outputFlag + 1], pdf);
}

void main().catch((error) => {
  console.error(String(error?.stack || error));
  process.exitCode = 1;
});
