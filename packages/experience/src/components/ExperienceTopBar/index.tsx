import { Theme, type ResolvedAppearance } from '@logto/schemas';
import classNames from 'classnames';
import { useCallback, useContext } from 'react';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import { saveUserThemePreference } from '@/Providers/SettingsProvider/use-theme';
import { getBrandingLogoUrl } from '@/shared/utils/logo';

import styles from './index.module.scss';

type Props = {
  readonly resolvedAppearance: ResolvedAppearance;
  readonly className?: string;
};

const getSafeHttpUrl = (value?: string): string | undefined => {
  if (!value) {
    return;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Ignore invalid URL
  }
};

const SunIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const TopBarBrand = ({
  logoUrl,
  brandName,
  isAdaptiveLogo,
  homeUrl,
}: {
  readonly logoUrl?: string;
  readonly brandName?: string;
  readonly isAdaptiveLogo: boolean;
  readonly homeUrl?: string;
}) => {
  if (!logoUrl && !brandName) {
    return null;
  }

  const content = (
    <span className={styles.brand}>
      {logoUrl && (
        <img
          className={classNames(styles.logo, isAdaptiveLogo && 'theme-adaptive-logo')}
          src={logoUrl}
          alt={brandName ?? ''}
        />
      )}
      {brandName && <span className={styles.brandName}>{brandName}</span>}
    </span>
  );

  if (homeUrl) {
    return (
      <a className={styles.brandLink} href={homeUrl} rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
};

const ExperienceTopBar = ({ resolvedAppearance, className }: Props) => {
  const { experienceSettings, theme, setTheme, isPreview } = useContext(PageContext);

  const handleToggleTheme = useCallback(() => {
    if (isPreview) {
      return;
    }

    const nextTheme = theme === Theme.Dark ? Theme.Light : Theme.Dark;
    saveUserThemePreference(nextTheme);
    setTheme(nextTheme);
  }, [isPreview, setTheme, theme]);

  if (!experienceSettings || !resolvedAppearance.topBar.enabled) {
    return null;
  }

  const {
    branding,
    color: { isDarkModeEnabled },
  } = experienceSettings;
  const logoUrl = getBrandingLogoUrl({ theme, branding, isDarkModeEnabled });
  const shouldInvertLogo =
    Boolean(branding.adaptiveLogo) &&
    theme === Theme.Dark &&
    Boolean(branding.logoUrl) &&
    !branding.darkLogoUrl;
  const brandName = branding.brandName?.trim();
  const safeHomeUrl = getSafeHttpUrl(resolvedAppearance.topBar.homeUrl);
  const homeLabel = resolvedAppearance.topBar.homeLabel?.trim();
  const showThemeToggle = isDarkModeEnabled && resolvedAppearance.topBar.showThemeToggle;

  if (!logoUrl && !brandName && !safeHomeUrl && !showThemeToggle) {
    return null;
  }

  return (
    <header className={classNames(styles.topBar, className)}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <TopBarBrand
            logoUrl={logoUrl ?? undefined}
            brandName={brandName}
            isAdaptiveLogo={shouldInvertLogo}
            homeUrl={safeHomeUrl}
          />
        </div>
        <div className={styles.right}>
          {safeHomeUrl && homeLabel && (
            <a className={styles.homeLink} href={safeHomeUrl} rel="noopener noreferrer">
              {homeLabel}
            </a>
          )}
          {showThemeToggle && (
            <button
              type="button"
              className={styles.themeToggle}
              aria-label={theme === Theme.Dark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === Theme.Dark ? 'Light' : 'Dark'}
              onClick={handleToggleTheme}
            >
              {theme === Theme.Dark ? <SunIcon /> : <MoonIcon />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ExperienceTopBar;
