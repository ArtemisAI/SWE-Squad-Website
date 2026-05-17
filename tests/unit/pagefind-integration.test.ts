import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Pagefind build configuration', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
  );

  it('includes pagefind as a dependency', () => {
    expect(pkg.dependencies.pagefind).toBeDefined();
  });

  it('build script runs pagefind after astro build', () => {
    expect(pkg.scripts.build).toContain('astro build');
    expect(pkg.scripts.build).toContain('pagefind');
  });

  it('indexes docs pages with --glob flag', () => {
    expect(pkg.scripts.build).toContain("--glob 'docs/**/*.html'");
  });

  it('indexes blog pages with --glob flag', () => {
    expect(pkg.scripts.build).toContain("--glob 'blog/**/*.html'");
  });

  it('runs pagefind against the dist directory', () => {
    expect(pkg.scripts.build).toContain('--site dist');
  });
});

describe('Pagefind indexing attributes', () => {
  const docsLayout = readFileSync(
    resolve(__dirname, '../../src/layouts/DocsLayout.astro'),
    'utf-8'
  );

  const blogLayout = readFileSync(
    resolve(__dirname, '../../src/layouts/BlogPost.astro'),
    'utf-8'
  );

  it('DocsLayout marks main content with data-pagefind-body', () => {
    expect(docsLayout).toContain('data-pagefind-body');
  });

  it('DocsLayout provides pagefind meta title', () => {
    expect(docsLayout).toContain('data-pagefind-meta="title"');
  });

  it('DocsLayout provides pagefind meta description', () => {
    expect(docsLayout).toContain('data-pagefind-meta="description"');
  });

  it('DocsLayout sidebar is excluded from indexing', () => {
    expect(docsLayout).toContain('data-pagefind-ignore');
  });

  it('BlogPost marks main content with data-pagefind-body', () => {
    expect(blogLayout).toContain('data-pagefind-body');
  });

  it('BlogPost provides pagefind meta title', () => {
    expect(blogLayout).toContain('data-pagefind-meta="title"');
  });

  it('BlogPost provides pagefind meta description', () => {
    expect(blogLayout).toContain('data-pagefind-meta="description"');
  });

  it('BlogPost TOC is excluded from indexing', () => {
    expect(blogLayout).toContain('data-pagefind-ignore');
  });
});

describe('SearchDialog component integration', () => {
  const baseLayout = readFileSync(
    resolve(__dirname, '../../src/layouts/BaseLayout.astro'),
    'utf-8'
  );

  const docsLayout = readFileSync(
    resolve(__dirname, '../../src/layouts/DocsLayout.astro'),
    'utf-8'
  );

  const blogLayout = readFileSync(
    resolve(__dirname, '../../src/layouts/BlogPost.astro'),
    'utf-8'
  );

  const searchDialog = readFileSync(
    resolve(__dirname, '../../src/components/SearchDialog.astro'),
    'utf-8'
  );

  it('BaseLayout includes SearchDialog for site-wide access', () => {
    expect(baseLayout).toContain('SearchDialog');
  });

  it('DocsLayout includes SearchDialog', () => {
    expect(docsLayout).toContain('SearchDialog');
  });

  it('BlogPost layout includes SearchDialog', () => {
    expect(blogLayout).toContain('SearchDialog');
  });

  it('SearchDialog has keyboard shortcut Cmd+K / Ctrl+K', () => {
    expect(searchDialog).toContain("e.key === 'k'");
    expect(searchDialog).toContain('e.metaKey || e.ctrlKey');
  });

  it('SearchDialog loads Pagefind client', () => {
    expect(searchDialog).toContain("import('/pagefind/pagefind.js')");
  });

  it('SearchDialog has search input with placeholder', () => {
    expect(searchDialog).toContain('search-input');
    expect(searchDialog).toContain('Search docs and blog');
  });

  it('SearchDialog has loading indicator', () => {
    expect(searchDialog).toContain('search-loading');
  });

  it('SearchDialog limits results to 8 items', () => {
    expect(searchDialog).toContain('.slice(0, 8)');
  });

  it('SearchDialog has focus trap for accessibility', () => {
    expect(searchDialog).toContain('trapFocus');
  });

  it('SearchDialog has dialog ARIA attributes', () => {
    expect(searchDialog).toContain('role="dialog"');
    expect(searchDialog).toContain('aria-modal="true"');
  });

  it('SearchDialog has backdrop for click-to-close', () => {
    expect(searchDialog).toContain('search-backdrop');
  });

  it('SearchDialog uses design system CSS variables', () => {
    expect(searchDialog).toContain('var(--color-bg');
    expect(searchDialog).toContain('var(--color-text-primary');
    expect(searchDialog).toContain('var(--color-border');
  });
});
