import {
  type AppearanceBackgroundType,
  type AppearanceLayout,
  type AppearancePreset,
  type ApplicationSignInExperience,
} from '@logto/schemas';

import { sanitizeAppearanceForSubmit } from '@/pages/SignInExperience/PageContent/utils/parser';
import { removeFalsyValues } from '@/utils/object';

export type ApplicationSignInExperienceForm = ApplicationSignInExperience & {
  /**
   * Used to determine if the application enables branding for the app-level sign-in experience.
   * Only effective for non-third-party applications.
   */
  isBrandingEnabled: boolean;
};

type InheritOr<T extends string> = '' | T;
export type AppPresetOption = InheritOr<AppearancePreset>;
export type AppLayoutOption = InheritOr<AppearanceLayout>;
export type AppBackgroundOption = InheritOr<AppearanceBackgroundType>;

/**
 * Format the form data to match the API request body
 * - Omit `applicationId` and `tenantId` from the request body
 * - Remove the empty `logoUrl` and `darkLogoUrl` fields in the `branding` object
 */
export const formatFormToSubmitData = (
  data: ApplicationSignInExperienceForm
): Omit<ApplicationSignInExperience, 'applicationId' | 'tenantId'> => {
  const {
    branding,
    color,
    appearance,
    customCss,
    applicationId,
    tenantId,
    isBrandingEnabled,
    ...rest
  } = data;

  return {
    ...rest,
    ...(isBrandingEnabled
      ? {
          color,
          branding: removeFalsyValues(branding),
          appearance: sanitizeAppearanceForSubmit(appearance),
          customCss,
        }
      : { color: {}, branding: {}, appearance: {}, customCss: '' }),
  };
};
