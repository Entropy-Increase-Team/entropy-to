import { adminTenantId, fullSignInExperienceGuard } from '@logto/schemas';
import { z } from 'zod';

import { EnvSet, getTenantEndpoint } from '#src/env-set/index.js';
import koaGuard from '#src/middleware/koa-guard.js';
import type TenantContext from '#src/tenants/TenantContext.js';
import { getExperienceLanguage } from '#src/utils/i18n.js';

import { getAccountCenterApiGuards } from '../account-center/guards.js';
import type { AnonymousRouter } from '../types.js';

import experienceRoutes from './well-known.experience.js';

export default function wellKnownRoutes<T extends AnonymousRouter>(
  router: T,
  { libraries, queries, id: tenantId }: TenantContext
) {
  const { accountCenter: accountCenterApiGuard } = getAccountCenterApiGuards();
  const {
    signInExperiences: { getFullSignInExperience },
    phrases: { getPhrases },
  } = libraries;
  const {
    customPhrases: { findAllCustomLanguageTags },
    signInExperiences: { findDefaultSignInExperience },
    accountCenters: { findDefaultAccountCenter },
  } = queries;

  if (tenantId === adminTenantId) {
    router.get(
      '/.well-known/endpoints/:tenantId',
      koaGuard({
        params: z.object({ tenantId: z.string().min(1) }),
        response: z.object({ user: z.string().url() }),
        status: 200,
      }),
      async (ctx, next) => {
        ctx.body = {
          user: getTenantEndpoint(ctx.guard.params.tenantId, EnvSet.values).toString(),
        };

        return next();
      }
    );
  }

  router.get(
    '/.well-known/sign-in-exp',
    koaGuard({
      query: z.object({ organizationId: z.string(), appId: z.string() }).partial(),
      response: fullSignInExperienceGuard,
      status: 200,
    }),
    async (ctx, next) => {
      const { organizationId, appId } = ctx.guard.query;
      ctx.body = await getFullSignInExperience({ locale: ctx.locale, organizationId, appId });

      return next();
    }
  );

  router.get(
    '/.well-known/phrases',
    koaGuard({
      query: z.object({
        lng: z.string().optional(),
      }),
      response: z.record(z.string().or(z.record(z.unknown()))),
      status: 200,
    }),
    async (ctx, next) => {
      const {
        query: { lng },
      } = ctx.guard;

      const { languageInfo } = await findDefaultSignInExperience();
      const customLanguages = await findAllCustomLanguageTags();
      const language = getExperienceLanguage({ ctx, languageInfo, customLanguages, lng });

      ctx.set('Content-Language', language);
      ctx.body = await getPhrases(language);

      return next();
    }
  );

  experienceRoutes(router, libraries);

  router.get(
    '/.well-known/account-center',
    koaGuard({
      response: accountCenterApiGuard,
      status: 200,
    }),
    async (ctx, next) => {
      ctx.body = await findDefaultAccountCenter();
      return next();
    }
  );

  router.get(
    '/.well-known/console-branding',
    koaGuard({
      response: z.object({
        brandName: z.string(),
        logoUrl: z.string().optional(),
        darkLogoUrl: z.string().optional(),
        faviconUrl: z.string().optional(),
        websiteUrl: z.string().optional(),
        docsUrl: z.string().optional(),
        supportEmail: z.string().optional(),
      }),
      status: 200,
    }),
    async (ctx, next) => {
      const {
        brandName,
        brandLogoUrl,
        brandDarkLogoUrl,
        brandFaviconUrl,
        brandWebsiteUrl,
        brandDocsUrl,
        brandSupportEmail,
      } = EnvSet.values;

      ctx.body = {
        brandName,
        ...(brandLogoUrl && { logoUrl: brandLogoUrl }),
        ...(brandDarkLogoUrl && { darkLogoUrl: brandDarkLogoUrl }),
        ...(brandFaviconUrl && { faviconUrl: brandFaviconUrl }),
        ...(brandWebsiteUrl && { websiteUrl: brandWebsiteUrl }),
        ...(brandDocsUrl && { docsUrl: brandDocsUrl }),
        ...(brandSupportEmail && { supportEmail: brandSupportEmail }),
      };

      return next();
    }
  );
}
