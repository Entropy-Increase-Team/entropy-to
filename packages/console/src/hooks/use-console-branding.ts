import { Theme } from '@logto/schemas';
import useSWR from 'swr';

import { adminEndpoint, isCloud } from '@/consts/env';

type ConsoleBranding = {
  brandName: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  websiteUrl: string;
  docsUrl: string;
  supportEmail: string;
};

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
 * Neutral geometric SVG favicon fallback when no custom `BRAND_FAVICON_URL` is configured.
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

const useConsoleBranding = (): ConsoleBranding => {
  const endpointUrl = isCloud
    ? null
    : new URL(
        '/api/.well-known/console-branding',
        adminEndpoint ?? window.location.origin
      ).toString();

  const { data } = useSWR<ConsoleBranding>(endpointUrl, fetchConsoleBranding, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    fallbackData: defaultConsoleBranding,
  });

  return data ?? defaultConsoleBranding;
};

export default useConsoleBranding;
