import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RichText } from './rich-text';

const html = (text: string) => renderToStaticMarkup(createElement(RichText, { text }));

describe('RichText', () => {
  it('splits paragraphs on blank lines and renders bold and https links', () => {
    const out = html('One **two**.\n\nSee [the report](https://example.org/r).');
    expect(out.match(/<p /g)).toHaveLength(2);
    expect(out).toContain('<strong');
    expect(out).toContain('href="https://example.org/r"');
  });

  it('renders a block of "- " lines as a bullet list', () => {
    const out = html('Intro:\n\n- **205** photos\n- street frames\n\nAfter.');
    expect(out).toMatch(/<ul[^>]*><li><strong[^>]*>205<\/strong> photos<\/li><li>street frames<\/li><\/ul>/);
    expect(out.match(/<p /g)).toHaveLength(2);
  });

  it('keeps a paragraph that merely contains a dash as text', () => {
    const out = html('A range — 10–500 million m³\n- not a list because the first line is prose');
    expect(out).not.toContain('<ul');
  });

  it('never interprets HTML or non-https links', () => {
    const out = html('<img src=x onerror=alert(1)> [x](javascript:alert(1))');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('href="javascript');
  });
});
