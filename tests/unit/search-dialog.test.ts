import { describe, it, expect } from 'vitest';

// --- Logic extracted from SearchDialog for testability ---

function shouldTriggerSearch(e: { metaKey: boolean; ctrlKey: boolean; key: string }): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'k';
}

function shouldCloseOnEscape(e: { key: string }): boolean {
  return e.key === 'Escape';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

function getResultPath(url: string): string {
  if (url.startsWith('/docs/')) return 'Docs';
  if (url.startsWith('/blog/')) return 'Blog';
  return '';
}

function renderResults(results: SearchResult[], query: string): string {
  if (!query.trim()) {
    return '<p class="search-empty">Type to search documentation and blog posts</p>';
  }

  if (results.length === 0) {
    return `<p class="search-no-results">No results for "${escapeHtml(query)}"</p>`;
  }

  return results
    .slice(0, 8)
    .map(
      (r) => {
        const pathLabel = getResultPath(r.url);
        return `<a href="${r.url}" class="search-result-item"><p class="search-result-title">${escapeHtml(r.title)}</p>${pathLabel ? `<span class="search-result-path">${pathLabel}</span>` : ''}<p class="search-result-excerpt">${r.excerpt}</p></a>`;
      }
    )
    .join('');
}

// --- Tests ---

describe('Search keyboard shortcuts', () => {
  it('triggers on Cmd+K (macOS)', () => {
    expect(shouldTriggerSearch({ metaKey: true, ctrlKey: false, key: 'k' })).toBe(true);
  });

  it('triggers on Ctrl+K (Windows/Linux)', () => {
    expect(shouldTriggerSearch({ metaKey: false, ctrlKey: true, key: 'k' })).toBe(true);
  });

  it('does not trigger on plain K', () => {
    expect(shouldTriggerSearch({ metaKey: false, ctrlKey: false, key: 'k' })).toBe(false);
  });

  it('does not trigger on Cmd+other', () => {
    expect(shouldTriggerSearch({ metaKey: true, ctrlKey: false, key: 'j' })).toBe(false);
  });

  it('closes on Escape', () => {
    expect(shouldCloseOnEscape({ key: 'Escape' })).toBe(true);
  });

  it('does not close on other keys', () => {
    expect(shouldCloseOnEscape({ key: 'Enter' })).toBe(false);
  });
});

describe('Search result rendering', () => {
  const sampleResults: SearchResult[] = [
    { url: '/docs/getting-started', title: 'Getting Started', excerpt: 'Learn how to install and configure...' },
    { url: '/docs/configuration', title: 'Configuration', excerpt: 'All available <mark>configuration</mark> options...' },
    { url: '/blog/deploy', title: 'Deploy Guide', excerpt: 'How to deploy your application...' },
  ];

  it('renders up to 8 results', () => {
    const html = renderResults(sampleResults, 'config');
    const count = (html.match(/class="search-result-item"/g) || []).length;
    expect(count).toBe(3);
  });

  it('truncates to 8 results when more are returned', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      url: `/docs/page-${i}`,
      title: `Page ${i}`,
      excerpt: `Excerpt ${i}`,
    }));
    const html = renderResults(many, 'page');
    const count = (html.match(/class="search-result-item"/g) || []).length;
    expect(count).toBe(8);
  });

  it('shows empty state when query is empty', () => {
    const html = renderResults([], '');
    expect(html).toContain('search-empty');
  });

  it('shows no-results state when no results match', () => {
    const html = renderResults([], 'nonexistent');
    expect(html).toContain('No results');
    expect(html).toContain('nonexistent');
  });

  it('escapes HTML in titles to prevent XSS', () => {
    const malicious: SearchResult[] = [
      { url: '/docs/test', title: '<script>alert("xss")</script>', excerpt: 'safe' },
    ];
    const html = renderResults(malicious, 'test');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Result path labels', () => {
  it('labels docs pages with "Docs"', () => {
    expect(getResultPath('/docs/getting-started')).toBe('Docs');
  });

  it('labels blog pages with "Blog"', () => {
    expect(getResultPath('/blog/introducing-swe-squad')).toBe('Blog');
  });

  it('returns empty string for non-docs/blog paths', () => {
    expect(getResultPath('/features')).toBe('');
    expect(getResultPath('/pricing')).toBe('');
    expect(getResultPath('/')).toBe('');
  });

  it('includes path label in rendered docs results', () => {
    const html = renderResults(
      [{ url: '/docs/introduction', title: 'Introduction', excerpt: 'Get started...' }],
      'intro'
    );
    expect(html).toContain('search-result-path');
    expect(html).toContain('Docs');
  });

  it('includes path label in rendered blog results', () => {
    const html = renderResults(
      [{ url: '/blog/deploy', title: 'Deploy Guide', excerpt: 'How to deploy...' }],
      'deploy'
    );
    expect(html).toContain('Blog');
  });

  it('omits path label for non-docs/blog results', () => {
    const html = renderResults(
      [{ url: '/features', title: 'Features', excerpt: 'All features...' }],
      'features'
    );
    expect(html).not.toContain('search-result-path');
  });
});

describe('HTML escaping', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
