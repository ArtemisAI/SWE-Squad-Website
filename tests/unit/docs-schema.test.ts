import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const docsSchema = z.object({
  title: z.string(),
  description: z.string(),
  section: z.string(),
  order: z.number(),
});

describe('Docs content collection schema', () => {
  it('validates a correct docs frontmatter', () => {
    const input = {
      title: 'Introduction',
      description: 'Get started with SWE-Squad',
      section: 'Getting Started',
      order: 1,
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const input = {
      description: 'Get started with SWE-Squad',
      section: 'Getting Started',
      order: 1,
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const input = {
      title: 'Introduction',
      section: 'Getting Started',
      order: 1,
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing section', () => {
    const input = {
      title: 'Introduction',
      description: 'Get started with SWE-Squad',
      order: 1,
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing order', () => {
    const input = {
      title: 'Introduction',
      description: 'Get started with SWE-Squad',
      section: 'Getting Started',
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric order', () => {
    const input = {
      title: 'Introduction',
      description: 'Get started with SWE-Squad',
      section: 'Getting Started',
      order: 'first',
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-string title', () => {
    const input = {
      title: 123,
      description: 'Get started with SWE-Squad',
      section: 'Getting Started',
      order: 1,
    };
    const result = docsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
