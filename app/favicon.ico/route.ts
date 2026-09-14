const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="POKYHlearn"><rect width="64" height="64" rx="16" fill="#111116"/><rect x="5" y="5" width="54" height="54" rx="12" fill="none" stroke="#fff" stroke-width="5"/><text x="32" y="42" fill="#fff" font-family="Arial, sans-serif" font-size="32" font-weight="800" text-anchor="middle">P</text></svg>`;

// Some browsers request `/favicon.ico` even when Next's generated `/icon`
// metadata is present. Answer that legacy request explicitly rather than
// emitting an avoidable 404 in an otherwise healthy signed-out session.
export function GET() {
  return new Response(favicon, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
