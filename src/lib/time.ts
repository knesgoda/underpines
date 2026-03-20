export const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return 'just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday';

  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });

  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
