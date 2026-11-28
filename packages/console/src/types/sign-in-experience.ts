import { type SignInExperience } from '@logto/schemas';

// This is required to ensure the image URLs will be reset when removing an image. RHF will ignore
// `undefined` values, so we provide empty strings to trigger the reset.
export const emptyBranding: Pick<
  Required<SignInExperience['branding']>,
  'logoUrl' | 'darkLogoUrl' | 'favicon' | 'darkFavicon'
> = Object.freeze({
  logoUrl: '',
  darkLogoUrl: '',
  favicon: '',
  darkFavicon: '',
});
