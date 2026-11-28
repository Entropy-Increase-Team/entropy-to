import Logo from '@/assets/images/logo.svg?react';
import { isCloud } from '@/consts/env';
import { Daisy as Spinner } from '@/ds-components/Spinner';
import useConsoleBranding, { getConsoleLogoUrl } from '@/hooks/use-console-branding';
import useTheme from '@/hooks/use-theme';

import styles from './index.module.scss';

function AppLoading() {
  const theme = useTheme();
  const consoleBranding = useConsoleBranding();
  const logoUrl = getConsoleLogoUrl(consoleBranding, theme);

  return (
    <div className={styles.container}>
      {isCloud ? (
        <Logo />
      ) : logoUrl ? (
        <img className={styles.brandLogo} src={logoUrl} alt={consoleBranding.brandName} />
      ) : (
        <div className={styles.brandTitle}>{consoleBranding.brandName}</div>
      )}
      <Spinner />
    </div>
  );
}

export default AppLoading;
