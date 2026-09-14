import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** A compact, self-contained product icon for browser tabs and saved links. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#111116',
          border: '5px solid #ffffff',
          borderRadius: 16,
          color: '#ffffff',
          display: 'flex',
          fontFamily: 'sans-serif',
          fontSize: 30,
          fontWeight: 800,
          height: '100%',
          justifyContent: 'center',
          letterSpacing: '-3px',
          width: '100%',
        }}
      >
        P
      </div>
    ),
    size,
  );
}
