import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POKYHlearn',
    short_name: 'POKYHlearn',
    description: 'Courses, vocabulary, and targeted review in one focused learning space.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f1f0f8',
    theme_color: '#6366f1',
    lang: 'de',
  };
}
