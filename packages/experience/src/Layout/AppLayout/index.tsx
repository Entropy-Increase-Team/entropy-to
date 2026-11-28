import { resolveSignInExperienceAppearance, Theme, type ResolvedAppearance } from '@logto/schemas';
import classNames from 'classnames';
import { useContext, useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import ExperienceTopBar from '@/components/ExperienceTopBar';
import usePlatform from '@/hooks/use-platform';
import LogtoSignature from '@/shared/components/LogtoSignature';
import { getBrandingLogoUrl } from '@/shared/utils/logo';
import { layoutClassNames } from '@/utils/consts';

import CustomContent from './CustomContent';
import styles from './index.module.scss';

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

const pickThemedUrl = (theme: Theme, lightUrl?: string, darkUrl?: string) =>
  getSafeHttpUrl(theme === Theme.Dark ? (darkUrl ?? lightUrl) : (lightUrl ?? darkUrl));

const BackgroundLayer = ({
  background,
  theme,
}: {
  readonly background: ResolvedAppearance['background'];
  readonly theme: Theme;
}) => {
  const imageUrl =
    background.type === 'image'
      ? pickThemedUrl(theme, background.imageUrl, background.darkImageUrl)
      : undefined;

  return (
    <div className={styles.backgroundLayer} aria-hidden="true">
      {background.type === 'tech-grid' && <div className={styles.techGrid} />}
      {background.type === 'subtle-gradient' && <div className={styles.subtleGradient} />}
      {imageUrl && (
        <>
          <div
            className={styles.backgroundImage}
            style={{ backgroundImage: `url("${imageUrl}")` }}
          />
          <div className={styles.backgroundOverlay} />
        </>
      )}
    </div>
  );
};

const SplitHeroPanel = ({
  hero,
  theme,
  logoUrl,
  isAdaptiveLogo,
  fallbackTitle,
  fallbackDescription,
}: {
  readonly hero: ResolvedAppearance['hero'];
  readonly theme: Theme;
  readonly logoUrl?: string;
  readonly isAdaptiveLogo: boolean;
  readonly fallbackTitle?: string;
  readonly fallbackDescription?: string;
}) => {
  const heroImageUrl = pickThemedUrl(theme, hero.imageUrl, hero.darkImageUrl);
  const title = hero.title?.trim() ?? fallbackTitle;
  const description = hero.description?.trim() ?? fallbackDescription;

  return (
    <section className={styles.heroPanel}>
      <div className={styles.heroGridBackdrop} aria-hidden="true" />
      <div className={styles.heroContent}>
        {hero.badge && <span className={styles.heroBadge}>{hero.badge}</span>}
        {logoUrl && (
          <img
            className={classNames(styles.heroLogo, isAdaptiveLogo && 'theme-adaptive-logo')}
            src={logoUrl}
            alt={title ?? ''}
          />
        )}
        {title && <h1 className={styles.heroTitle}>{title}</h1>}
        {description && <p className={styles.heroDescription}>{description}</p>}
        {heroImageUrl && (
          <div className={styles.heroMedia}>
            <img className={styles.heroImage} src={heroImageUrl} alt="" />
          </div>
        )}
      </div>
    </section>
  );
};

const AppLayout = () => {
  const { experienceSettings, theme } = useContext(PageContext);
  const { isMobile } = usePlatform();

  const resolvedAppearance = useMemo(
    () =>
      resolveSignInExperienceAppearance(
        experienceSettings?.appearance,
        experienceSettings?.branding,
        experienceSettings?.hideLogtoBranding
      ),
    [
      experienceSettings?.appearance,
      experienceSettings?.branding,
      experienceSettings?.hideLogtoBranding,
    ]
  );

  const { layout, background, hero, footerBranding } = resolvedAppearance;
  const isSplitLayout = !isMobile && (layout === 'split-left' || layout === 'split-right');
  const isFramedLayout = !isMobile && layout === 'framed';
  const isMinimalLayout = !isMobile && layout === 'minimal';

  const heroLogoUrl =
    experienceSettings &&
    getBrandingLogoUrl({
      theme,
      branding: experienceSettings.branding,
      isDarkModeEnabled: experienceSettings.color.isDarkModeEnabled,
    });
  const shouldInvertHeroLogo =
    Boolean(experienceSettings?.branding.adaptiveLogo) &&
    theme === Theme.Dark &&
    Boolean(experienceSettings?.branding.logoUrl) &&
    !experienceSettings?.branding.darkLogoUrl;

  const mainCard = (
    <main
      className={classNames(
        styles.main,
        layoutClassNames.mainContent,
        isFramedLayout && styles.framedMain,
        isMinimalLayout && styles.minimalMain,
        isSplitLayout && styles.splitMain
      )}
    >
      <Outlet />
      {footerBranding.mode !== 'hidden' && (
        <LogtoSignature
          className={classNames(styles.signature, layoutClassNames.signature)}
          theme={theme}
          footerBranding={footerBranding}
        />
      )}
    </main>
  );

  return (
    <div
      className={classNames(
        styles.viewBox,
        resolvedAppearance.topBar.enabled && styles.hasTopBar,
        isSplitLayout && styles.splitViewBox
      )}
    >
      <BackgroundLayer background={background} theme={theme} />
      <ExperienceTopBar resolvedAppearance={resolvedAppearance} />

      <div
        className={classNames(
          styles.container,
          layoutClassNames.pageContainer,
          isSplitLayout && styles.splitContainer,
          layout === 'split-right' && styles.splitRight
        )}
      >
        {!isMobile && <CustomContent className={layoutClassNames.customContent} />}

        {isSplitLayout ? (
          <div className={styles.splitGrid}>
            <SplitHeroPanel
              hero={hero}
              theme={theme}
              logoUrl={heroLogoUrl ?? undefined}
              isAdaptiveLogo={shouldInvertHeroLogo}
              fallbackTitle={experienceSettings?.branding.brandName?.trim()}
              fallbackDescription={experienceSettings?.branding.tagline?.trim()}
            />
            <div className={styles.authPanel}>{mainCard}</div>
          </div>
        ) : isFramedLayout ? (
          <div className={styles.frameOuter}>{mainCard}</div>
        ) : (
          mainCard
        )}
      </div>
    </div>
  );
};

export default AppLayout;
