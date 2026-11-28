import { generateBrandColorStates } from '@logto/core-kit';

import {
  type AppearancePreset,
  type Branding,
  type Color,
  type FooterBranding,
  type SignInExperienceAppearance,
} from '../foundations/jsonb-types/sign-in-experience.js';
import { Theme } from '../types/theme.js';

import {
  type AppearancePresetDefaults,
  type ResolvedAppearance,
  appearancePresetDefaults,
  cardRadiusPx,
  cardShadowMap,
  cardWidthPx,
  controlRadiusPx,
  defaultMonoFontFamily,
  fontFamilyByPreset,
} from './appearance-presets.js';

export {
  appearancePresetDefaults,
  type AppearancePresetDefaults,
  type ResolvedAppearance,
} from './appearance-presets.js';

export const resolveFooterBranding = (
  branding?: Branding,
  hideLogtoBranding?: boolean
): FooterBranding => {
  if (branding?.footerBranding) {
    return branding.footerBranding;
  }

  return {
    mode: hideLogtoBranding === false ? 'logto' : 'hidden',
  };
};

const resolveTopBar = (
  topBar: SignInExperienceAppearance['topBar'],
  defaults: AppearancePresetDefaults['topBar']
): ResolvedAppearance['topBar'] => ({
  enabled: topBar?.enabled ?? defaults.enabled,
  showThemeToggle: topBar?.showThemeToggle ?? defaults.showThemeToggle,
  homeUrl: topBar?.homeUrl,
  homeLabel: topBar?.homeLabel,
});

const resolveBackground = (
  background: SignInExperienceAppearance['background'],
  defaults: AppearancePresetDefaults['background']
): ResolvedAppearance['background'] => ({
  type: background?.type ?? defaults.type,
  lightColor: background?.lightColor ?? defaults.lightColor,
  darkColor: background?.darkColor ?? defaults.darkColor,
  imageUrl: background?.imageUrl,
  darkImageUrl: background?.darkImageUrl,
  overlayOpacity: background?.overlayOpacity ?? defaults.overlayOpacity,
});

const resolveHero = (hero: SignInExperienceAppearance['hero']): ResolvedAppearance['hero'] => ({
  badge: hero?.badge,
  title: hero?.title,
  description: hero?.description,
  imageUrl: hero?.imageUrl,
  darkImageUrl: hero?.darkImageUrl,
});

const resolveSurface = (
  surface: SignInExperienceAppearance['surface'],
  defaults: AppearancePresetDefaults['surface']
): ResolvedAppearance['surface'] => ({
  lightCardColor: surface?.lightCardColor ?? defaults.lightCardColor,
  darkCardColor: surface?.darkCardColor ?? defaults.darkCardColor,
  cardRadius: surface?.cardRadius ?? defaults.cardRadius,
  controlRadius: surface?.controlRadius ?? defaults.controlRadius,
  shadow: surface?.shadow ?? defaults.shadow,
  density: surface?.density ?? defaults.density,
  darkTopHighlight: surface?.darkTopHighlight ?? defaults.darkTopHighlight,
});

const resolveTypography = (
  typography: SignInExperienceAppearance['typography'],
  defaults: AppearancePresetDefaults['typography']
): ResolvedAppearance['typography'] => ({
  fontPreset: typography?.fontPreset ?? defaults.fontPreset,
  customFontFamily: typography?.customFontFamily,
  customFontStylesheetUrl: typography?.customFontStylesheetUrl,
});

const resolveMotion = (
  motion: SignInExperienceAppearance['motion'],
  defaults: AppearancePresetDefaults['motion']
): ResolvedAppearance['motion'] => ({
  reduced: motion?.reduced ?? defaults.reduced,
  errorShake: motion?.errorShake ?? defaults.errorShake,
});

export const resolveSignInExperienceAppearance = (
  appearance?: SignInExperienceAppearance,
  branding?: Branding,
  hideLogtoBranding?: boolean
): ResolvedAppearance => {
  const preset: AppearancePreset = appearance?.preset ?? 'entropy';
  const defaults = appearancePresetDefaults[preset];

  return {
    preset,
    layout: appearance?.layout ?? defaults.layout,
    headerAlignment: appearance?.headerAlignment ?? defaults.headerAlignment,
    cardWidth: appearance?.cardWidth ?? defaults.cardWidth,
    topBar: resolveTopBar(appearance?.topBar, defaults.topBar),
    background: resolveBackground(appearance?.background, defaults.background),
    hero: resolveHero(appearance?.hero),
    surface: resolveSurface(appearance?.surface, defaults.surface),
    typography: resolveTypography(appearance?.typography, defaults.typography),
    motion: resolveMotion(appearance?.motion, defaults.motion),
    footerBranding: resolveFooterBranding(branding, hideLogtoBranding),
  };
};

export const getAppearanceFontStylesheetUrl = (
  typography: ResolvedAppearance['typography']
): string | undefined => {
  if (typography.fontPreset === 'custom') {
    return typography.customFontStylesheetUrl;
  }

  if (typography.fontPreset === 'noto-sans-sc') {
    return 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap';
  }

  if (typography.fontPreset === 'inter') {
    return 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
  }

  return undefined;
};

const resolveFontFamily = (typography: ResolvedAppearance['typography']): string => {
  if (typography.fontPreset === 'custom' && typography.customFontFamily) {
    return `${typography.customFontFamily}, ${fontFamilyByPreset.system}`;
  }

  if (typography.fontPreset === 'custom') {
    return fontFamilyByPreset.system;
  }

  return fontFamilyByPreset[typography.fontPreset];
};

const resolvePrimaryBrand = (
  preset: AppearancePreset,
  colorConfig: Partial<Color> | undefined,
  isDark: boolean
) => {
  const presetColors = appearancePresetDefaults[preset].color;
  const primaryHex = isDark
    ? (colorConfig?.darkPrimaryColor ?? presetColors.darkPrimaryColor)
    : (colorConfig?.primaryColor ?? presetColors.primaryColor);
  const explicitForeground = isDark
    ? colorConfig?.darkPrimaryForegroundColor
    : colorConfig?.primaryForegroundColor;

  return generateBrandColorStates(primaryHex, isDark, explicitForeground);
};

const resolveLinkHex = (
  preset: AppearancePreset,
  brandDefault: string,
  colorConfig: Partial<Color> | undefined,
  isDark: boolean
): string => {
  const configured = isDark ? colorConfig?.darkLinkColor : colorConfig?.linkColor;

  if (configured) {
    return configured;
  }

  if (preset === 'classic') {
    return brandDefault;
  }

  const presetColors = appearancePresetDefaults[preset].color;

  return isDark ? presetColors.darkLinkColor : presetColors.linkColor;
};

const resolveCardShadow = (surface: ResolvedAppearance['surface'], isDark: boolean): string => {
  const shadowSpec = cardShadowMap[surface.shadow];

  if (!isDark) {
    return shadowSpec.light;
  }

  return surface.darkTopHighlight ? shadowSpec.darkHighlight : shadowSpec.dark;
};

export const buildAppearanceCssVariables = (
  resolved: ResolvedAppearance,
  colorConfig: Partial<Color> | undefined,
  theme: Theme
): Record<string, string> => {
  const isDark = theme === Theme.Dark;
  const brand = resolvePrimaryBrand(resolved.preset, colorConfig, isDark);
  const linkHex = resolveLinkHex(resolved.preset, brand.default, colorConfig, isDark);
  const linkStates = generateBrandColorStates(linkHex, isDark);
  const widthSpec = cardWidthPx[resolved.cardWidth];

  return {
    '--color-brand-default': brand.default,
    '--color-brand-hover': brand.hover,
    '--color-brand-pressed': brand.pressed,
    '--color-brand-loading': brand.loading,
    '--color-brand-foreground': brand.foreground,
    '--color-type-link': linkHex,
    '--color-ring': linkHex,
    '--color-overlay-brand-focused': linkStates.overlayFocused,
    '--color-overlay-brand-hover': linkStates.overlayHover,
    '--color-overlay-brand-pressed': linkStates.overlayPressed,
    '--color-bg-float-base': isDark
      ? resolved.background.darkColor
      : resolved.background.lightColor,
    '--color-bg-float': isDark ? resolved.surface.darkCardColor : resolved.surface.lightCardColor,
    '--radius': controlRadiusPx[resolved.surface.controlRadius],
    '--radius-card': cardRadiusPx[resolved.surface.cardRadius],
    '--card-outer-width': widthSpec.outer,
    '--card-inner-width': widthSpec.inner,
    '--color-shadow-card': resolveCardShadow(resolved.surface, isDark),
    '--font-family-sans': resolveFontFamily(resolved.typography),
    '--font-family-mono': defaultMonoFontFamily,
    '--bg-image-overlay-opacity': String(resolved.background.overlayOpacity),
  };
};

const serializeCssBlock = (selector: string, variables: Record<string, string>) => {
  const declarations = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `${selector} {\n${declarations}\n}`;
};

/**
 * Generates a self-contained CSS block for both `light` and `dark` themes, safe for
 * server-side injection into `<style data-appearance-tokens>` to eliminate first-paint FOUC.
 */
export const buildAppearanceStyleSheet = (
  resolved: ResolvedAppearance,
  colorConfig?: Partial<Color>
): string => {
  const lightVariables = buildAppearanceCssVariables(resolved, colorConfig, Theme.Light);
  const darkVariables = buildAppearanceCssVariables(resolved, colorConfig, Theme.Dark);

  return [
    serializeCssBlock('html[data-theme="light"] body, body.light', lightVariables),
    serializeCssBlock('html[data-theme="dark"] body, body.dark', darkVariables),
  ].join('\n');
};
