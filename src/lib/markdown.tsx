import type { ReactNode } from 'react';
import { MediaImage } from '@/components/MediaImage';

/**
 * A deliberately small markdown renderer that returns React nodes.
 *
 * Long-form used to run on TipTap and store HTML, which meant rendering it
 * back through dangerouslySetInnerHTML. Returning elements instead makes
 * injection structurally impossible rather than something DOMPurify has to
 * catch, and it drops ~127 kB gzip of editor from the dependency tree.
 *
 * Supports the subset people actually use in a post: headings, bold, italic,
 * inline code, links, bullet and numbered lists, blockquotes, and paragraphs.
 * Anything else renders as plain text, which is the right failure mode.
 */

const INLINE = /(!\[[^\]]*\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

const renderInline = (text: string, keyPrefix: string): ReactNode[] =>
  text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2];
      // Only http(s) and mailto survive; javascript: and data: are dropped.
      const safe = /^(https?:|mailto:)/i.test(href);
      return safe ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">{link[1]}</a>
      ) : (
        <span key={key}>{link[1]}</span>
      );
    }

    return <span key={key}>{part}</span>;
  });

export const Markdown = ({ children, className }: { children: string | null; className?: string }) => {
  if (!children?.trim()) return null;

  const blocks: ReactNode[] = [];
  const lines = children.replace(/\r\n/g, '\n').split('\n');
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    blocks.push(<p key={`p${blocks.length}`}>{renderInline(text, `p${blocks.length}`)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    const rendered = items.map((item, i) => <li key={i}>{renderInline(item, `li${blocks.length}-${i}`)}</li>);
    blocks.push(ordered ? <ol key={`l${blocks.length}`}>{rendered}</ol> : <ul key={`l${blocks.length}`}>{rendered}</ul>);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flushParagraph(); flushList(); continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${blocks.length}`);
      blocks.push(
        level === 1 ? <h1 key={`h${blocks.length}`}>{content}</h1>
        : level === 2 ? <h2 key={`h${blocks.length}`}>{content}</h2>
        : <h3 key={`h${blocks.length}`}>{content}</h3>
      );
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={`q${blocks.length}`}>{renderInline(quote[1], `q${blocks.length}`)}</blockquote>);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <div className={className}>{blocks}</div>;
};

export default Markdown;
