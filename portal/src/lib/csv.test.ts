import { describe, expect, it } from 'vitest';
import { buildCsv } from './adminApi';

describe('buildCsv', () => {
  it('joins headers and rows with commas and newlines', () => {
    expect(buildCsv(['a', 'b'], [[1, 2]])).toBe('a,b\n1,2');
  });

  it('quotes fields containing commas', () => {
    expect(buildCsv(['title'], [['Pride, and Progress']])).toBe('title\n"Pride, and Progress"');
  });

  it('escapes embedded quotes by doubling them', () => {
    expect(buildCsv(['title'], [['She said "go"']])).toBe('title\n"She said ""go"""');
  });

  it('quotes fields containing newlines', () => {
    expect(buildCsv(['note'], [['line1\nline2']])).toBe('note\n"line1\nline2"');
  });

  it('passes plain numbers through unquoted', () => {
    expect(buildCsv(['views', 'coins'], [[1234, 0]])).toBe('views,coins\n1234,0');
  });
});
