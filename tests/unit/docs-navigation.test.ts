import { describe, it, expect } from 'vitest';

interface SidebarItem {
  id: string;
  title: string;
}

interface SidebarSection {
  name: string;
  items: SidebarItem[];
}

interface DocEntry {
  id: string;
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
    items.push({ id: doc.id, title: doc.title });
    sectionsMap.set(doc.section, items);
  }

  const sections: SidebarSection[] = [];
  for (const [name, items] of sectionsMap) {
    sections.push({ name, items });
  }
  return sections;
}

function getPrevNext(docs: DocEntry[], currentId: string) {
  const sorted = [...docs].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.order - b.order;
  });
  const idx = sorted.findIndex((d) => d.id === currentId);
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
  { id: 'introduction', title: 'Introduction', section: 'Getting Started', order: 1 },
  { id: 'installation', title: 'Installation', section: 'Getting Started', order: 2 },
  { id: 'configuration', title: 'Configuration', section: 'Getting Started', order: 3 },
  { id: 'running', title: 'Running SWE-Squad', section: 'Getting Started', order: 4 },
  { id: 'architecture', title: 'Architecture', section: 'Core Concepts', order: 1 },
  { id: 'agents', title: 'Agents', section: 'Core Concepts', order: 2 },
  { id: 'api-reference', title: 'API Reference', section: 'API', order: 1 },
  { id: 'configuration-reference', title: 'Configuration Reference', section: 'Reference', order: 1 },
  { id: 'provider-plugin-guide', title: 'Provider Plugin Development Guide', section: 'Advanced', order: 1 },
];

describe('Sidebar sections', () => {
  it('groups docs by section', () => {
    const sections = buildSidebarSections(sampleDocs);
    expect(sections).toHaveLength(5);
    expect(sections.map((s) => s.name)).toEqual(['Advanced', 'API', 'Core Concepts', 'Getting Started', 'Reference']);
  });

  it('sorts items within each section by order', () => {
    const sections = buildSidebarSections(sampleDocs);
    const started = sections.find((s) => s.name === 'Getting Started')!;
    expect(started.items.map((i) => i.id)).toEqual([
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
    expect(prev?.id).toBe('introduction');
    expect(next?.id).toBe('configuration');
  });

  it('returns null prev for the first doc in sorted order', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'provider-plugin-guide');
    expect(prev).toBeNull();
    expect(next?.id).toBe('api-reference');
  });

  it('returns null next for the last doc in sorted order', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'configuration-reference');
    expect(prev?.id).toBe('running');
    expect(next).toBeNull();
  });

  it('returns correct prev/next for configuration (not last in Getting Started)', () => {
    const { prev, next } = getPrevNext(sampleDocs, 'configuration');
    expect(prev?.id).toBe('installation');
    expect(next?.id).toBe('running');
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
