import 'server-only';

/**
 * A deliberately small, public error vocabulary for browser requests. Route
 * handlers must not surface configuration, upstream, or parser exceptions.
 */
export class ClientRequestProblem extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 413 | 415,
  ) {
    super(message);
    this.name = 'ClientRequestProblem';
  }
}

export type ValidatedJsonBody = {
  raw: string;
  value: unknown;
};

function declaredContentLength(request: Request, maxBytes: number) {
  const value = request.headers.get('content-length');
  if (!value) return;

  if (!/^[0-9]+$/.test(value)) {
    throw new ClientRequestProblem('Ungültige Anfragegröße.', 400);
  }

  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new ClientRequestProblem('Ungültige Anfragegröße.', 400);
  }
  if (length > maxBytes) {
    throw new ClientRequestProblem('Die Anfrage ist zu groß.', 413);
  }
}

async function readBoundedText(request: Request, maxBytes: number) {
  declaredContentLength(request, maxBytes);
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ClientRequestProblem('Die Anfrage ist zu groß.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Reads JSON without buffering an unbounded browser body. The backend repeats
 * schema validation and size checks; this BFF guard protects its own memory
 * and rejects malformed payloads before they can be forwarded.
 */
export async function readValidatedJsonBody(request: Request, maxBytes: number): Promise<ValidatedJsonBody> {
  const raw = await readBoundedText(request, maxBytes);
  if (!raw) return { raw, value: null };

  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    throw new ClientRequestProblem('Diese Anfrage muss JSON enthalten.', 415);
  }

  try {
    return { raw, value: JSON.parse(raw) };
  } catch {
    throw new ClientRequestProblem('Ungültiges JSON.', 400);
  }
}
