import classNames from 'classnames';
import { useRef, useState } from 'react';

import ContactIcon from '@/assets/icons/contact-us.svg?react';
import CubeIcon from '@/assets/icons/cube.svg?react';
import DocumentIcon from '@/assets/icons/document-nav-button.svg?react';
import CloudLogo from '@/assets/images/cloud-logo.svg?react';
import { isCloud } from '@/consts/env';
import DynamicT from '@/ds-components/DynamicT';
import Spacer from '@/ds-components/Spacer';
import TextLink from '@/ds-components/TextLink';
import useConsoleBranding, { getConsoleLogoUrl } from '@/hooks/use-console-branding';
import useDocumentationUrl from '@/hooks/use-documentation-url';
import useTenantPathname from '@/hooks/use-tenant-pathname';
import useTheme from '@/hooks/use-theme';
import { onKeyDownHandler } from '@/utils/a11y';

import ContactModal from './ContactModal';
import EnterpriseSubscriptions from './EnterpriseSubscriptions';
import InkeepAskAi from './InkeepAskAi';
import TenantSelector from './TenantSelector';
import UserInfo from './UserInfo';
import styles from './index.module.scss';
import { currentVersion } from './utils';

type Props = {
  readonly className?: string;
  /* eslint-disable react/boolean-prop-naming */
  readonly hideTenantSelector?: boolean;
  readonly hideTitle?: boolean;
  /* eslint-enable react/boolean-prop-naming */
};

function Topbar({ className, hideTenantSelector, hideTitle }: Props) {
  const { navigate } = useTenantPathname();
  const theme = useTheme();
  const consoleBranding = useConsoleBranding();
  const logoUrl = getConsoleLogoUrl(consoleBranding, theme);

  return (
    <div className={classNames(styles.topbar, className)}>
      {isCloud ? (
        <CloudLogo
          className={styles.logo}
          onClick={() => {
            navigate('/');
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.brandButton}
          onClick={() => {
            navigate('/');
          }}
        >
          {logoUrl && <img className={styles.logo} src={logoUrl} alt={consoleBranding.brandName} />}
          {!hideTitle && <span className={styles.text}>{consoleBranding.brandName}</span>}
        </button>
      )}
      {isCloud && !hideTenantSelector && <TenantSelector />}
      <Spacer />
      {isCloud && <InkeepAskAi className={styles.button} />}
      {isCloud && <EnterpriseSubscriptions className={styles.button} />}
      {(isCloud || Boolean(consoleBranding.docsUrl)) && (
        <DocumentButton customDocsUrl={consoleBranding.docsUrl} />
      )}
      {isCloud ? (
        <HelpButton />
      ) : (
        Boolean(consoleBranding.supportEmail) && (
          <SupportEmailButton email={consoleBranding.supportEmail} />
        )
      )}
      {!isCloud && <VersionBadge />}
      <UserInfo />
    </div>
  );
}

export default Topbar;

function DocumentButton({ customDocsUrl }: { readonly customDocsUrl?: string }) {
  const { documentationSiteUrl } = useDocumentationUrl();
  const href = customDocsUrl ?? documentationSiteUrl;

  return (
    <TextLink
      href={href}
      targetBlank="noopener"
      className={styles.button}
      icon={<DocumentIcon className={styles.icon} />}
    >
      <DynamicT forKey="topbar.docs" />
    </TextLink>
  );
}

function SupportEmailButton({ email }: { readonly email: string }) {
  return (
    <TextLink
      href={`mailto:${email}`}
      className={styles.button}
      icon={<ContactIcon className={styles.icon} />}
    >
      <DynamicT forKey="topbar.help" />
    </TextLink>
  );
}

function HelpButton() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={anchorRef}
        tabIndex={0}
        className={styles.button}
        role="button"
        onKeyDown={onKeyDownHandler(() => {
          setIsContactOpen(true);
        })}
        onClick={() => {
          setIsContactOpen(true);
        }}
      >
        <ContactIcon className={styles.icon} />
        <span>
          <DynamicT forKey="topbar.help" />
        </span>
      </div>
      <ContactModal
        isOpen={isContactOpen}
        onCancel={() => {
          setIsContactOpen(false);
        }}
      />
    </>
  );
}

function VersionBadge() {
  return (
    <span className={styles.versionBadge}>
      <CubeIcon className={styles.icon} />v{currentVersion}
    </span>
  );
}
