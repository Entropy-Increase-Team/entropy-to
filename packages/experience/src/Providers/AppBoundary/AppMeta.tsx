import { Theme } from '@logto/schemas';
import { conditionalString } from '@silverhand/essentials';
import classNames from 'classnames';
import i18next from 'i18next';
import { useContext } from 'react';
import { Helmet } from 'react-helmet';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import { defaultNeutralFavicon } from '@/shared/utils/favicon';
import { type SignInExperienceResponse } from '@/types';

import styles from './index.module.scss';

const themeToFavicon = Object.freeze({
  [Theme.Light]: 'favicon',
  [Theme.Dark]: 'darkFavicon',
} as const satisfies Record<Theme, keyof SignInExperienceResponse['branding']>);

/**
 * Use React Helmet to manage html and body attributes:
 * - lang & dir: set html lang and direction attributes
 * - data-theme: set html data-theme attribute
 * - favicon & apple-touch-icon: tenant favicon or neutral fallback (no proprietary logo)
 * - body classes: preview, platform, and theme
 * - custom css: tenant custom CSS style tag
 */
const AppMeta = () => {
  const { experienceSettings, theme, platform, isPreview } = useContext(PageContext);
  const favicon =
    experienceSettings?.branding[themeToFavicon[theme]] ?? experienceSettings?.branding.favicon;
  const brandName = experienceSettings?.branding.brandName?.trim();

  return (
    <Helmet>
      <html lang={i18next.language} dir={i18next.dir()} data-theme={theme} />
      {brandName && <title>{brandName}</title>}
      <link rel="shortcut icon" href={favicon ?? defaultNeutralFavicon} />
      <link rel="apple-touch-icon" href={favicon ?? defaultNeutralFavicon} sizes="180x180" />
      {experienceSettings?.customCss && <style>{experienceSettings.customCss}</style>}
      <body
        className={classNames(
          conditionalString(isPreview && styles.preview),
          platform === 'mobile' ? 'mobile' : 'desktop',
          conditionalString(styles[theme])
        )}
      />
    </Helmet>
  );
};

export default AppMeta;
