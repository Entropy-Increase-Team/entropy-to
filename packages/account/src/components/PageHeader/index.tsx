import { getBrandingLogoUrl } from '@experience/shared/utils/logo';
import { Theme } from '@logto/schemas';
import classNames from 'classnames';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import PageContext from '@ac/Providers/PageContextProvider/PageContext';
import UserMenu from '@ac/components/UserMenu';
import { layoutClassNames } from '@ac/constants/layout';

import styles from './index.module.scss';

const PageHeader = () => {
  const { t } = useTranslation();
  const { theme, experienceSettings } = useContext(PageContext);

  const logoUrl =
    experienceSettings &&
    getBrandingLogoUrl({
      theme,
      branding: experienceSettings.branding,
      isDarkModeEnabled: experienceSettings.color.isDarkModeEnabled,
    });
  const shouldInvertLogo =
    Boolean(experienceSettings?.branding.adaptiveLogo) &&
    theme === Theme.Dark &&
    Boolean(experienceSettings?.branding.logoUrl) &&
    !experienceSettings?.branding.darkLogoUrl;
  const brandName = experienceSettings?.branding.brandName?.trim();

  return (
    <header className={classNames(styles.header, layoutClassNames.pageHeader)}>
      <div className={styles.left}>
        {logoUrl && (
          <>
            <img
              className={classNames(styles.logo, shouldInvertLogo && 'theme-adaptive-logo')}
              src={logoUrl}
              alt={brandName ?? 'logo'}
            />
            <div className={styles.divider} />
          </>
        )}
        <span className={styles.appName}>{brandName ?? t('account_center.page.title')}</span>
      </div>
      <UserMenu />
    </header>
  );
};

export default PageHeader;
