export interface Platform {
  id: string;
  name: string;
  domains: string[];
  logoUrl: string;
}

export type LogoSource = 'platform' | 'favicon' | 'generic';

export interface DetectedLink {
  url: string;
  hostname: string;
  platform: Platform | null;
  logoSource: LogoSource;
  logoUrl: string;
}

const platform = (id: string, name: string, domains: string[]): Platform => ({
  id,
  name,
  domains,
  logoUrl: `/logos/${id}.svg`,
});

export const PLATFORMS: Platform[] = [
  platform('huggingface', 'Hugging Face', ['huggingface.co', 'hf.co', 'hf.space']),
  platform('github', 'GitHub', ['github.com', 'github.io']),
  platform('youtube', 'YouTube', ['youtube.com', 'youtu.be']),
  platform('instagram', 'Instagram', ['instagram.com', 'instagr.am']),
  platform('x', 'X (Twitter)', ['x.com', 'twitter.com', 't.co']),
  platform('linkedin', 'LinkedIn', ['linkedin.com', 'lnkd.in']),
  platform('tiktok', 'TikTok', ['tiktok.com']),
  platform('facebook', 'Facebook', ['facebook.com', 'fb.com', 'fb.me', 'messenger.com']),
  platform('whatsapp', 'WhatsApp', ['whatsapp.com', 'wa.me']),
  platform('telegram', 'Telegram', ['telegram.org', 't.me']),
  platform('reddit', 'Reddit', ['reddit.com', 'redd.it']),
  platform('discord', 'Discord', ['discord.com', 'discord.gg']),
  platform('spotify', 'Spotify', ['spotify.com']),
  platform('twitch', 'Twitch', ['twitch.tv']),
  platform('pinterest', 'Pinterest', ['pinterest.com', 'pin.it']),
  platform('medium', 'Medium', ['medium.com']),
  platform('threads', 'Threads', ['threads.net', 'threads.com']),
  platform('snapchat', 'Snapchat', ['snapchat.com']),
];

export const GENERIC_LOGO_URL = '/logos/globe.svg';

/**
 * Normalize free-form user input into an absolute http(s) URL.
 * Returns null when the input cannot be a valid web link.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  // Require a dot in the hostname (e.g. "example.com") or localhost.
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;

  return url.toString();
}

function matchPlatform(hostname: string): Platform | null {
  for (const p of PLATFORMS) {
    for (const domain of p.domains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return p;
    }
  }
  return null;
}

/**
 * Detect the platform behind a normalized URL and resolve the QR center logo.
 * Unknown sites fall back to their favicon (served via /api/favicon, which
 * itself falls back to the generic globe icon when no favicon exists).
 */
export function detectPlatform(url: string): DetectedLink {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const matched = matchPlatform(hostname);

  if (matched) {
    return { url, hostname, platform: matched, logoSource: 'platform', logoUrl: matched.logoUrl };
  }

  if (hostname === 'localhost') {
    return { url, hostname, platform: null, logoSource: 'generic', logoUrl: GENERIC_LOGO_URL };
  }

  return {
    url,
    hostname,
    platform: null,
    logoSource: 'favicon',
    logoUrl: `/api/favicon?domain=${encodeURIComponent(hostname)}`,
  };
}
