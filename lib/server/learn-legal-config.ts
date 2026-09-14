import 'server-only';

import { z } from 'zod';

import { backendFetch } from '@/lib/server/backend';

export type LearnLegalConfig = {
  privacyRequired: boolean;
  privacyNoticeUrl: string;
  privacyNoticeVersion: string;
};

const signInConfigSchema = z.object({
  privacyRequired: z.boolean(),
  privacyNoticeUrl: z.string().max(500),
  privacyNoticeVersion: z.string().max(80),
});

const unavailableConfig: LearnLegalConfig = {
  // A failed configuration lookup must never silently remove the production
  // acknowledgement gate. The form becomes unavailable until the BFF can
  // obtain the current configuration from the authoritative backend.
  privacyRequired: true,
  privacyNoticeUrl: '',
  privacyNoticeVersion: '',
};

export async function getAuthoritativeLearnLegalConfig(): Promise<LearnLegalConfig> {
  try {
    const payload = await backendFetch<unknown>('/learn/sign-in-config', { cache: 'no-store' });
    const parsed = signInConfigSchema.safeParse(payload);
    if (!parsed.success) return unavailableConfig;

    const { privacyRequired, privacyNoticeUrl, privacyNoticeVersion } = parsed.data;
    if (!privacyRequired) {
      return { privacyRequired, privacyNoticeUrl: '', privacyNoticeVersion: '' };
    }

    try {
      const url = new URL(privacyNoticeUrl);
      if (url.protocol !== 'https:' || !url.hostname || !privacyNoticeVersion.trim()) return unavailableConfig;
      return { privacyRequired, privacyNoticeUrl: url.toString(), privacyNoticeVersion: privacyNoticeVersion.trim() };
    } catch {
      return unavailableConfig;
    }
  } catch {
    return unavailableConfig;
  }
}
