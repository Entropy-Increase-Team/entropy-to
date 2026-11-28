import {
  type FullSignInExperience,
  type SsrData,
  buildAppearanceStyleSheet,
  getAppearanceFontStylesheetUrl,
  logtoCookieKey,
  logtoUiCookieGuard,
  resolveSignInExperienceAppearance,
  ssrPlaceholder,
} from '@logto/schemas';
import { conditionalArray, pick, trySafe } from '@silverhand/essentials';
import type { MiddlewareType } from 'koa';

import { EnvSet } from '#src/env-set/index.js';
import { readOptionalTheme } from '#src/oidc/utils.js';
import { escapeHtmlAttributeValue } from '#src/saml-application/SamlApplication/utils.js';
import type Libraries from '#src/tenants/Libraries.js';
import type Queries from '#src/tenants/Queries.js';
import { getExperienceLanguage } from '#src/utils/i18n.js';

import { type WithI18nContext } from './koa-i18next.js';
import { isIndexPath } from './koa-serve-static.js';

/**
 * Serialize SSR data for safe embedding inside an inline `<script>`. `JSON.stringify` alone is unsafe:
 * a string such as `</script>` in the data (e.g. inside custom CSS or custom content) would close the
 * script element early and enable injection. Escaping the HTML-significant characters keeps the values
 * identical once parsed by JS, while preventing the HTML parser from recognizing any tag delimiters.
 */
const serializeSsrData = (data: SsrData): string =>
  JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    // U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are valid inside JSON strings but are
    // line terminators in a JavaScript string literal (pre-ES2019). Since this payload is embedded as a
    // JS expression (`Object.freeze(...)`), leaving them literal can break parsing in older engines.
    // Escape to their `\uXXXX` form, which JS decodes back to the original characters.
    .replaceAll('\u2028', '\\u2028') // U+2028 LINE SEPARATOR
    .replaceAll('\u2029', '\\u2029'); // U+2029 PARAGRAPH SEPARATOR

const buildExperienceHeadTags = (signInExperience: FullSignInExperience): string[] => {
  const { customCss, appearance, branding, color, hideLogtoBranding } = signInExperience;
  const resolvedAppearance = resolveSignInExperienceAppearance(
    appearance,
    branding,
    hideLogtoBranding
  );
  const faviconUrl = branding.favicon ?? (EnvSet.values.brandFaviconUrl || undefined);
  const fontStylesheetUrl = getAppearanceFontStylesheetUrl(resolvedAppearance.typography);
  const appearanceCss = buildAppearanceStyleSheet(resolvedAppearance, color);

  return conditionalArray<string>(
    faviconUrl &&
      `<link rel="shortcut icon" href="${escapeHtmlAttributeValue(faviconUrl)}" data-ssr-favicon>`,
    fontStylesheetUrl &&
      `<link rel="stylesheet" href="${escapeHtmlAttributeValue(fontStylesheetUrl)}" data-appearance-font>`,
    `<style data-appearance-tokens>${appearanceCss.replaceAll(/<\/(style)/gi, '<\\/$1')}</style>`,
    customCss && `<style data-custom-css>${customCss.replaceAll(/<\/(style)/gi, '<\\/$1')}</style>`
  );
};

const injectExperienceHead = (
  html: string,
  signInExperience: FullSignInExperience,
  isPreview: boolean
): string => {
  if (isPreview) {
    return html;
  }

  const headInjections = buildExperienceHeadTags(signInExperience);
  const ssrTitle = signInExperience.branding.brandName ?? EnvSet.values.brandName;
  const htmlWithTitle =
    ssrTitle && html.includes('<title></title>')
      ? html.replace(
          '<title></title>',
          () => `<title>${escapeHtmlAttributeValue(ssrTitle)}</title>`
        )
      : html;

  if (headInjections.length === 0 || !htmlWithTitle.includes('</head>')) {
    return htmlWithTitle;
  }

  // Use a replacement *function* so `$`-sequences (`$$`/`$&`/`` $` ``/`$'`) in admin CSS are
  // inserted verbatim. As a string replacement, `$'` would expand to the document tail after
  // the `</head>` match and corrupt the stylesheet instead of being treated as literal CSS.
  return htmlWithTitle.replace('</head>', () => `${headInjections.join('')}</head>`);
};

/**
 * Create a middleware to prefetch the experience data and inject it into the HTML response. Some
 * conditions must be met:
 *
 * - The response body should be a string after the middleware chain (calling `next()`).
 * - The request path should be an index path.
 * - The SSR placeholder string ({@link ssrPlaceholder}) should be present in the response body.
 *
 * Otherwise, the middleware will do nothing.
 */
export default function koaExperienceSsr<StateT, ContextT extends WithI18nContext>(
  libraries: Libraries,
  queries: Queries
): MiddlewareType<StateT, ContextT> {
  return async (ctx, next) => {
    await next();

    if (
      !(typeof ctx.body === 'string' && isIndexPath(ctx.path)) ||
      !ctx.body.includes(ssrPlaceholder)
    ) {
      return;
    }

    const logtoUiCookie =
      trySafe(() =>
        logtoUiCookieGuard.parse(JSON.parse(ctx.cookies.get(logtoCookieKey) ?? '{}'))
      ) ?? {};

    const [signInExperience, customLanguages] = await Promise.all([
      libraries.signInExperiences.getFullSignInExperience({
        locale: ctx.locale,
        ...logtoUiCookie,
      }),
      queries.customPhrases.findAllCustomLanguageTags(),
    ]);
    const language = getExperienceLanguage({
      ctx,
      languageInfo: signInExperience.languageInfo,
      customLanguages,
      lng: typeof ctx.query.lng === 'string' ? ctx.query.lng : undefined,
    });
    const phrases = await libraries.phrases.getPhrases(language);

    ctx.set('Content-Language', language);

    // Koa parses repeated query keys into an array, so `?preview=true&preview=x` yields `['true', 'x']`.
    // Normalize before comparing so saved CSS/tokens are never inlined during preview loads.
    const isPreview = [ctx.query.preview].flat().includes('true');
    const htmlWithHead = injectExperienceHead(ctx.body, signInExperience, isPreview);

    // Use a replacement *function* so any `$`-sequence in the serialized data is inserted verbatim. As a
    // string replacement, `$'` would expand to the document text after the placeholder and re-inject an
    // unescaped `</script>` — defeating the HTML-delimiter escaping in `serializeSsrData`.
    ctx.body = htmlWithHead.replace(
      ssrPlaceholder,
      () =>
        `Object.freeze(${serializeSsrData({
          signInExperience: {
            ...pick(logtoUiCookie, 'appId', 'organizationId'),
            theme: readOptionalTheme(logtoUiCookie.theme),
            data: signInExperience,
          },
          phrases: { lng: language, data: phrases },
        })})`
    );
  };
}
