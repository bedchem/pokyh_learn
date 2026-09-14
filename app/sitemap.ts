import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!siteUrl) return [];
  return [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/catalog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/sign-in`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
