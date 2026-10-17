export const READING_STATUSES = ['reading', 'read', 'want-to-read'] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: 'Currently Reading',
  read: 'Read',
  'want-to-read': 'Want to Read',
};
