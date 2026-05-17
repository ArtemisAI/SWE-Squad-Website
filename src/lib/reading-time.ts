export function calculateReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const wpm = 200;
  return Math.max(1, Math.ceil(words / wpm));
}
