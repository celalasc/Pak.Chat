import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    const input = '<div>&"\'';
    const expected = '&lt;div&gt;&amp;&quot;&#39;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
