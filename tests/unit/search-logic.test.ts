import { describe, it, expect } from 'vitest';

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

interface PagefindResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

function filterSearchResults(
  results: PagefindResult[],
  options?: { basePath?: string }
): SearchResult[] {
  let filtered = results;

  if (options?.basePath) {
    const prefix = options.basePath;
    filtered = results.filter((r) => r.url.startsWith(prefix));
  }

  return filtered.map((r) => ({
    url: r.url,
    title: r.meta?.title || r.url,
    excerpt: r.excerpt || '',
  }));
}

function highlightExcerpt(excerpt: string, query: string): string {
  if (!query) return excerpt;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return excerpt.replace(regex, '<mark>$1</mark>');
}

function truncateExcerpt(excerpt: string, maxLength: number = 120): string {
  if (excerpt.length <= maxLength) return excerpt;
  return excerpt.slice(0, maxLength).trimEnd() + '…';
}

function sortSearchResults<T extends { score?: number }>(results: T[]): T[] {
  return [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

const sampleResults: PagefindResult[] = [
  {
    url: '/docs/introduction',
    meta: { title: 'Introduction' },
    excerpt: 'Get started with SWE-Squad, an AI-powered platform for incident management.',
  },
  {
    url: '/docs/installation',
    meta: { title: 'Installation' },
    excerpt: 'Install SWE-Squad using Docker or npm. Configuration options available.',
  },
  {
    url: '/docs/configuration',
    meta: { title: 'Configuration' },
    excerpt: 'Configure SWE-Squad with environment variables and config files.',
  },
  {
    url: '/blog/introducing-swe-squad',
    meta: { title: 'Introducing SWE-Squad' },
    excerpt: 'We are excited to announce the SWE-Squad platform for AI-driven incident management.',
  },
  {
    url: '/docs/api-reference',
    meta: { title: 'API Reference' },
    excerpt: 'Complete API reference for the SWE-Squad REST and GraphQL endpoints.',
  },
];

describe('Search result filtering', () => {
  it('returns all results when no filter options', () => {
    const filtered = filterSearchResults(sampleResults);
    expect(filtered).toHaveLength(5);
  });

  it('filters results by base path for docs only', () => {
    const filtered = filterSearchResults(sampleResults, { basePath: '/docs/' });
    expect(filtered).toHaveLength(4);
    expect(filtered.every((r) => r.url.startsWith('/docs/'))).toBe(true);
  });

  it('filters results by base path for blog only', () => {
    const filtered = filterSearchResults(sampleResults, { basePath: '/blog/' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].url).toBe('/blog/introducing-swe-squad');
  });

  it('returns empty for non-matching base path', () => {
    const filtered = filterSearchResults(sampleResults, { basePath: '/pricing/' });
    expect(filtered).toHaveLength(0);
  });

  it('maps results to SearchResult format', () => {
    const filtered = filterSearchResults(sampleResults.slice(0, 1));
    expect(filtered[0]).toEqual({
      url: '/docs/introduction',
      title: 'Introduction',
      excerpt: 'Get started with SWE-Squad, an AI-powered platform for incident management.',
    });
  });

  it('uses url as fallback title when meta.title missing', () => {
    const results: PagefindResult[] = [
      { url: '/docs/missing', meta: { title: '' }, excerpt: '' },
    ];
    const filtered = filterSearchResults(results);
    expect(filtered[0].title).toBe('/docs/missing');
  });
});

describe('Search excerpt highlighting', () => {
  it('wraps matching query text in mark tags', () => {
    const result = highlightExcerpt(
      'Get started with SWE-Squad configuration',
      'configuration'
    );
    expect(result).toBe('Get started with SWE-Squad <mark>configuration</mark>');
  });

  it('highlights case-insensitively', () => {
    const result = highlightExcerpt(
      'Configure SWE-Squad with environment variables',
      'configure'
    );
    expect(result).toBe('<mark>Configure</mark> SWE-Squad with environment variables');
  });

  it('highlights multiple occurrences', () => {
    const result = highlightExcerpt(
      'SWE-Squad AI platform uses AI for incident management',
      'AI'
    );
    expect(result).toBe('SWE-Squad <mark>AI</mark> platform uses <mark>AI</mark> for incident management');
  });

  it('returns unchanged excerpt for empty query', () => {
    const excerpt = 'Some text here';
    const result = highlightExcerpt(excerpt, '');
    expect(result).toBe(excerpt);
  });

  it('escapes regex special characters in query', () => {
    const result = highlightExcerpt(
      'Use (optional) config for setup',
      '(optional)'
    );
    expect(result).toBe('Use <mark>(optional)</mark> config for setup');
  });
});

describe('Search excerpt truncation', () => {
  it('returns full excerpt when within max length', () => {
    const result = truncateExcerpt('Short text', 120);
    expect(result).toBe('Short text');
  });

  it('truncates long excerpts and adds ellipsis', () => {
    const longText = 'a'.repeat(150);
    const result = truncateExcerpt(longText, 120);
    expect(result.length).toBe(121); // 120 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('respects custom max length', () => {
    const text = 'This is a longer excerpt that should be truncated';
    const result = truncateExcerpt(text, 20);
    expect(result.length).toBe(21);
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles exact length text', () => {
    const text = 'a'.repeat(120);
    const result = truncateExcerpt(text, 120);
    expect(result).toBe(text);
  });
});

describe('Search result sorting', () => {
  it('sorts results by score descending', () => {
    const results = [
      { url: '/a', score: 0.5 },
      { url: '/b', score: 0.9 },
      { url: '/c', score: 0.3 },
    ];
    const sorted = sortSearchResults(results);
    expect(sorted.map((r) => r.url)).toEqual(['/b', '/a', '/c']);
  });

  it('treats missing score as 0', () => {
    const results = [
      { url: '/a', score: 0.5 },
      { url: '/b' },
      { url: '/c', score: 0.1 },
    ];
    const sorted = sortSearchResults(results);
    expect(sorted.map((r) => r.url)).toEqual(['/a', '/c', '/b']);
  });

  it('does not mutate original array', () => {
    const results = [
      { url: '/a', score: 0.1 },
      { url: '/b', score: 0.9 },
    ];
    sortSearchResults(results);
    expect(results[0].url).toBe('/a');
  });
});
