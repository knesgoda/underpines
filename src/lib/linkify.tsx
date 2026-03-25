import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

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
