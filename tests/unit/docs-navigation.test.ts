import { describe, it, expect } from 'vitest';

interface SidebarItem {
  slug: string;
  title: string;
}

interface SidebarSection {
  name: string;
  items: SidebarItem[];
  defaultExpanded?: boolean;
}

interface DocEntry {
  slug: string;
  title: string;
  section: string;
  order: number;
}

function buildSidebarSections(docs: DocEntry[], sectionOrder?: string[]): SidebarSection[] {
  const sortedDocs = [...docs].sort((a, b) => {
    if (a.section !== b.section) {
      return a.section.localeCompare(b.section);
    }
    return a.order - b.order;
  });

  const sectionsMap = new Map<string, SidebarItem[]>();
  for (const doc of sortedDocs) {
    const items = sectionsMap.get(doc.section) || [];
    items.push({ slug: doc.slug, title: doc.title });
    sectionsMap.set(doc.section, items);
  }

  let orderedEntries: [string, SidebarItem[]][];
  if (sectionOrder) {
    orderedEntries = [...sectionsMap.entries()].sort((a, b) => {
      const ai = sectionOrder.indexOf(a[0]);
      const bi = sectionOrder.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    orderedEntries = [...sectionsMap.entries()];
  }

  const sections: SidebarSection[] = [];
  for (const [name, items] of orderedEntries) {
    sections.push({ name, items });
  }
  return sections;
}

function getPrevNext(docs: DocEntry[], currentSlug: string) {
  const sorted = [...docs].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.order - b.order;
  });
  const idx = sorted.findIndex((d) => d.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

function buildBreadcrumbs(section: string, title: string) {
  return [
    { label: 'Docs', href: '/docs' },
    { label: section },
    { label: title },
  ];
}

function computeSectionExpansion(sections: SidebarSection[], currentSlug: string): SidebarSection[] {
  return sections.map((section) => ({
    ...section,
    defaultExpanded: section.defaultExpanded ?? section.items.some((item) => item.slug === currentSlug),
  }));
}

const SECTION_ORDER = ['Getting Started', 'Core Concepts', 'API', 'Reference'];

const sampleDocs: DocEntry[] = [
  { slug: 'introduction', title: 'Introduction', section: 'Getting Started', order: 1 },
  { slug: 'installation', title: 'Installation', section: 'Getting Started', order: 2 },
  { slug: 'configuration', title: 'Configuration', section: 'Getting Started', order: 3 },
  { slug: 'running', title: 'Running SWE-Squad', section: 'Getting Started', order: 4 },
  { slug: 'architecture', title: 'Architecture', section: 'Core Concepts', order: 1 },
  { slug: 'agents', title: 'Agents', section: 'Core Concepts', order: 2 },
  { slug: 'api-reference', title: 'API Reference', section: 'API', order: 1 },
  { slug: 'configuration-reference', title: 'Configuration Reference', section: 'Reference', order: 1 },
  { slug: 'cli-reference', title: 'CLI Reference', section: 'Reference', order: 2 },
];

describe('Sidebar sections', () => {
  it('groups docs by section', () => {
    const sections = buildSidebarSections(sampleDocs);
    expect(sections).toHaveLength(4);
  });

  it('sorts items within each section by order', () => {
    const sections = buildSidebarSections(sampleDocs);
    const started = sections.find((s) => s.name === 'Getting Started')!;
    expect(started.items.map((i) => i.slug)).toEqual([
      'introduction',
      'installation',
      'configuration',
      'running',
    ]);
  });

  it('handles empty docs list', () => {
    const sections = buildSidebarSections([]);
    expect(sections).toHaveLength(0);
  });

  it('uses explicit section ordering when provided', () => {
    const sections = buildSidebarSections(sampleDocs, SECTION_ORDER);
    expect(sections.map((s) => s.name)).toEqual([
      'Getting Started',
      'Core Concepts',
      'API',
      'Reference',
    ]);
  });

  it('places unknown sections after known ones in explicit ordering', () => {
    const docs: DocEntry[] = [
      { slug: 'a', title: 'A', section: 'Zebra', order: 1 },
      { slug: 'b', title: 'B', section: 'Getting Started', order: 1 },
      { slug: 'c', title: 'C', section: 'Mysterious', order: 1 },
    ];
    const sections = buildSidebarSections(docs, SECTION_ORDER);
    expect(sections.map((s) => s.name)).toEqual([
      'Getting Started',
      'Mysterious',
      'Zebra',
    ]);
  });
});

describe('Sidebar section expansion', () => {
  it('auto-expands section containing current page', () => {
    const sections = buildSidebarSections(sampleDocs);
    const expanded = computeSectionExpansion(sections, 'architecture');
    const coreConcepts = expanded.find((s) => s.name === 'Core Concepts')!;
    expect(coreConcepts.defaultExpanded).toBe(true);
  });

  it('collapses section not containing current page', () => {
    const sections = buildSidebarSections(sampleDocs);
    const expanded = computeSectionExpansion(sections, 'introduction');
    const api = expanded.find((s) => s.name === 'API')!;
    expect(api.defaultExpanded).toBe(false);
  });

  it('respects explicit defaultExpanded when set', () => {
    const sections: SidebarSection[] = [
      { name: 'A', items: [{ slug: 'x', title: 'X' }], defaultExpanded: true },
      { name: 'B', items: [{ slug: 'y', title: 'Y' }], defaultExpanded: false },
    ];
    const expanded = computeSectionExpansion(sections, 'y');
    expect(expanded.find((s) => s.name === 'A')!.defaultExpanded).toBe(true);
    expect(expanded.find((s) => s.name === 'B')!.defaultExpanded).toBe(false);
  });

  it('expands all sections when no current slug matches any', () => {
    const sections = buildSidebarSections(sampleDocs);
    const expanded = computeSectionExpansion(sections, 'nonexistent');
    expect(expanded.every((s) => s.defaultExpanded === false)).toBe(true);
  });
});

describe('Prev/Next navigation', () => {
  it('returns prev and next for a middle doc', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'installation');
    expect(prev?.slug).toBe('introduction');
    expect(next?.slug).toBe('configuration');
  });

  it('returns null prev for the first doc in sorted order', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'api-reference');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('architecture');
  });

  it('returns null next for the last doc in sorted order', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'cli-reference');
    expect(prev?.slug).toBe('configuration-reference');
    expect(next).toBeNull();
  });

  it('returns correct prev/next for configuration (not last in Getting Started)', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'configuration');
    expect(prev?.slug).toBe('installation');
    expect(next?.slug).toBe('running');
  });

  it('returns null for unknown slug', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'nonexistent');
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });

  it('navigates across sections', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'agents');
    expect(prev?.slug).toBe('architecture');
    expect(next?.slug).toBe('introduction');
  });
});

describe('Breadcrumbs', () => {
  it('builds correct breadcrumb trail', () => {
    const crumbs = buildBreadcrumbs('Getting Started', 'Installation');
    expect(crumbs).toEqual([
      { label: 'Docs', href: '/docs' },
      { label: 'Getting Started' },
      { label: 'Installation' },
    ]);
  });

  it('last breadcrumb has no href (current page)', () => {
    const crumbs = buildBreadcrumbs('Core Concepts', 'Architecture');
    const last = crumbs[crumbs.length - 1];
    expect(last.href).toBeUndefined();
  });

  it('middle breadcrumb (section) has no href', () => {
    const crumbs = buildBreadcrumbs('Reference', 'CLI Reference');
    expect(crumbs[1].href).toBeUndefined();
  });
});
