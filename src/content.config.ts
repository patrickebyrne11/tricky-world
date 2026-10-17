import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { READING_STATUSES } from './lib/reading-status';

const books = defineCollection({
  loader: file('src/data/books.json'),
  // strictObject: unknown keys (e.g. a typo like "raiting") fail the build instead of being dropped.
  schema: z
    .strictObject({
      id: z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be a lowercase kebab-case slug, e.g. "dune-frank-herbert"'),
      title: z.string().trim().min(1),
      author: z.string().trim().min(1),
      status: z.enum(READING_STATUSES),
      rating: z.number().min(0.5).max(5).multipleOf(0.5).optional(),
      genres: z.array(z.string().trim().min(1)).optional(),
      review: z.string().trim().min(1).optional(),
      yearRead: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
      cover: z.url().optional(),
    })
    .refine((book) => book.yearRead === undefined || book.status === 'read', {
      message: 'yearRead is only allowed when status is "read"',
      path: ['yearRead'],
    }),
});

export const collections = { books };
