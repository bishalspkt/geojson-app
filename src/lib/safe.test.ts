import { describe, expect, it } from 'vitest';
import { escapeHtml, httpUrl, sanitizeAttribution } from './safe';

describe('httpUrl', () => {
  it('accepts absolute http(s) URLs only', () => {
    expect(httpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(httpUrl(' http://x.org ')).toBe('http://x.org/');
    expect(httpUrl('javascript:alert(1)')).toBeNull();
    expect(httpUrl('data:text/html,hi')).toBeNull();
    expect(httpUrl('/relative')).toBeNull();
    expect(httpUrl(42)).toBeNull();
  });
});

describe('sanitizeAttribution', () => {
  it('keeps text and http(s) links', () => {
    expect(sanitizeAttribution('<a href="https://nasa.gov" target="_blank">NASA</a> &copy; 2026')).toBe(
      '<a href="https://nasa.gov/" target="_blank" rel="noopener noreferrer">NASA</a> © 2026',
    );
  });

  it('drops scripts, handlers and unsafe links', () => {
    const out = sanitizeAttribution('<img src=x onerror=alert(1)>Hi <a href="javascript:alert(1)">x</a><script>bad()</script>');
    expect(out).not.toMatch(/<img|onerror|javascript:|<script/i);
    expect(out).toContain('Hi x');
  });

  it('escapes markup hidden inside link text and attributes', () => {
    const out = sanitizeAttribution('<a href="https://a.org/?q=&quot;x&quot;" onclick="evil()"><b>bold</b> & co</a>');
    expect(out).toBe('<a href="https://a.org/?q=%22x%22" target="_blank" rel="noopener noreferrer">bold &amp; co</a>');
  });

  it('returns undefined for empty input', () => {
    expect(sanitizeAttribution('')).toBeUndefined();
    expect(sanitizeAttribution('<b></b>')).toBeUndefined();
    expect(sanitizeAttribution(undefined)).toBeUndefined();
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML metacharacters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
