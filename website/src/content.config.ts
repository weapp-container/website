import {defineCollection, z} from 'astro:content';
import {glob} from 'astro/loaders';

const page = z.object({
  id: z.string(), title: z.string(), section: z.string(), summary: z.string(),
  route: z.string(), locale: z.enum(['zh-CN', 'en']).default('zh-CN'),
  sourceRepository: z.string().optional(), sourceCommit: z.string().optional(), sourcePath: z.string().optional(),
});
export const collections = {
  guides: defineCollection({loader: glob({pattern: '**/*.md', base: './website/src/content/guides'}), schema: page}),
  engineering: defineCollection({loader: glob({pattern: '**/*.md', base: './website/src/content/engineering'}), schema: page}),
};
