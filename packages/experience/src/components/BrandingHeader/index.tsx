import { Theme, type AppearanceHeaderAlignment } from '@logto/schemas';
import type { Nullable } from '@silverhand/essentials';
import classNames from 'classnames';
import type { TFuncKey } from 'i18next';
import { useContext, useState } from 'react';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import ConnectIcon from '@/assets/icons/connect-icon.svg?react';
import ThirdPartyAppIconDark from '@/assets/icons/third-party-app-dark.svg?react';
import ThirdPartyAppIcon from '@/assets/icons/third-party-app.svg?react';
import DynamicT from '@/shared/components/DynamicT';

import styles from './index.module.scss';

export type Props = {
  readonly className?: string;
  readonly logo?: Nullable<string>;
  readonly thirdPartyLogo?: Nullable<string>;
  readonly brandName?: Nullable<string>;
  readonly tagline?: Nullable<string>;
  readonly isAdaptiveLogo?: boolean;
  readonly alignment?: AppearanceHeaderAlignment;
  readonly headline?: TFuncKey;
  readonly headlineInterpolation?: Record<string, unknown>;
};

const BrandingHeader = ({
  logo,
  thirdPartyLogo,
  brandName,
  tagline,
  isAdaptiveLogo = false,
  alignment = 'center',
  headline,
  headlineInterpolation,
  className,
}: Props) => {
  const { theme } = useContext(PageContext);
  /**
   * The third-party logo is a remote asset the client declares (e.g. a CIMD client's `logo_uri`),
   * loaded with no user interaction: `no-referrer` keeps it from carrying the tenant origin to
   * that host, and a load failure falls back to the third-party application icon so the header
   * keeps its shape.
   */
  const [isThirdPartyLogoBroken, setIsThirdPartyLogoBroken] = useState(false);
  const FallbackThirdPartyLogo = theme === Theme.Light ? ThirdPartyAppIcon : ThirdPartyAppIconDark;
  const shouldShowLogo = Boolean(thirdPartyLogo ?? logo);
  const shouldConnectSvg = Boolean(thirdPartyLogo && logo);
  const normalizedBrandName = brandName?.trim();
  const normalizedTagline = tagline?.trim();
  const shouldShowBrandWordmark = !shouldShowLogo && Boolean(normalizedBrandName);

  return (
    <div
      className={classNames(styles.container, alignment === 'left' && styles.alignLeft, className)}
    >
      {shouldShowLogo && (
        <div className={styles.logoWrapper}>
          {thirdPartyLogo &&
            (isThirdPartyLogoBroken ? (
              <FallbackThirdPartyLogo className={classNames(styles.logo, styles.thirdPartyLogo)} />
            ) : (
              <img
                className={classNames(styles.logo, styles.thirdPartyLogo)}
                alt="third party logo"
                src={thirdPartyLogo}
                referrerPolicy="no-referrer"
                onError={() => {
                  setIsThirdPartyLogoBroken(true);
                }}
              />
            ))}
          {shouldConnectSvg && <ConnectIcon className={styles.connectIcon} />}
          {logo && (
            <img
              className={classNames(styles.logo, isAdaptiveLogo && 'theme-adaptive-logo')}
              alt={normalizedBrandName ?? 'app logo'}
              src={logo}
            />
          )}
        </div>
      )}

      {shouldShowBrandWordmark && <div className={styles.brandWordmark}>{normalizedBrandName}</div>}

      {headline && (
        <div className={styles.headline}>
          <DynamicT forKey={headline} interpolation={headlineInterpolation} />
        </div>
      )}

      {normalizedTagline && <div className={styles.tagline}>{normalizedTagline}</div>}
    </div>
  );
};

export default BrandingHeader;
