// Adapted from https://equk.co.uk/2023/02/02/generating-slug-from-title-in-astro/
// Enhanced: convert Chinese to Pinyin before slug cleanup so 中文标题 stays URL-friendly

import { GENERATE_SLUG_FROM_TITLE } from '../config'
import { pinyin } from 'pinyin-pro'

export default function (title: string, staticSlug: string) {
  if (!GENERATE_SLUG_FROM_TITLE) return staticSlug
  // Convert Chinese chars to Pinyin; keep non-Chinese chars intact as one segment.
  const romanized = pinyin(title, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }).join(' ')
  return romanized
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
