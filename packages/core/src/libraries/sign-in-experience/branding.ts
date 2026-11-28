import {
  ConnectorType,
  ForgotPasswordMethod,
  type Branding,
  type ForgotPasswordMethods,
  type FullSignInExperience,
} from '@logto/schemas';
import { type Nullable } from '@silverhand/essentials';

import { EnvSet } from '#src/env-set/index.js';
import type { LogtoConnector } from '#src/utils/connectors/types.js';

export const getForgotPasswordAvailability = (
  connectors: LogtoConnector[],
  methods: Nullable<ForgotPasswordMethods>
): FullSignInExperience['forgotPassword'] => {
  const hasEmailConnector = connectors.some(({ type }) => type === ConnectorType.Email);
  const hasSmsConnector = connectors.some(({ type }) => type === ConnectorType.Sms);

  if (!methods) {
    return {
      email: hasEmailConnector,
      phone: hasSmsConnector,
    };
  }

  return {
    email: methods.includes(ForgotPasswordMethod.EmailVerificationCode) && hasEmailConnector,
    phone: methods.includes(ForgotPasswordMethod.PhoneVerificationCode) && hasSmsConnector,
  };
};

export const mergeInstanceBrandingFallbacks = (branding: Branding): Branding => {
  const fallbacks: Branding = {
    ...(process.env.BRAND_NAME && { brandName: EnvSet.values.brandName }),
    ...(EnvSet.values.brandLogoUrl && { logoUrl: EnvSet.values.brandLogoUrl }),
    ...(EnvSet.values.brandDarkLogoUrl && { darkLogoUrl: EnvSet.values.brandDarkLogoUrl }),
    ...(EnvSet.values.brandFaviconUrl && { favicon: EnvSet.values.brandFaviconUrl }),
  };

  return Object.keys(fallbacks).length > 0 ? { ...fallbacks, ...branding } : branding;
};

export const resolveInstanceSupportEmail = (supportEmail: Nullable<string>): Nullable<string> =>
  supportEmail ?? (EnvSet.values.brandSupportEmail || null);
