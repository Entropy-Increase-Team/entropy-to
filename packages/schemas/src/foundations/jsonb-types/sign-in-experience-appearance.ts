import { hexColorRegEx } from '@logto/core-kit';
import { z } from 'zod';

import { Theme } from '../../types/theme.js';

const httpUrlGuard = z
  .string()
  .url()
  .refine((value) => {
    try {
      const { protocol } = new URL(value);

      return protocol === 'https:' || protocol === 'http:';
    } catch {
      return false;
    }
  }, 'URL must use http or https protocol');

const httpsUrlGuard = z
  .string()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must use https protocol');

const safeFontFamilyRegex = /^[\s\w"',-]+$/;

export const colorGuard = z.object({
  primaryColor: z.string().regex(hexColorRegEx),
  isDarkModeEnabled: z.boolean(),
  darkPrimaryColor: z.string().regex(hexColorRegEx),
  /** Optional independent accent color for links and focus rings in light mode. */
  linkColor: z.string().regex(hexColorRegEx).optional(),
  /** Optional independent accent color for links and focus rings in dark mode. */
  darkLinkColor: z.string().regex(hexColorRegEx).optional(),
  /** Optional explicit foreground color for primary buttons in light mode (auto-computed if omitted). */
  primaryForegroundColor: z.string().regex(hexColorRegEx).optional(),
  /** Optional explicit foreground color for primary buttons in dark mode (auto-computed if omitted). */
  darkPrimaryForegroundColor: z.string().regex(hexColorRegEx).optional(),
});

export type Color = z.infer<typeof colorGuard>;

export const partialColorGuard = colorGuard.partial();

export type PartialColor = Partial<Color>;

export const footerBrandingModeGuard = z.enum(['hidden', 'custom', 'logto']);

export type FooterBrandingMode = z.infer<typeof footerBrandingModeGuard>;

export const footerBrandingGuard = z.object({
  mode: footerBrandingModeGuard,
  text: z.string().max(120).optional(),
  linkUrl: httpUrlGuard.optional(),
  logoUrl: httpUrlGuard.optional(),
  darkLogoUrl: httpUrlGuard.optional(),
  icpRecord: z.string().max(80).optional(),
  icpUrl: httpUrlGuard.optional(),
});

export type FooterBranding = z.infer<typeof footerBrandingGuard>;

export const brandingGuard = z
  .object({
    logoUrl: z.string().url(),
    darkLogoUrl: z.string().url(),
    favicon: z.string().url(),
    darkFavicon: z.string().url(),
    brandName: z.string().max(64),
    tagline: z.string().max(160),
    adaptiveLogo: z.boolean(),
    footerBranding: footerBrandingGuard,
  })
  .partial();

export type Branding = z.infer<typeof brandingGuard>;

/** Maps a theme to the key of the logo URL in the {@link Branding} object. */
export const themeToLogoKey = Object.freeze({
  [Theme.Light]: 'logoUrl',
  [Theme.Dark]: 'darkLogoUrl',
} satisfies Record<Theme, keyof Branding>);

export const appearancePresetGuard = z.enum(['entropy', 'classic', 'minimal']);
export type AppearancePreset = z.infer<typeof appearancePresetGuard>;

export const appearanceLayoutGuard = z.enum([
  'centered',
  'framed',
  'split-left',
  'split-right',
  'minimal',
]);
export type AppearanceLayout = z.infer<typeof appearanceLayoutGuard>;

export const appearanceHeaderAlignmentGuard = z.enum(['center', 'left']);
export type AppearanceHeaderAlignment = z.infer<typeof appearanceHeaderAlignmentGuard>;

export const appearanceCardWidthGuard = z.enum(['compact', 'default', 'wide']);
export type AppearanceCardWidth = z.infer<typeof appearanceCardWidthGuard>;

export const appearanceBackgroundTypeGuard = z.enum([
  'solid',
  'tech-grid',
  'subtle-gradient',
  'image',
]);
export type AppearanceBackgroundType = z.infer<typeof appearanceBackgroundTypeGuard>;

export const appearanceCardRadiusGuard = z.enum(['none', 'sm', 'md', 'lg', 'xl']);
export type AppearanceCardRadius = z.infer<typeof appearanceCardRadiusGuard>;

export const appearanceControlRadiusGuard = z.enum(['none', 'sm', 'md', 'lg', 'pill']);
export type AppearanceControlRadius = z.infer<typeof appearanceControlRadiusGuard>;

export const appearanceShadowGuard = z.enum(['none', 'whisper', 'elevated']);
export type AppearanceShadow = z.infer<typeof appearanceShadowGuard>;

export const appearanceDensityGuard = z.enum(['compact', 'default', 'comfortable']);
export type AppearanceDensity = z.infer<typeof appearanceDensityGuard>;

export const appearanceFontPresetGuard = z.enum(['noto-sans-sc', 'system', 'inter', 'custom']);
export type AppearanceFontPreset = z.infer<typeof appearanceFontPresetGuard>;

export const signInExperienceAppearanceGuard = z
  .object({
    preset: appearancePresetGuard,
    layout: appearanceLayoutGuard,
    headerAlignment: appearanceHeaderAlignmentGuard,
    cardWidth: appearanceCardWidthGuard,
    topBar: z
      .object({
        enabled: z.boolean(),
        showThemeToggle: z.boolean(),
        homeUrl: httpUrlGuard,
        homeLabel: z.string().max(40),
      })
      .partial(),
    background: z
      .object({
        type: appearanceBackgroundTypeGuard,
        lightColor: z.string().regex(hexColorRegEx),
        darkColor: z.string().regex(hexColorRegEx),
        imageUrl: httpUrlGuard,
        darkImageUrl: httpUrlGuard,
        overlayOpacity: z.number().min(0).max(0.85),
      })
      .partial(),
    hero: z
      .object({
        badge: z.string().max(40),
        title: z.string().max(80),
        description: z.string().max(240),
        imageUrl: httpUrlGuard,
        darkImageUrl: httpUrlGuard,
      })
      .partial(),
    surface: z
      .object({
        lightCardColor: z.string().regex(hexColorRegEx),
        darkCardColor: z.string().regex(hexColorRegEx),
        cardRadius: appearanceCardRadiusGuard,
        controlRadius: appearanceControlRadiusGuard,
        shadow: appearanceShadowGuard,
        density: appearanceDensityGuard,
        darkTopHighlight: z.boolean(),
      })
      .partial(),
    typography: z
      .object({
        fontPreset: appearanceFontPresetGuard,
        customFontFamily: z.string().max(120).regex(safeFontFamilyRegex),
        customFontStylesheetUrl: httpsUrlGuard,
      })
      .partial(),
    motion: z
      .object({
        reduced: z.boolean(),
        errorShake: z.boolean(),
      })
      .partial(),
  })
  .partial();

export type SignInExperienceAppearance = z.infer<typeof signInExperienceAppearanceGuard>;
