import { describe, it, expect } from 'vitest';

interface SidebarItem {
  slug: string;
  title: string;
}

interface SidebarSection {
  name: string;
  items: SidebarItem[];
}

interface DocEntry {
  slug: string;
  title: string;
  section: string;
  order: number;
}

function buildSidebarSections(docs: DocEntry[]): SidebarSection[] {
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

  const sections: SidebarSection[] = [];
  for (const [name, items] of sectionsMap) {
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

const sampleDocs: DocEntry[] = [
  { slug: 'introduction', title: 'Introduction', section: 'Getting Started', order: 1 },
  { slug: 'installation', title: 'Installation', section: 'Getting Started', order: 2 },
  { slug: 'configuration', title: 'Configuration', section: 'Getting Started', order: 3 },
  { slug: 'running', title: 'Running SWE-Squad', section: 'Getting Started', order: 4 },
  { slug: 'architecture', title: 'Architecture', section: 'Core Concepts', order: 1 },
  { slug: 'agents', title: 'Agents', section: 'Core Concepts', order: 2 },
  { slug: 'api-reference', title: 'API Reference', section: 'API', order: 1 },
];

describe('Sidebar sections', () => {
  it('groups docs by section', () => {
    const sections = buildSidebarSections(sampleDocs);
    expect(sections).toHaveLength(3);
    expect(sections.map((s) => s.name)).toEqual(['API', 'Core Concepts', 'Getting Started']);
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
    const { prev, next } = getPrevNext(sampleDocs, 'running');
    expect(prev?.slug).toBe('configuration');
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
});
