import {
  buildAppearanceCssVariables,
  getAppearanceFontStylesheetUrl,
  resolveSignInExperienceAppearance,
  type Branding,
  type Color,
  type SignInExperienceAppearance,
  type Theme,
} from '@logto/schemas';

const appearanceFontLinkSelector = 'link[data-appearance-font="true"]';

type ApplyAppearanceOptions = {
  color?: Partial<Color>;
  branding?: Branding;
  appearance?: SignInExperienceAppearance;
  hideLogtoBranding?: boolean;
  theme: Theme;
};

/**
 * Synchronizes resolved sign-in experience appearance tokens, document data attributes, and
 * optional font stylesheet `<link>` tags into the DOM. Shared between `@logto/experience` and
 * `@logto/account` so both surfaces stay visually consistent.
 */
export const applyAppearanceToDocument = ({
  color,
  branding,
  appearance,
  hideLogtoBranding,
  theme,
}: ApplyAppearanceOptions) => {
  if (typeof document === 'undefined') {
    return;
  }

  const resolved = resolveSignInExperienceAppearance(appearance, branding, hideLogtoBranding);
  const cssVariables = buildAppearanceCssVariables(resolved, color, theme);

  for (const [key, value] of Object.entries(cssVariables)) {
    document.body.style.setProperty(key, value);
  }

  // eslint-disable-next-line @silverhand/fp/no-mutation -- updating root data attributes for CSS selectors
  document.documentElement.dataset.preset = resolved.preset;
  // eslint-disable-next-line @silverhand/fp/no-mutation -- updating root data attributes for CSS selectors
  document.documentElement.dataset.layout = resolved.layout;
  // eslint-disable-next-line @silverhand/fp/no-mutation -- updating root data attributes for CSS selectors
  document.documentElement.dataset.motion = resolved.motion.reduced ? 'reduced' : 'default';
  // eslint-disable-next-line @silverhand/fp/no-mutation -- updating root data attributes for CSS selectors
  document.documentElement.dataset.errorShake = resolved.motion.errorShake ? 'true' : 'false';

  const fontUrl = getAppearanceFontStylesheetUrl(resolved.typography);
  const existingLink = document.head.querySelector<HTMLLinkElement>(appearanceFontLinkSelector);

  if (!fontUrl) {
    existingLink?.remove();
    return;
  }

  if (existingLink) {
    if (existingLink.href !== fontUrl) {
      // eslint-disable-next-line @silverhand/fp/no-mutation -- updating stylesheet href when font preset changes
      existingLink.href = fontUrl;
    }
    return;
  }

  const linkElement = document.createElement('link');
  // eslint-disable-next-line @silverhand/fp/no-mutation -- initializing dynamically created link element
  linkElement.rel = 'stylesheet';
  // eslint-disable-next-line @silverhand/fp/no-mutation -- initializing dynamically created link element
  linkElement.href = fontUrl;
  Reflect.set(linkElement.dataset, 'appearanceFont', 'true');
  document.head.append(linkElement);
};
