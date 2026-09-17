import { redirect } from 'next/navigation';

// Vocabulary is not its own concept in the product — it always belongs to a
// course (see /courses/[slug]/vocabulary, linked from every enrolled
// course's own page). This route only exists so an old link/bookmark to
// the previous standalone page lands somewhere useful instead of 404ing.
export default function VocabularyRedirectPage() {
  redirect('/courses');
}
