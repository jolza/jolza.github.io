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
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
});

const projectSchema = z.object({
    title: z.string(),
    description: z.string(),
    // 展示用视觉元素
    emoji: z.string().default("💡"),
    gradient: z.string().default("from-primary/30 to-secondary/30"),
    // 元信息
    year: z.string(),                    // 例：2024
    status: z.enum(["in-progress", "completed", "archived"]).default("completed"),
    tags: z.array(z.string()).optional(),
    badge: z.string().optional(),        // 例：NEW / FOSS
    // 外部链接
    repo: z.string().url().optional(),   // GitHub 仓库
    demo: z.string().url().optional(),   // 在线 demo
    // 排序（越大越靠前，同值按 year desc）
    order: z.number().optional(),
});

export type BlogSchema = z.infer<typeof blogSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;

const blogCollection = defineCollection({ schema: blogSchema });
const projectCollection = defineCollection({ schema: projectSchema });

export const collections = {
    'blog': blogCollection,
    'projects': projectCollection,
}
