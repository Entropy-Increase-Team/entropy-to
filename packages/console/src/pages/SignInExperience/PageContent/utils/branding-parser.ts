import {
  type Branding,
  type Color,
  type FooterBranding,
  type SignInExperienceAppearance,
} from '@logto/schemas';
import { conditional } from '@silverhand/essentials';

const nonEmpty = (value?: string): string | undefined => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
};

const pruneEmptyRecord = <T extends Record<string, unknown>>(value?: T): Partial<T> | undefined => {
  if (!value) {
    return undefined;
  }

  const entries = Object.entries(value).flatMap(([key, entry]): Array<[string, unknown]> => {
    if (entry === undefined || entry === null) {
      return [];
    }

    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      return trimmed ? [[key, trimmed]] : [];
    }

    if (typeof entry === 'object' && !Array.isArray(entry)) {
      // eslint-disable-next-line no-restricted-syntax -- recursive pruning of plain appearance sub-objects
      const nested = pruneEmptyRecord(entry as Record<string, unknown>);
      return nested && Object.keys(nested).length > 0 ? [[key, nested]] : [];
    }

    return [[key, entry]];
  });

  if (entries.length === 0) {
    return undefined;
  }

  // eslint-disable-next-line no-restricted-syntax -- keys and values come directly from Partial<T>
  return Object.fromEntries(entries) as Partial<T>;
};

export const sanitizeAppearanceForSubmit = (
  appearance?: SignInExperienceAppearance
): SignInExperienceAppearance => pruneEmptyRecord(appearance) ?? {};

const sanitizeFooterBrandingForSubmit = (
  footerBranding?: FooterBranding
): FooterBranding | undefined => {
  if (!footerBranding) {
    return undefined;
  }

  if (footerBranding.mode !== 'custom') {
    return { mode: footerBranding.mode };
  }

  return {
    mode: 'custom',
    ...conditional(nonEmpty(footerBranding.text) && { text: nonEmpty(footerBranding.text) }),
    ...conditional(
      nonEmpty(footerBranding.linkUrl) && { linkUrl: nonEmpty(footerBranding.linkUrl) }
    ),
    ...conditional(
      nonEmpty(footerBranding.logoUrl) && { logoUrl: nonEmpty(footerBranding.logoUrl) }
    ),
    ...conditional(
      nonEmpty(footerBranding.darkLogoUrl) && { darkLogoUrl: nonEmpty(footerBranding.darkLogoUrl) }
    ),
    ...conditional(
      nonEmpty(footerBranding.icpRecord) && { icpRecord: nonEmpty(footerBranding.icpRecord) }
    ),
    ...conditional(nonEmpty(footerBranding.icpUrl) && { icpUrl: nonEmpty(footerBranding.icpUrl) }),
  };
};

export const sanitizeBrandingForSubmit = (branding: Branding): Branding => ({
  ...conditional(nonEmpty(branding.logoUrl) && { logoUrl: nonEmpty(branding.logoUrl) }),
  ...conditional(nonEmpty(branding.darkLogoUrl) && { darkLogoUrl: nonEmpty(branding.darkLogoUrl) }),
  ...conditional(nonEmpty(branding.favicon) && { favicon: nonEmpty(branding.favicon) }),
  ...conditional(nonEmpty(branding.darkFavicon) && { darkFavicon: nonEmpty(branding.darkFavicon) }),
  ...conditional(nonEmpty(branding.brandName) && { brandName: nonEmpty(branding.brandName) }),
  ...conditional(nonEmpty(branding.tagline) && { tagline: nonEmpty(branding.tagline) }),
  ...conditional(branding.adaptiveLogo && { adaptiveLogo: true }),
  ...conditional(
    branding.footerBranding && {
      footerBranding: sanitizeFooterBrandingForSubmit(branding.footerBranding),
    }
  ),
});

export const sanitizeColorForSubmit = (color: Color): Color => ({
  primaryColor: color.primaryColor,
  isDarkModeEnabled: color.isDarkModeEnabled,
  darkPrimaryColor: color.darkPrimaryColor,
  ...conditional(nonEmpty(color.linkColor) && { linkColor: nonEmpty(color.linkColor) }),
  ...conditional(nonEmpty(color.darkLinkColor) && { darkLinkColor: nonEmpty(color.darkLinkColor) }),
  ...conditional(
    nonEmpty(color.primaryForegroundColor) && {
      primaryForegroundColor: nonEmpty(color.primaryForegroundColor),
    }
  ),
  ...conditional(
    nonEmpty(color.darkPrimaryForegroundColor) && {
      darkPrimaryForegroundColor: nonEmpty(color.darkPrimaryForegroundColor),
    }
  ),
});
