import {
  type AppearanceBackgroundType,
  type AppearanceCardRadius,
  type AppearanceCardWidth,
  type AppearanceControlRadius,
  type AppearanceDensity,
  type AppearanceFontPreset,
  type AppearanceHeaderAlignment,
  type AppearanceLayout,
  type AppearancePreset,
  type AppearanceShadow,
  type FooterBranding,
} from '../foundations/jsonb-types/sign-in-experience.js';

export type AppearancePresetDefaults = {
  preset: AppearancePreset;
  layout: AppearanceLayout;
  headerAlignment: AppearanceHeaderAlignment;
  cardWidth: AppearanceCardWidth;
  topBar: {
    enabled: boolean;
    showThemeToggle: boolean;
  };
  background: {
    type: AppearanceBackgroundType;
    lightColor: string;
    darkColor: string;
    overlayOpacity: number;
  };
  surface: {
    lightCardColor: string;
    darkCardColor: string;
    cardRadius: AppearanceCardRadius;
    controlRadius: AppearanceControlRadius;
    shadow: AppearanceShadow;
    density: AppearanceDensity;
    darkTopHighlight: boolean;
  };
  color: {
    primaryColor: string;
    darkPrimaryColor: string;
    linkColor: string;
    darkLinkColor: string;
  };
  typography: {
    fontPreset: AppearanceFontPreset;
  };
  motion: {
    reduced: boolean;
    errorShake: boolean;
  };
};

/**
 * Built-in login page design presets.
 * - `entropy`: Precision neutral console aesthetic aligned with `entropy-platform-web/design.md`
 *   (no purple tint, non-black layered dark surfaces `#0f1114 -> #14171c -> #161920`, monochrome
 *   high-contrast CTA with calm blue accent `#0d74ce` / `#6ea8ff`, concentric radii, top highlight).
 * - `classic`: Original Logto centered card aesthetic for backward compatibility.
 * - `minimal`: Frameless, flat canvas layout with minimal chrome.
 */
export const appearancePresetDefaults: Readonly<
  Record<AppearancePreset, AppearancePresetDefaults>
> = Object.freeze({
  entropy: {
    preset: 'entropy',
    layout: 'centered',
    headerAlignment: 'center',
    cardWidth: 'default',
    topBar: {
      enabled: true,
      showThemeToggle: true,
    },
    background: {
      type: 'tech-grid',
      lightColor: '#f4f4f6',
      darkColor: '#0f1114',
      overlayOpacity: 0.45,
    },
    surface: {
      lightCardColor: '#ffffff',
      darkCardColor: '#161920',
      cardRadius: 'xl',
      controlRadius: 'md',
      shadow: 'whisper',
      density: 'default',
      darkTopHighlight: true,
    },
    color: {
      primaryColor: '#14171C',
      darkPrimaryColor: '#F5F7FA',
      linkColor: '#0D74CE',
      darkLinkColor: '#6EA8FF',
    },
    typography: {
      fontPreset: 'noto-sans-sc',
    },
    motion: {
      reduced: false,
      errorShake: true,
    },
  },
  classic: {
    preset: 'classic',
    layout: 'centered',
    headerAlignment: 'center',
    cardWidth: 'wide',
    topBar: {
      enabled: false,
      showThemeToggle: false,
    },
    background: {
      type: 'solid',
      lightColor: '#e5e1ec',
      darkColor: '#000000',
      overlayOpacity: 0.4,
    },
    surface: {
      lightCardColor: '#ffffff',
      darkCardColor: '#191c1d',
      cardRadius: 'lg',
      controlRadius: 'md',
      shadow: 'whisper',
      density: 'comfortable',
      darkTopHighlight: false,
    },
    color: {
      primaryColor: '#6139F6',
      darkPrimaryColor: '#7958FF',
      linkColor: '#6139F6',
      darkLinkColor: '#7958FF',
    },
    typography: {
      fontPreset: 'system',
    },
    motion: {
      reduced: false,
      errorShake: false,
    },
  },
  minimal: {
    preset: 'minimal',
    layout: 'minimal',
    headerAlignment: 'left',
    cardWidth: 'compact',
    topBar: {
      enabled: true,
      showThemeToggle: true,
    },
    background: {
      type: 'solid',
      lightColor: '#ffffff',
      darkColor: '#0f1114',
      overlayOpacity: 0.35,
    },
    surface: {
      lightCardColor: '#ffffff',
      darkCardColor: '#0f1114',
      cardRadius: 'none',
      controlRadius: 'md',
      shadow: 'none',
      density: 'default',
      darkTopHighlight: false,
    },
    color: {
      primaryColor: '#14171C',
      darkPrimaryColor: '#F5F7FA',
      linkColor: '#0D74CE',
      darkLinkColor: '#6EA8FF',
    },
    typography: {
      fontPreset: 'noto-sans-sc',
    },
    motion: {
      reduced: false,
      errorShake: true,
    },
  },
});

export type ResolvedAppearance = {
  preset: AppearancePreset;
  layout: AppearanceLayout;
  headerAlignment: AppearanceHeaderAlignment;
  cardWidth: AppearanceCardWidth;
  topBar: {
    enabled: boolean;
    showThemeToggle: boolean;
    homeUrl?: string;
    homeLabel?: string;
  };
  background: {
    type: AppearanceBackgroundType;
    lightColor: string;
    darkColor: string;
    imageUrl?: string;
    darkImageUrl?: string;
    overlayOpacity: number;
  };
  hero: {
    badge?: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    darkImageUrl?: string;
  };
  surface: {
    lightCardColor: string;
    darkCardColor: string;
    cardRadius: AppearanceCardRadius;
    controlRadius: AppearanceControlRadius;
    shadow: AppearanceShadow;
    density: AppearanceDensity;
    darkTopHighlight: boolean;
  };
  typography: {
    fontPreset: AppearanceFontPreset;
    customFontFamily?: string;
    customFontStylesheetUrl?: string;
  };
  motion: {
    reduced: boolean;
    errorShake: boolean;
  };
  footerBranding: FooterBranding;
};

export const cardRadiusPx: Readonly<Record<AppearanceCardRadius, string>> = Object.freeze({
  none: '0px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
});

export const controlRadiusPx: Readonly<Record<AppearanceControlRadius, string>> = Object.freeze({
  none: '0px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  pill: '9999px',
});

export const cardWidthPx: Readonly<Record<AppearanceCardWidth, { outer: string; inner: string }>> =
  Object.freeze({
    compact: { outer: '440px', inner: '360px' },
    default: { outer: '480px', inner: '384px' },
    wide: { outer: '540px', inner: '400px' },
  });

export const fontFamilyByPreset: Readonly<Record<Exclude<AppearanceFontPreset, 'custom'>, string>> =
  Object.freeze({
    'noto-sans-sc':
      "'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    inter:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    system:
      "-apple-system, system-ui, 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'PingFang SC', 'Microsoft YaHei', 'Arial', sans-serif",
  });

export const defaultMonoFontFamily =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export const cardShadowMap: Readonly<
  Record<AppearanceShadow, { light: string; dark: string; darkHighlight: string }>
> = Object.freeze({
  none: {
    light: 'none',
    dark: 'none',
    darkHighlight: 'inset 0 1px rgba(255, 255, 255, 0.04)',
  },
  whisper: {
    light: '0 1px 2px rgba(0, 0, 0, 0.05), 0 3px 6px rgba(0, 0, 0, 0.04)',
    dark: '0 6px 16px rgba(0, 0, 0, 0.32), 0 2px 5px rgba(0, 0, 0, 0.18)',
    darkHighlight:
      'inset 0 1px rgba(255, 255, 255, 0.04), 0 6px 16px rgba(0, 0, 0, 0.32), 0 2px 5px rgba(0, 0, 0, 0.18)',
  },
  elevated: {
    light: '0 10px 24px -6px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.06)',
    dark: '0 18px 40px -6px rgba(0, 0, 0, 0.48), 0 6px 16px -2px rgba(0, 0, 0, 0.28)',
    darkHighlight:
      'inset 0 1px rgba(255, 255, 255, 0.06), 0 18px 40px -6px rgba(0, 0, 0, 0.48), 0 6px 16px -2px rgba(0, 0, 0, 0.28)',
  },
});
