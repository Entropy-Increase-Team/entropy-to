import { type FooterBranding, Theme } from '@logto/schemas';
import classNames from 'classnames';

import LogtoLogoDark from '@/shared/assets/icons/logto-logo-dark.svg?react';
import LogtoLogoLight from '@/shared/assets/icons/logto-logo-light.svg?react';
import LogtoLogoShadow from '@/shared/assets/icons/logto-logo-shadow.svg?react';

import styles from './index.module.scss';

const logtoUrl = `https://logto.io/?${new URLSearchParams({
  utm_source: 'sign_in',
  utm_medium: 'powered_by',
}).toString()}`;

const getSafeHttpUrl = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

type Props = {
  readonly className?: string;
  readonly theme: Theme;
  readonly footerBranding?: FooterBranding;
};

/**
 * Configurable 3-state footer signature (`hidden` | `custom` | `logto`).
 * Defaults to `logto` when `footerBranding` is omitted so legacy callers gated by
 * `!hideLogtoBranding` continue to work without breaking changes.
 */
const LogtoSignature = ({ className, theme, footerBranding }: Props) => {
  const resolved: FooterBranding = footerBranding ?? { mode: 'logto' };

  if (resolved.mode === 'hidden') {
    return null;
  }

  if (resolved.mode === 'custom') {
    const logoUrl =
      theme === Theme.Dark
        ? (resolved.darkLogoUrl ?? resolved.logoUrl)
        : (resolved.logoUrl ?? resolved.darkLogoUrl);
    const safeLinkUrl = getSafeHttpUrl(resolved.linkUrl);
    const safeIcpUrl = getSafeHttpUrl(resolved.icpUrl);
    const text = resolved.text?.trim();
    const icpRecord = resolved.icpRecord?.trim();

    if (!logoUrl && !text && !icpRecord) {
      return null;
    }

    const brandContent = (
      <>
        {logoUrl && <img className={styles.customLogo} src={logoUrl} alt="" />}
        {text && <span className={styles.customText}>{text}</span>}
      </>
    );

    return (
      <div className={classNames(styles.wrapper, className)} data-brand-signature="custom">
        {(logoUrl ?? text) &&
          (safeLinkUrl ? (
            <a
              className={styles.customLink}
              href={safeLinkUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {brandContent}
            </a>
          ) : (
            <span className={styles.customStatic}>{brandContent}</span>
          ))}
        {icpRecord && (
          <>
            {(logoUrl ?? text) && (
              <span className={styles.separator} aria-hidden="true">
                ·
              </span>
            )}
            {safeIcpUrl ? (
              <a
                className={styles.icpLink}
                href={safeIcpUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {icpRecord}
              </a>
            ) : (
              <span className={styles.icpText}>{icpRecord}</span>
            )}
          </>
        )}
      </div>
    );
  }

  const LogtoLogo = theme === Theme.Light ? LogtoLogoLight : LogtoLogoDark;

  return (
    <div className={classNames(styles.wrapper, className)} data-brand-signature="logto">
      <a
        aria-label="Powered By Logto"
        className={styles.signature}
        data-logto-signature="logto"
        href={logtoUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className={styles.text}>Powered by</span>
        <LogtoLogoShadow className={styles.staticIcon} />
        <LogtoLogo className={styles.highlightIcon} />
      </a>
    </div>
  );
};

export { LogtoSignature as BrandSignature };
export default LogtoSignature;
