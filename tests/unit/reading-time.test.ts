import { describe, it, expect } from 'vitest';
import { calculateReadingTime } from '../../src/lib/reading-time';

describe('calculateReadingTime', () => {
  it('returns 1 for very short content', () => {
    const result = calculateReadingTime('Hello world');
    expect(result).toBe(1);
  });

  it('returns 1 for empty string', () => {
    const result = calculateReadingTime('');
    expect(result).toBe(1);
  });

  it('calculates reading time for a medium post', () => {
    const words = Array(400).fill('word').join(' ');
    const result = calculateReadingTime(words);
    expect(result).toBe(2);
  });

  it('calculates reading time for a long post', () => {
    const words = Array(1000).fill('word').join(' ');
    const result = calculateReadingTime(words);
    expect(result).toBe(5);
  });

  it('strips HTML tags before counting words', () => {
    const html = '<p>' + Array(200).fill('word').join(' ') + '</p>';
    const plain = Array(200).fill('word').join(' ');
    expect(calculateReadingTime(html)).toBe(calculateReadingTime(plain));
  });

  it('handles content with multiple HTML tags', () => {
    const html = '<div><p>word</p><p>word</p><p>word</p></div>';
    const result = calculateReadingTime(html);
    expect(result).toBe(1);
  });

  it('rounds up to nearest minute', () => {
    const words = Array(201).fill('word').join(' ');
    const result = calculateReadingTime(words);
    expect(result).toBe(2);
  });

  it('handles whitespace-heavy content', () => {
    const content = '   word   word   word   ';
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });
});
