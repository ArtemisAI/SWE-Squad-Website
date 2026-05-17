import { describe, it, expect } from 'vitest';

function calculateReadingTime(wordCount: number, wordsPerMinute = 200): number {
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe('Reading time calculation', () => {
  it('returns 1 minute for zero words', () => {
    expect(calculateReadingTime(0)).toBe(1);
  });

  it('returns 1 minute for content under 200 words', () => {
    expect(calculateReadingTime(150)).toBe(1);
    expect(calculateReadingTime(199)).toBe(1);
  });

  it('returns 2 minutes for 200-400 words', () => {
    expect(calculateReadingTime(200)).toBe(1);
    expect(calculateReadingTime(201)).toBe(2);
    expect(calculateReadingTime(400)).toBe(2);
  });

  it('returns correct time for longer articles', () => {
    expect(calculateReadingTime(1000)).toBe(5);
    expect(calculateReadingTime(2000)).toBe(10);
  });

  it('supports custom words-per-minute', () => {
    expect(calculateReadingTime(300, 150)).toBe(2);
    expect(calculateReadingTime(300, 300)).toBe(1);
  });
});

describe('Word count', () => {
  it('counts words in a simple string', () => {
    expect(countWords('hello world foo')).toBe(3);
  });

  it('handles multiple spaces and newlines', () => {
    expect(countWords('hello   world\n\nfoo  bar')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('counts markdown content with headings and lists', () => {
    const content = `# Title\n\nThis is a paragraph.\n\n- List item one\n- List item two`;
    // "# Title This is a paragraph. - List item one - List item two" = 12 tokens including markdown sigils
    expect(countWords(content)).toBe(14);
  });
});
