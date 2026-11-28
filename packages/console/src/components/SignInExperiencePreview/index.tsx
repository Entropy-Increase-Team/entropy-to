import type { LanguageTag } from '@logto/language-kit';
import {
  Theme,
  ConnectorType,
  ForgotPasswordMethod,
  resolveSignInExperienceAppearance,
  signInExperiencePreviewMessageSender,
} from '@logto/schemas';
import type { ConnectorMetadata, ConnectorResponse } from '@logto/schemas';
import { conditional } from '@silverhand/essentials';
import classNames from 'classnames';
import { format } from 'date-fns';
import { useContext, useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import PhoneInfo from '@/assets/images/phone-info.svg?react';
import { AppDataContext } from '@/contexts/AppDataProvider';
import type { RequestError } from '@/hooks/use-api';
import useUiLanguages from '@/hooks/use-ui-languages';
import { type SignInExperiencePageManagedData } from '@/pages/SignInExperience/types';

import styles from './index.module.scss';
import { PreviewPlatform } from './types';

export { default as ToggleUiThemeButton } from './components/ToggleUiThemeButton';

type Props = {
  readonly platform: PreviewPlatform;
  readonly mode: Theme;
  readonly language?: LanguageTag;
  readonly previewPath?: '/sign-in' | '/register';
  readonly signInExperience?: SignInExperiencePageManagedData;
  /**
   * The Logto endpoint to use for the preview. If not provided, the current tenant endpoint from
   * the `AppDataContext` will be used.
   */
  readonly endpoint?: URL;
  /**
   * Whether the preview is disabled. If `true`, the preview will be disabled and a placeholder will
   * be shown instead. Defaults to `false`.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly disabled?: boolean;
};

function SignInExperiencePreview({
  platform,
  mode,
  language = 'en',
  previewPath = '/sign-in',
  signInExperience,
  endpoint: endpointInput,
  disabled = false,
}: Props) {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });

  const { customPhrases } = useUiLanguages();
  const { tenantEndpoint } = useContext(AppDataContext);
  const endpoint = endpointInput ?? tenantEndpoint;
  const previewRef = useRef<HTMLIFrameElement>(null);
  const { data: allConnectors } = useSWR<ConnectorResponse[], RequestError>('api/connectors');
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const resolvedAppearance = useMemo(
    () =>
      resolveSignInExperienceAppearance(
        signInExperience?.appearance,
        signInExperience?.branding,
        signInExperience?.hideLogtoBranding
      ),
    [signInExperience?.appearance, signInExperience?.branding, signInExperience?.hideLogtoBranding]
  );

  const isSplitDesktop =
    platform === PreviewPlatform.DesktopWeb &&
    (resolvedAppearance.layout === 'split-left' || resolvedAppearance.layout === 'split-right');
  const desktopCanvasColor =
    mode === Theme.Dark
      ? resolvedAppearance.background.darkColor
      : resolvedAppearance.background.lightColor;

  const configForUiPage = useMemo(() => {
    if (!allConnectors || !signInExperience) {
      return;
    }

    const socialConnectors = signInExperience.socialSignInConnectorTargets.reduce<
      Array<ConnectorMetadata & { id: string }>
    >(
      (previous, connectorTarget) => [
        ...previous,
        ...allConnectors.filter(({ target }) => target === connectorTarget),
      ],
      []
    );

    const hasEmailConnector = allConnectors.some(({ type }) => type === ConnectorType.Email);
    const hasSmsConnector = allConnectors.some(({ type }) => type === ConnectorType.Sms);

    /**
     * Generate forgot password object based on available connectors and configured methods.
     * This logic aligns with the core library implementation in sign-in-experience/index.ts
     */
    const forgotPassword = (() => {
      if (!signInExperience.forgotPasswordMethods) {
        return {
          email: hasEmailConnector,
          phone: hasSmsConnector,
        };
      }

      return {
        email:
          signInExperience.forgotPasswordMethods.includes(
            ForgotPasswordMethod.EmailVerificationCode
          ) && hasEmailConnector,
        phone:
          signInExperience.forgotPasswordMethods.includes(
            ForgotPasswordMethod.PhoneVerificationCode
          ) && hasSmsConnector,
      };
    })();

    return {
      signInExperience: {
        ...signInExperience,
        socialConnectors,
        forgotPassword,
      },
      language,
      mode,
      platform: platform === PreviewPlatform.DesktopWeb ? 'web' : 'mobile',
      isNative: platform === PreviewPlatform.Mobile,
    };
  }, [allConnectors, language, mode, platform, signInExperience]);

  const postPreviewMessage = useCallback(() => {
    if (!configForUiPage || !customPhrases) {
      return;
    }

    previewRef.current?.contentWindow?.postMessage(
      { sender: signInExperiencePreviewMessageSender, config: configForUiPage },
      endpoint?.origin ?? ''
    );
  }, [endpoint?.origin, configForUiPage, customPhrases]);

  const iframeOnLoadEventHandler = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  useEffect(() => {
    setIframeLoaded(false);
  }, [previewPath]);

  useEffect(() => {
    if (disabled) {
      setIframeLoaded(false);
      return;
    }
    const iframe = previewRef.current;

    iframe?.addEventListener('load', iframeOnLoadEventHandler);

    return () => {
      iframe?.removeEventListener('load', iframeOnLoadEventHandler);
    };
  }, [iframeLoaded, disabled, iframeOnLoadEventHandler, previewPath]);

  useEffect(() => {
    if (!iframeLoaded) {
      return;
    }

    postPreviewMessage();
  }, [iframeLoaded, postPreviewMessage]);

  if (!endpoint) {
    return null;
  }

  return (
    <div
      className={classNames(
        styles.preview,
        platform === PreviewPlatform.DesktopWeb ? styles.web : styles.mobile,
        isSplitDesktop && styles.splitWeb,
        disabled && styles.disabled
      )}
      style={conditional(
        platform === PreviewPlatform.DesktopWeb && {
          backgroundColor: desktopCanvasColor,
        }
      )}
    >
      {disabled ? (
        <div className={styles.placeholder}>
          <div className={styles.title}>{t('sign_in_exp.custom_ui.bring_your_ui_title')}</div>
          <div className={styles.description}>
            {t('sign_in_exp.custom_ui.preview_with_bring_your_ui_description')}
          </div>
        </div>
      ) : (
        <div className={styles.deviceWrapper}>
          <div className={classNames(styles.device, styles[String(mode)])}>
            {platform !== PreviewPlatform.DesktopWeb && (
              <div className={styles.topBar}>
                <div className={styles.time}>{format(Date.now(), 'HH:mm')}</div>
                <PhoneInfo />
              </div>
            )}
            <iframe
              ref={previewRef}
              // Allow all sandbox rules
              sandbox={undefined}
              src={new URL(`${previewPath}?preview=true`, endpoint).toString()}
              tabIndex={-1}
              title={t('sign_in_exp.preview.title')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SignInExperiencePreview;
