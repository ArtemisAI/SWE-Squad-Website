import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.date(),
  author: z.string(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
});

describe('Blog content collection schema', () => {
  it('validates a correct blog frontmatter with all fields', () => {
    const input = {
      title: 'Introducing SWE-Squad',
      description: 'Learn about our AI platform',
      date: new Date('2025-01-15'),
      author: 'SWE-Squad Team',
      tags: ['ai', 'announcement'],
      image: '/blog/hero.png',
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates blog frontmatter without optional image', () => {
    const input = {
      title: 'Model Routing',
      description: 'How we route tasks to models',
      date: new Date('2025-02-10'),
      author: 'Engineering Team',
      tags: ['engineering'],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates blog frontmatter without tags (defaults to empty array)', () => {
    const input = {
      title: 'Stability Gates',
      description: 'Preventing regressions',
      date: new Date('2025-03-05'),
      author: 'Platform Team',
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects missing title', () => {
    const input = {
      description: 'A blog post',
      date: new Date('2025-01-15'),
      author: 'Team',
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const input = {
      title: 'A Post',
      date: new Date('2025-01-15'),
      author: 'Team',
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const input = {
      title: 'A Post',
      description: 'A blog post',
      author: 'Team',
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing author', () => {
    const input = {
      title: 'A Post',
      description: 'A blog post',
      date: new Date('2025-01-15'),
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-date date field', () => {
    const input = {
      title: 'A Post',
      description: 'A blog post',
      date: '2025-01-15',
      author: 'Team',
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-string title', () => {
    const input = {
      title: 123,
      description: 'A blog post',
      date: new Date('2025-01-15'),
      author: 'Team',
      tags: [],
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-array tags', () => {
    const input = {
      title: 'A Post',
      description: 'A blog post',
      date: new Date('2025-01-15'),
      author: 'Team',
      tags: 'ai',
    };
    const result = blogSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
