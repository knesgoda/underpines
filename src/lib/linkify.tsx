import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/** Extract the first URL found in text */
export function extractFirstUrl(text: string): string | null {
  URL_REGEX.lastIndex = 0;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/** Remove the first URL from text, trimming leftover whitespace */
export function stripFirstUrl(text: string): string {
  const url = extractFirstUrl(text);
  if (!url) return text;
  return text.replace(url, '').replace(/\n{2,}/g, '\n').trim();
}

/** Render text with clickable inline links (used where no preview card is shown) */
export function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-700 underline underline-offset-2 hover:text-green-800 transition-colors"
        >
          {part}
        </a>
      );
    }
    URL_REGEX.lastIndex = 0;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
