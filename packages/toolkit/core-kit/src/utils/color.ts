import color from 'color';

// Color hsl lighten/darken takes percentage value only, need to implement absolute value update
export const absoluteLighten = (baseColor: color, delta: number) => {
  const hslArray = baseColor.hsl().round().array();

  return color(
    [hslArray[0] ?? 0, hslArray[1] ?? 0, Math.min(100, (hslArray[2] ?? 0) + delta)],
    'hsl'
  );
};

export const absoluteDarken = (baseColor: color, delta: number) => {
  const hslArray = baseColor.hsl().round().array();

  return color(
    [hslArray[0] ?? 0, hslArray[1] ?? 0, Math.max(0, (hslArray[2] ?? 0) - delta)],
    'hsl'
  );
};

export const generateDarkColor = (lightColor: string) =>
  absoluteLighten(color(lightColor), 10).hex();

/**
 * Picks whichever foreground (`lightForeground` or `darkForeground`) yields the higher
 * WCAG 2.1 contrast ratio against `backgroundColor`. Prevents unreadable white-on-white
 * buttons when a tenant uses bright primary colors (e.g. `#f5f7fa` in dark mode).
 */
export const getAccessibleForegroundColor = (
  backgroundColor: string,
  lightForeground = '#ffffff',
  darkForeground = '#0f1114'
): string => {
  try {
    const bg = color(backgroundColor);
    const light = color(lightForeground);
    const dark = color(darkForeground);

    return bg.contrast(light) >= bg.contrast(dark) ? lightForeground : darkForeground;
  } catch {
    return lightForeground;
  }
};

export type BrandColorStates = {
  default: string;
  hover: string;
  pressed: string;
  loading: string;
  foreground: string;
  overlayFocused: string;
  overlayHover: string;
  overlayPressed: string;
};

/**
 * Derives interactive button & focus-ring color states for a primary brand color.
 * Handles near-black (e.g. `#14171c`) and near-white (e.g. `#f5f7fa`) monochrome primaries
 * gracefully so hover/pressed states remain visibly distinct without clamping to identical values.
 */
export const generateBrandColorStates = (
  baseHexColor: string,
  isDark: boolean,
  explicitForeground?: string
): BrandColorStates => {
  const base = color(baseHexColor);
  const lightness = base.lightness();
  const isVeryLight = lightness >= 85;
  const isVeryDark = lightness <= 15;

  const hover = isVeryLight
    ? absoluteDarken(base, 6).hex()
    : isVeryDark
      ? absoluteLighten(base, 8).hex()
      : absoluteLighten(base, 10).hex();

  const pressed = isVeryLight
    ? absoluteDarken(base, 12).hex()
    : isVeryDark
      ? absoluteLighten(base, 4).hex()
      : absoluteDarken(base, 10).hex();

  const loading = isVeryLight
    ? absoluteDarken(base, 8).hex()
    : isVeryDark
      ? absoluteLighten(base, 12).hex()
      : isDark
        ? absoluteDarken(base, 10).hex()
        : absoluteLighten(base, 15).hex();

  const overlayBase = isDark && !isVeryLight ? absoluteLighten(base, 30) : base;

  return {
    default: base.hex(),
    hover,
    pressed,
    loading,
    foreground: explicitForeground ?? getAccessibleForegroundColor(baseHexColor),
    overlayFocused: overlayBase.rgb().alpha(0.16).string(),
    overlayHover: overlayBase.rgb().alpha(0.08).string(),
    overlayPressed: overlayBase.rgb().alpha(0.12).string(),
  };
};
