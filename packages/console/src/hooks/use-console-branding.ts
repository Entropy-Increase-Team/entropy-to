import { Theme } from '@logto/schemas';
import { useContext } from 'react';
import useSWR, { mutate } from 'swr';

import { adminEndpoint, isCloud } from '@/consts/env';
import { AppDataContext } from '@/contexts/AppDataContext';

type ConsoleBranding = {
  brandName: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  websiteUrl: string;
  docsUrl: string;
  supportEmail: string;
};

const consoleBrandingPath = '/api/.well-known/console-branding';

const defaultConsoleBranding: ConsoleBranding = Object.freeze({
  brandName: '熵增账号中心',
  logoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  websiteUrl: '',
  docsUrl: '',
  supportEmail: '',
});

/**
 * Neutral geometric SVG favicon fallback when no custom favicon is configured.
 * Contains no Logto branding and no proprietary brand assets.
 */
export const defaultConsoleFavicon =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="16" fill="#14171c"/>' +
      '<rect x="18" y="18" width="28" height="28" rx="7" fill="none" stroke="#f5f7fa" stroke-width="5"/>' +
      '<circle cx="32" cy="32" r="5" fill="#6ea8ff"/>' +
      '</svg>'
  );

const fetchConsoleBranding = async (url: string): Promise<ConsoleBranding> => {
  const response = await fetch(url);
  if (!response.ok) {
    return defaultConsoleBranding;
  }

  const data: Partial<ConsoleBranding> = await response.json();
  const brandName = data.brandName?.trim();

  return {
    brandName: brandName && brandName.length > 0 ? brandName : defaultConsoleBranding.brandName,
    logoUrl: data.logoUrl?.trim() ?? '',
    darkLogoUrl: data.darkLogoUrl?.trim() ?? '',
    faviconUrl: data.faviconUrl?.trim() ?? '',
    websiteUrl: data.websiteUrl?.trim() ?? '',
    docsUrl: data.docsUrl?.trim() ?? '',
    supportEmail: data.supportEmail?.trim() ?? '',
  };
};

export const getConsoleLogoUrl = (branding: ConsoleBranding, theme: Theme): string => {
  if (theme === Theme.Dark) {
    return branding.darkLogoUrl || branding.logoUrl;
  }

  return branding.logoUrl || branding.darkLogoUrl;
};

/** Revalidates cached console branding after sign-in experience branding changes are saved. */
export const revalidateConsoleBranding = async () =>
  mutate((key) => typeof key === 'string' && key.endsWith(consoleBrandingPath));

const useConsoleBranding = (): ConsoleBranding => {
  const { tenantEndpoint } = useContext(AppDataContext);
  const baseEndpoint = tenantEndpoint ?? adminEndpoint ?? window.location.origin;
  const endpointUrl = isCloud ? null : new URL(consoleBrandingPath, baseEndpoint).toString();

  const { data } = useSWR<ConsoleBranding>(endpointUrl, fetchConsoleBranding, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    fallbackData: defaultConsoleBranding,
  });

  return data ?? defaultConsoleBranding;
};

export default useConsoleBranding;
