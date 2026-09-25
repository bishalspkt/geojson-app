import { Fragment, ReactNode } from 'react';

/**
 * Minimal, safe rich text for story bodies: paragraphs split on blank lines,
 * bullet lists (a block whose every line starts with `- `), `**bold**`, and
 * `[text](https://…)` links. No HTML is ever interpreted — story documents are
 * untrusted input.
 */
const INLINE_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const BULLET_RE = /^[-•]\s+/;

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => BULLET_RE.test(l))) {
          return (
            <ul key={i} className="mb-2.5 list-disc space-y-1 pl-4 text-[13.5px] leading-relaxed text-foreground/85 last:mb-0 marker:text-subtle-foreground">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(BULLET_RE, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mb-2.5 text-[13.5px] leading-relaxed text-foreground/85 last:mb-0">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
