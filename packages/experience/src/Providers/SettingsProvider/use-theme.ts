import { Theme } from '@logto/schemas';
import { useEffect, useContext } from 'react';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import { getThemeOverride } from '@/shared/utils/theme';

const prefersDarkSchemeQuery = '(prefers-color-scheme: dark)';
const userThemeStorageKey = 'entropy_experience_theme_preference';

const getDarkThemeWatchMedia = (): MediaQueryList | undefined => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return undefined;
  }

  return window.matchMedia(prefersDarkSchemeQuery);
};

export const getThemeBySystemConfiguration = (): Theme =>
  getDarkThemeWatchMedia()?.matches ? Theme.Dark : Theme.Light;

export const getUserThemePreference = (): Theme | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const stored = window.sessionStorage.getItem(userThemeStorageKey);
    if (stored === Theme.Dark || stored === Theme.Light) {
      return stored;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const saveUserThemePreference = (theme: Theme) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(userThemeStorageKey, theme);
  } catch {
    // Ignore storage failures in private browsing or sandboxed iframes
  }
};

/**
 * The theme to render with when dark mode is enabled:
 * 1. Explicit in-session user choice from the TopBar ThemeToggle
 * 2. Server-resolved OIDC theme override (`_logto` flow cookie)
 * 3. End-user's OS color scheme preference
 */
export const getPreferredTheme = (): Theme =>
  getUserThemePreference() ?? getThemeOverride() ?? getThemeBySystemConfiguration();

export default function useTheme() {
  const { isPreview, experienceSettings, setTheme } = useContext(PageContext);

  useEffect(() => {
    if (!experienceSettings?.color.isDarkModeEnabled) {
      return;
    }

    setTheme(getPreferredTheme());

    const darkThemeWatchMedia =
      (getUserThemePreference() ?? getThemeOverride()) ? undefined : getDarkThemeWatchMedia();

    if (!darkThemeWatchMedia) {
      return;
    }

    const changeTheme = () => {
      if (getUserThemePreference()) {
        return;
      }
      setTheme(getThemeBySystemConfiguration());
    };

    darkThemeWatchMedia.addEventListener('change', changeTheme);

    return () => {
      darkThemeWatchMedia.removeEventListener('change', changeTheme);
    };
  }, [experienceSettings, isPreview, setTheme]);
}
