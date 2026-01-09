import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  generateSlug,
  truncate,
  pluralize,
  getInitials,
  parseRuntime,
  formatRuntime,
  groupBy,
} from '@/lib/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatDate utility', () => {
  it('should format date string', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('15');
    expect(result).toContain('Mar');
    expect(result).toContain('2024');
  });

  it('should format Date object', () => {
    const date = new Date('2024-03-15');
    const result = formatDate(date);
    expect(result).toContain('15');
  });
});

describe('formatTime utility', () => {
  it('should format time correctly', () => {
    expect(formatTime('14:30:00')).toBe('14:30');
    expect(formatTime('09:05:00')).toBe('09:05');
  });
});

describe('formatDateTime utility', () => {
  it('should format date and time', () => {
    const result = formatDateTime('2024-03-15', '14:30:00');
    expect(result).toContain('15');
    expect(result).toContain('14:30');
  });

  it('should format date only if no time provided', () => {
    const result = formatDateTime('2024-03-15');
    expect(result).toContain('15');
    expect(result).not.toContain(':');
  });
});

describe('generateSlug utility', () => {
  it('should generate slug from text', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should handle special characters', () => {
    expect(generateSlug('Café & Restaurant')).toBe('cafe-restaurant');
  });

  it('should handle diacritics', () => {
    expect(generateSlug('Lëtzebuerg')).toBe('letzebuerg');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('Hello    World')).toBe('hello-world');
  });
});

describe('truncate utility', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });
});

describe('pluralize utility', () => {
  it('should return singular for count 1', () => {
    expect(pluralize(1, 'movie')).toBe('movie');
  });

  it('should return plural for count > 1', () => {
    expect(pluralize(5, 'movie')).toBe('movies');
  });

  it('should return plural for count 0', () => {
    expect(pluralize(0, 'movie')).toBe('movies');
  });

  it('should use custom plural', () => {
    expect(pluralize(2, 'person', 'people')).toBe('people');
  });
});

describe('getInitials utility', () => {
  it('should get initials from name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('should handle single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('should limit to 2 characters', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });
});

describe('parseRuntime utility', () => {
  it('should parse minutes to hours and minutes', () => {
    expect(parseRuntime(150)).toEqual({ hours: 2, minutes: 30 });
  });

  it('should handle less than an hour', () => {
    expect(parseRuntime(45)).toEqual({ hours: 0, minutes: 45 });
  });

  it('should handle exact hours', () => {
    expect(parseRuntime(120)).toEqual({ hours: 2, minutes: 0 });
  });
});

describe('formatRuntime utility', () => {
  it('should format runtime with hours and minutes', () => {
    expect(formatRuntime(150)).toBe('2h 30min');
  });

  it('should format runtime with minutes only', () => {
    expect(formatRuntime(45)).toBe('45min');
  });

  it('should format runtime with hours only', () => {
    expect(formatRuntime(120)).toBe('2h');
  });
});

describe('groupBy utility', () => {
  it('should group array by key', () => {
    const items = [
      { category: 'A', name: 'Item 1' },
      { category: 'B', name: 'Item 2' },
      { category: 'A', name: 'Item 3' },
    ];

    const result = groupBy(items, 'category');

    expect(result).toEqual({
      A: [
        { category: 'A', name: 'Item 1' },
        { category: 'A', name: 'Item 3' },
      ],
      B: [{ category: 'B', name: 'Item 2' }],
    });
  });
});
