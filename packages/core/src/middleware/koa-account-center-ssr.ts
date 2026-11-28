import {
  type AccountCenterSsrData,
  buildAppearanceStyleSheet,
  getAppearanceFontStylesheetUrl,
  resolveSignInExperienceAppearance,
} from '@logto/schemas';
import { conditionalArray, trySafe } from '@silverhand/essentials';
import type { MiddlewareType } from 'koa';

import { EnvSet } from '#src/env-set/index.js';
import { escapeHtmlAttributeValue } from '#src/saml-application/SamlApplication/utils.js';
import type Libraries from '#src/tenants/Libraries.js';

import { type WithI18nContext } from './koa-i18next.js';

/**
 * Placeholder for account center SSR data injection. The value should be kept in sync with
 * {@link file://./../../../account/index.html}.
 */
const accountCenterSsrPlaceholder = '"__LOGTO_ACCOUNT_CENTER_SSR__"';

/**
 * Create a middleware to prefetch sign-in experience color/theme/appearance data and inject it into
 * the account center HTML response for theme flash prevention.
 *
 * Conditions for injection:
 * - The response body should be a string after the middleware chain (calling `next()`).
 * - The SSR placeholder string should be present in the response body.
 */
export default function koaAccountCenterSsr<StateT, ContextT extends WithI18nContext>(
  libraries: Libraries
): MiddlewareType<StateT, ContextT> {
  return async (ctx, next) => {
    await next();

    if (typeof ctx.body !== 'string' || !ctx.body.includes(accountCenterSsrPlaceholder)) {
      return;
    }

    const signInExperience = await trySafe(
      libraries.signInExperiences.getAccountCenterSsrSignInExperience()
    );

    if (!signInExperience) {
      return;
    }

    const htmlWithAppearance = (() => {
      if (!ctx.body.includes('</head>')) {
        return ctx.body;
      }

      const resolvedAppearance = resolveSignInExperienceAppearance(
        signInExperience.appearance,
        signInExperience.branding,
        signInExperience.hideLogtoBranding
      );
      const faviconUrl =
        signInExperience.branding.favicon ?? (EnvSet.values.brandFaviconUrl || undefined);
      const fontStylesheetUrl = getAppearanceFontStylesheetUrl(resolvedAppearance.typography);
      const appearanceCss = buildAppearanceStyleSheet(resolvedAppearance, signInExperience.color);
      const headInjections = conditionalArray<string>(
        faviconUrl &&
          `<link rel="shortcut icon" href="${escapeHtmlAttributeValue(faviconUrl)}" data-ssr-favicon>`,
        fontStylesheetUrl &&
          `<link rel="stylesheet" href="${escapeHtmlAttributeValue(fontStylesheetUrl)}" data-appearance-font>`,
        `<style data-appearance-tokens>${appearanceCss.replaceAll(/<\/(style)/gi, '<\\/$1')}</style>`
      );

      return ctx.body.replace('</head>', () => `${headInjections.join('')}</head>`);
    })();

    ctx.body = htmlWithAppearance.replace(
      accountCenterSsrPlaceholder,
      () =>
        `Object.freeze(${JSON.stringify({
          signInExperience: { data: signInExperience },
        } satisfies AccountCenterSsrData)})`
    );
  };
}
