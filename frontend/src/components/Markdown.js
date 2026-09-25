import { jsx as _jsx } from "react/jsx-runtime";
import { Fragment } from 'react';
/**
 * A deliberately small Markdown renderer.
 *
 * The content library uses a narrow subset — paragraphs, bold, italic, inline code, fenced
 * code, lists, headings — so a 120-line renderer covers all of it without pulling in a parser
 * and a sanitiser. It also never uses dangerouslySetInnerHTML, so authored content cannot
 * inject markup.
 */
function renderInline(text, keyPrefix) {
    const nodes = [];
    // One pass over the interesting constructs, longest-first so ** beats *.
    const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match;
    let counter = 0;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        const key = `${keyPrefix}-${counter++}`;
        if (token.startsWith('`')) {
            nodes.push(_jsx("code", { children: token.slice(1, -1) }, key));
        }
        else if (token.startsWith('**')) {
            nodes.push(_jsx("strong", { children: token.slice(2, -2) }, key));
        }
        else if (token.startsWith('[')) {
            const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
            if (linkMatch) {
                const [, label, href] = linkMatch;
                const external = href.startsWith('http');
                nodes.push(_jsx("a", { href: href, className: "text-brand underline underline-offset-2 hover:opacity-80", ...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {}), children: label }, key));
            }
        }
        else {
            nodes.push(_jsx("em", { children: token.slice(1, -1) }, key));
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length)
        nodes.push(text.slice(lastIndex));
    return nodes;
}
export function Markdown({ children, className = '' }) {
    if (!children)
        return null;
    const lines = children.split('\n');
    const blocks = [];
    let paragraph = [];
    let list = null;
    let fence = null;
    let key = 0;
    const flushParagraph = () => {
        if (paragraph.length === 0)
            return;
        const text = paragraph.join(' ');
        blocks.push(_jsx("p", { className: "mb-3 last:mb-0", children: renderInline(text, `p${key}`) }, `p-${key++}`));
        paragraph = [];
    };
    const flushList = () => {
        if (!list)
            return;
        const Tag = list.ordered ? 'ol' : 'ul';
        blocks.push(_jsx(Tag, { className: `mb-3 space-y-1 pl-5 last:mb-0 ${list.ordered ? 'list-decimal' : 'list-disc'}`, children: list.items.map((item, index) => (_jsx("li", { children: renderInline(item, `li${key}-${index}`) }, index))) }, `l-${key++}`));
        list = null;
    };
    for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.trim().startsWith('```')) {
            if (fence) {
                blocks.push(_jsx("pre", { className: "mb-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink-muted last:mb-0", children: _jsx("code", { children: fence.join('\n') }) }, `c-${key++}`));
                fence = null;
            }
            else {
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
            blocks.push(_jsx("p", { className: `mb-2 mt-4 font-semibold text-ink first:mt-0 ${sizes[level - 1]}`, children: renderInline(heading[2], `h${key}`) }, `h-${key++}`));
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
        blocks.push(_jsx("pre", { className: "mb-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs", children: _jsx("code", { children: fence.join('\n') }) }, `c-${key++}`));
    }
    return _jsx("div", { className: `prose-content ${className}`, children: blocks.map((block, index) => _jsx(Fragment, { children: block }, index)) });
}
