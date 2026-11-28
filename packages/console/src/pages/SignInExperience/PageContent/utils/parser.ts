import { customUiCspDirectives } from '@logto/core-kit';
import {
  AlternativeSignUpIdentifier,
  resolveFooterBranding,
  SignInIdentifier,
  SignInMode,
  type SignInExperience,
  type SignUp,
} from '@logto/schemas';
import { conditional } from '@silverhand/essentials';

import { emptyBranding } from '@/types/sign-in-experience';

import {
  type SignInExperiencePageManagedData,
  type SignInExperienceForm,
  type SignUpForm,
  type CustomUiCspForm,
} from '../../types';

import {
  sanitizeAppearanceForSubmit,
  sanitizeBrandingForSubmit,
  sanitizeColorForSubmit,
} from './branding-parser';

export { sanitizeAppearanceForSubmit } from './branding-parser';

/**
 * For backward compatibility,
 * we need to safely parse the {@link SignUp.identifiers} to the {@link SignUpForm.identifiers} format.
 */
const parsePrimaryIdentifier = (identifiers: SignInIdentifier[]): SignUpForm['identifiers'] => {
  if (identifiers.length === 0) {
    return [];
  }

  if (identifiers.length === 1 && identifiers[0]) {
    return [{ identifier: identifiers[0] }];
  }

  if (
    identifiers.length === 2 &&
    identifiers.includes(SignInIdentifier.Email) &&
    identifiers.includes(SignInIdentifier.Phone)
  ) {
    return [{ identifier: AlternativeSignUpIdentifier.EmailOrPhone }];
  }

  throw new Error('Invalid identifiers in the sign up settings.');
};

const signUpIdentifiersParser = {
  toSignUpForm: (
    identifiers: SignInIdentifier[],
    secondaryIdentifiers: SignUp['secondaryIdentifiers'] = []
  ): SignUpForm['identifiers'] => [
    ...parsePrimaryIdentifier(identifiers),
    ...secondaryIdentifiers.map(({ identifier }) => ({ identifier })),
  ],
  toSieData: (
    signUpIdentifiers: SignUpForm['identifiers']
  ): Pick<SignUp, 'identifiers' | 'secondaryIdentifiers'> => {
    const primaryIdentifier = signUpIdentifiers[0];
    const identifiers = primaryIdentifier
      ? primaryIdentifier.identifier === AlternativeSignUpIdentifier.EmailOrPhone
        ? [SignInIdentifier.Email, SignInIdentifier.Phone]
        : [primaryIdentifier.identifier]
      : [];
    const secondaryIdentifiers = signUpIdentifiers.slice(1).map(({ identifier }) => ({
      identifier,
      // For email or phone, we always set the `verify` flag to true.
      ...conditional(identifier !== SignInIdentifier.Username && { verify: true }),
    }));

    return { identifiers, secondaryIdentifiers };
  },
};

export const signUpFormDataParser = {
  fromSignUp: (data: SignUp): SignUpForm => {
    const { identifiers, secondaryIdentifiers, ...signUpData } = data;
    return {
      identifiers: signUpIdentifiersParser.toSignUpForm(identifiers, secondaryIdentifiers),
      ...signUpData,
    };
  },
  toSignUp: (formData: SignUpForm): SignUp => {
    const { identifiers, ...signUpFormData } = formData;
    return {
      ...signUpIdentifiersParser.toSieData(identifiers),
      ...signUpFormData,
    };
  },
};

const normalizeSignUpProfileFields = (
  signUpProfileFields: SignInExperience['signUpProfileFields']
): NonNullable<SignInExperience['signUpProfileFields']> => signUpProfileFields ?? [];

const createDefaultCustomUiCspForm = (): CustomUiCspForm => ({
  scriptSrc: [],
  connectSrc: [],
});

const normalizeCustomUiCspSources = (sources?: string[]): string[] =>
  sources?.map((source) => source.trim()).filter(Boolean) ?? [];

const normalizeCustomUiCspForForm = (
  customUiCsp?: SignInExperience['customUiCsp']
): CustomUiCspForm => ({
  ...createDefaultCustomUiCspForm(),
  ...Object.fromEntries(
    customUiCspDirectives.map((directive) => [
      directive,
      normalizeCustomUiCspSources(customUiCsp?.[directive]),
    ])
  ),
});

const normalizeCustomUiCspForSubmit = (
  customUiCsp?: SignInExperienceForm['customUiCsp']
): SignInExperiencePageManagedData['customUiCsp'] =>
  customUiCspDirectives.reduce<SignInExperiencePageManagedData['customUiCsp']>(
    (normalizedCustomUiCsp, directive) => {
      const sources = normalizeCustomUiCspSources(customUiCsp?.[directive]);
      if (sources.length === 0) {
        return normalizedCustomUiCsp;
      }

      return { ...normalizedCustomUiCsp, [directive]: sources };
    },
    {}
  );

export const sieFormDataParser = {
  fromSignInExperience: (data: SignInExperience): SignInExperienceForm => {
    const {
      signUp,
      customCss,
      customUiCsp,
      branding,
      appearance,
      // Start: Remove the omitted fields from the data
      passwordPolicy,
      mfa,
      adaptiveMfa,
      captchaPolicy,
      sentinelPolicy,
      emailBlocklistPolicy,
      passwordExpiration,
      usernamePolicy,
      socialSignIn,
      // End: Remove the omitted fields from the data
      ...rest
    } = data;

    return {
      ...rest,
      signUp: signUpFormDataParser.fromSignUp(signUp),
      signUpProfileFields: normalizeSignUpProfileFields(rest.signUpProfileFields),
      hasConfiguredSignUpProfileFields: rest.signUpProfileFields !== null,
      createAccountEnabled: rest.signInMode !== SignInMode.SignIn,
      customCss: customCss ?? undefined,
      customUiCsp: normalizeCustomUiCspForForm(customUiCsp),
      socialSignIn: {
        automaticAccountLinking: false,
        skipRequiredIdentifiers: false,
        ...socialSignIn,
      },
      branding: {
        ...emptyBranding,
        ...branding,
        footerBranding: resolveFooterBranding(branding, rest.hideLogtoBranding),
      },
      appearance,
      passkeySignIn: {
        enabled: false,
        showPasskeyButton: true,
        allowAutofill: true,
        ...rest.passkeySignIn,
      },
    };
  },
  toSignInExperience: (
    formData: SignInExperienceForm,
    {
      isHideLogtoBrandingAvailable = true,
      isCustomUiCspEnabled = false,
    }: { isHideLogtoBrandingAvailable?: boolean; isCustomUiCspEnabled?: boolean } = {}
  ): SignInExperiencePageManagedData => {
    const {
      branding,
      color,
      appearance,
      createAccountEnabled,
      signUp,
      customCss,
      customUiCsp,
      crossOriginOpenerPolicy,
      hasConfiguredSignUpProfileFields,
      socialSignIn,
      hideLogtoBranding,
      ...rest
    } = formData;

    const sanitizedBranding = sanitizeBrandingForSubmit(branding);
    const syncedHideLogtoBranding = sanitizedBranding.footerBranding
      ? sanitizedBranding.footerBranding.mode !== 'logto'
      : hideLogtoBranding;

    return {
      ...rest,
      color: sanitizeColorForSubmit(color),
      branding: sanitizedBranding,
      appearance: sanitizeAppearanceForSubmit(appearance),
      signUp: signUpFormDataParser.toSignUp(signUp),
      signUpProfileFields:
        hasConfiguredSignUpProfileFields || rest.signUpProfileFields.length > 0
          ? rest.signUpProfileFields
          : null,
      socialSignIn,
      signInMode: createAccountEnabled ? SignInMode.SignInAndRegister : SignInMode.SignIn,
      customCss: customCss?.length ? customCss : null,
      ...conditional(
        isCustomUiCspEnabled && {
          customUiCsp: normalizeCustomUiCspForSubmit(customUiCsp),
          crossOriginOpenerPolicy,
        }
      ),
      ...conditional(
        isHideLogtoBrandingAvailable && { hideLogtoBranding: syncedHideLogtoBranding }
      ),
    };
  },
};

export const signInExperienceToUpdatedDataParser = (
  data: SignInExperience,
  {
    isHideLogtoBrandingAvailable = true,
    isCustomUiCspEnabled = false,
  }: { isHideLogtoBrandingAvailable?: boolean; isCustomUiCspEnabled?: boolean } = {}
): SignInExperiencePageManagedData => {
  const {
    signUp,
    customUiCsp,
    crossOriginOpenerPolicy,
    // Start: Remove the omitted fields from the data
    mfa,
    adaptiveMfa,
    passwordPolicy,
    captchaPolicy,
    sentinelPolicy,
    emailBlocklistPolicy,
    hideLogtoBranding,
    passwordExpiration,
    usernamePolicy,
    // End: Remove the omitted fields from the data
    ...rest
  } = data;

  return {
    ...rest,
    signUp: {
      ...signUp,
      secondaryIdentifiers: signUp.secondaryIdentifiers ?? [],
    },
    signUpProfileFields: rest.signUpProfileFields,
    ...conditional(
      isCustomUiCspEnabled && {
        customUiCsp: normalizeCustomUiCspForSubmit(normalizeCustomUiCspForForm(customUiCsp)),
        crossOriginOpenerPolicy,
      }
    ),
    ...conditional(isHideLogtoBrandingAvailable && { hideLogtoBranding }),
  };
};
