import { type SignInExperienceResponse } from '@experience/shared/types';
import { defaultNeutralFavicon } from '@experience/shared/utils/favicon';
import { Theme } from '@logto/schemas';
import { conditionalString } from '@silverhand/essentials';
import classNames from 'classnames';
import i18next from 'i18next';
import { useContext } from 'react';
import { Helmet } from 'react-helmet';

import PageContext from '@ac/Providers/PageContextProvider/PageContext';

import styles from './index.module.scss';

const themeToFavicon = Object.freeze({
  [Theme.Light]: 'favicon',
  [Theme.Dark]: 'darkFavicon',
} as const satisfies Record<Theme, keyof SignInExperienceResponse['branding']>);

const AppMeta = () => {
  const { experienceSettings, accountCenterSettings, theme, platform } = useContext(PageContext);
  const favicon =
    experienceSettings?.branding[themeToFavicon[theme]] ?? experienceSettings?.branding.favicon;
  const brandName = experienceSettings?.branding.brandName?.trim();

  return (
    <Helmet>
      <html lang={i18next.language} dir={i18next.dir()} data-theme={theme} />
      {brandName && <title>{brandName}</title>}
      <link rel="shortcut icon" href={favicon ?? defaultNeutralFavicon} />
      <link rel="apple-touch-icon" href={favicon ?? defaultNeutralFavicon} sizes="180x180" />
      {accountCenterSettings?.customCss && <style>{accountCenterSettings.customCss}</style>}
      <body
        className={classNames(
          platform === 'mobile' ? 'mobile' : 'desktop',
          conditionalString(styles[theme])
        )}
      />
    </Helmet>
  );
};

export default AppMeta;
