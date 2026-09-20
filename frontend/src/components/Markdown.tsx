import { Fragment, type ReactNode } from 'react';

/**
 * A deliberately small Markdown renderer.
 *
 * The content library uses a narrow subset — paragraphs, bold, italic, inline code, fenced
 * code, lists, headings — so a 120-line renderer covers all of it without pulling in a parser
 * and a sanitiser. It also never uses dangerouslySetInnerHTML, so authored content cannot
 * inject markup.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // One pass over the interesting constructs, longest-first so ** beats *.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${counter++}`;

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('[')) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const external = href.startsWith('http');
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-brand underline underline-offset-2 hover:opacity-80"
            {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            {label}
          </a>,
        );
      }
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ children, className = '' }: { children?: string; className?: string }) {
  if (!children) return null;

  const lines = children.split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let fence: string[] | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    blocks.push(
      <p key={`p-${key++}`} className="mb-3 last:mb-0">
        {renderInline(text, `p${key}`)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={`l-${key++}`}
        className={`mb-3 space-y-1 pl-5 last:mb-0 ${list.ordered ? 'list-decimal' : 'list-disc'}`}
      >
        {list.items.map((item, index) => (
          <li key={index}>{renderInline(item, `li${key}-${index}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith('```')) {
      if (fence) {
        blocks.push(
          <pre
            key={`c-${key++}`}
            className="mb-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink-muted last:mb-0"
          >
            <code>{fence.join('\n')}</code>
          </pre>,
        );
        fence = null;
      } else {
        flushParagraph();
        flushList();
        fence = [];
      }
      continue;
    }

    if (fence) {
      fence.push(raw);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm'];
      blocks.push(
        <p key={`h-${key++}`} className={`mb-2 mt-4 font-semibold text-ink first:mt-0 ${sizes[level - 1]}`}>
          {renderInline(heading[2], `h${key}`)}
        </p>,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line.trim());
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line.trim());
    if (ordered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (fence) {
    blocks.push(
      <pre key={`c-${key++}`} className="mb-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs">
        <code>{fence.join('\n')}</code>
      </pre>,
    );
  }

  return <div className={`prose-content ${className}`}>{blocks.map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}
