const TONES = ['violet', 'rose', 'mint', 'sun'] as const;
type Tone = (typeof TONES)[number];

// Deterministic per-user tone + initials — no external avatar service, no
// randomness at render time (same person always gets the same look).
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function toneFor(seed: string): Tone {
  return TONES[hashSeed(seed) % TONES.length];
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tone = toneFor(name);
  return (
    <span
      className={`avatar avatar--${tone}`}
      // Rounded-square ("squircle") to match this design system's orb/panel
      // language (see .icon-orb, .user-mini__avatar) rather than a plain circle.
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
