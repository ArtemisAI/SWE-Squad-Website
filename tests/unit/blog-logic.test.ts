import { describe, it, expect } from 'vitest';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: Date;
  author: string;
  tags: string[];
  image?: string;
}

function sortPostsByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

function collectAllTags(posts: BlogPost[]): string[] {
  const tagSet = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
}

function filterPostsByTag(posts: BlogPost[], tag: string | undefined): BlogPost[] {
  if (!tag) return posts;
  return posts.filter((post) => post.tags.includes(tag));
}

const samplePosts: BlogPost[] = [
  {
    slug: 'introducing-swe-squad',
    title: 'Introducing SWE-Squad',
    description: 'Our AI platform',
    date: new Date('2025-01-15'),
    author: 'SWE-Squad Team',
    tags: ['announcement', 'ai'],
    image: '/blog/intro.png',
  },
  {
    slug: 'model-routing',
    title: 'Model Routing',
    description: 'Task routing explained',
    date: new Date('2025-02-10'),
    author: 'Engineering Team',
    tags: ['engineering', 'ai'],
  },
  {
    slug: 'stability-gates',
    title: 'Stability Gates',
    description: 'Preventing regressions',
    date: new Date('2025-03-05'),
    author: 'Platform Team',
    tags: ['engineering', 'reliability'],
  },
];

describe('Blog post sorting', () => {
  it('sorts posts by date descending (newest first)', () => {
    const sorted = sortPostsByDate(samplePosts);
    expect(sorted.map((p) => p.slug)).toEqual([
      'stability-gates',
      'model-routing',
      'introducing-swe-squad',
    ]);
  });

  it('handles empty posts list', () => {
    const sorted = sortPostsByDate([]);
    expect(sorted).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [...samplePosts];
    sortPostsByDate(samplePosts);
    expect(samplePosts.map((p) => p.slug)).toEqual(original.map((p) => p.slug));
  });
});

describe('Tag collection', () => {
  it('collects all unique tags sorted alphabetically', () => {
    const tags = collectAllTags(samplePosts);
    expect(tags).toEqual(['ai', 'announcement', 'engineering', 'reliability']);
  });

  it('handles posts with no tags', () => {
    const posts: BlogPost[] = [
      {
        slug: 'no-tags',
        title: 'No Tags Post',
        description: 'A post without tags',
        date: new Date('2025-01-01'),
        author: 'Team',
        tags: [],
      },
    ];
    const tags = collectAllTags(posts);
    expect(tags).toEqual([]);
  });

  it('handles empty posts list', () => {
    const tags = collectAllTags([]);
    expect(tags).toEqual([]);
  });
});

describe('Tag filtering', () => {
  it('returns all posts when tag is undefined', () => {
    const filtered = filterPostsByTag(samplePosts, undefined);
    expect(filtered).toHaveLength(3);
  });

  it('filters posts by a single tag', () => {
    const filtered = filterPostsByTag(samplePosts, 'ai');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((p) => p.slug)).toEqual(['introducing-swe-squad', 'model-routing']);
  });

  it('filters posts by another tag', () => {
    const filtered = filterPostsByTag(samplePosts, 'reliability');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('stability-gates');
  });

  it('returns empty array for non-existent tag', () => {
    const filtered = filterPostsByTag(samplePosts, 'nonexistent');
    expect(filtered).toHaveLength(0);
  });

  it('returns all posts with empty tag string', () => {
    const filtered = filterPostsByTag(samplePosts, '');
    expect(filtered).toHaveLength(3);
  });
});
