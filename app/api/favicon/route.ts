import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

async function globeFallback(): Promise<NextResponse> {
  const globePath = path.join(process.cwd(), 'public', 'logos', 'globe.svg');
  const svg = await readFile(globePath);
  return new NextResponse(new Uint8Array(svg), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain') || '';

  if (!HOSTNAME_PATTERN.test(domain) || domain.length > 253) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      { signal: AbortSignal.timeout(5000) }
    );

    // Google answers 404 (with a default-globe body) when the domain has no favicon.
    if (!response.ok) return globeFallback();

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return globeFallback();
  }
}
