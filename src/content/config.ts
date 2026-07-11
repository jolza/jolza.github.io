import { z, defineCollection } from "astro:content";
const blogSchema = z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.string().optional(),
    heroImage: z.string().optional(),
    badge: z.string().optional(),
    tags: z.array(z.string()).refine(items => new Set(items).size === items.length, {
        message: 'tags must be unique',
    }).optional(),
    // 合集：属于同一个 series 的文章会被聚合展示
    // series: 合集名称（显示用），如 "Spark 调优三部曲"
    // seriesOrder: 在合集里的顺序（1, 2, 3 ...）
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
});

export type BlogSchema = z.infer<typeof blogSchema>;

const blogCollection = defineCollection({ schema: blogSchema });

export const collections = {
    'blog': blogCollection,
}
