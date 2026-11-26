import path from 'node:path';

import { isFileAssetPath, parseRange } from '@logto/core-kit';
import { tryThat } from '@silverhand/essentials';
import type { MiddlewareType } from 'koa';

import SystemContext from '#src/tenants/SystemContext.js';
import assertThat from '#src/utils/assert-that.js';
import { isTransientAzureStorageError } from '#src/utils/storage/azure-storage.js';
import { buildStorage } from '#src/utils/storage/index.js';
import { getTenantId } from '#src/utils/tenant.js';

import RequestError from '../errors/RequestError/index.js';

const noCache = 'no-cache, no-store, must-revalidate';
const maxAgeSevenDays = 'max-age=604800';

const buildStorageDownloadError = (error: unknown) =>
  new RequestError(
    { code: 'storage.download_error', status: 502 },
    { details: error instanceof Error ? error.message : String(error) }
  );

const resolveAssetObjectKey = (contextPath: string, requestPath: string) => {
  const decodedPath = tryThat(
    () => decodeURIComponent(requestPath),
    new RequestError({ code: 'entity.not_found', status: 404 })
  );
  assertThat(
    !decodedPath.includes('\0') &&
      !decodedPath.includes('\\') &&
      !decodedPath.split('/').some((segment) => segment === '.' || segment === '..'),
    new RequestError({ code: 'entity.not_found', status: 404 })
  );

  const normalizedPath = path.posix.normalize(decodedPath);
  const isFileAssetRequest =
    !normalizedPath.startsWith('/direct/') && isFileAssetPath(normalizedPath);
  const fileObjectKey = `${contextPath}${isFileAssetRequest ? normalizedPath : '/index.html'}`;
  assertThat(
    fileObjectKey.startsWith(`${contextPath}/`),
    new RequestError({ code: 'entity.not_found', status: 404 })
  );

  return { fileObjectKey, isFileAssetRequest };
};

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

const destroyStreamIfNeeded = (stream: unknown) => {
  if (
    stream &&
    typeof stream === 'object' &&
    'destroy' in stream &&
    typeof stream.destroy === 'function'
  ) {
    stream.destroy();
  }
};

const applyRangeHeadersIfNeeded = (
  ctx: Parameters<MiddlewareType>[0],
  rangeProperties: { contentLength?: number } | undefined,
  { start, end }: { start?: number; end?: number },
  readableStreamBody: unknown
) => {
  if (!rangeProperties) {
    return;
  }

  const { contentLength: totalFileSize = 0 } = rangeProperties;
  if (totalFileSize === 0 || (start !== undefined && start >= totalFileSize)) {
    destroyStreamIfNeeded(readableStreamBody);
    throw new RequestError({ code: 'request.range_not_satisfiable', status: 416 });
  }

  const clampedEnd = Math.min(end ?? totalFileSize - 1, totalFileSize - 1);
  ctx.set('Accept-Ranges', 'bytes');
  ctx.set('Content-Range', `bytes ${start ?? 0}-${clampedEnd}/${totalFileSize}`);
};

/**
 * Middleware that serves custom UI assets user uploaded previously through sign-in experience settings.
 * If the request path contains a dot, consider it as a file and will try to serve the file directly.
 * Otherwise, redirect the request to the `index.html` page.
 */
export default function koaServeCustomUiAssets(customUiAssetId: string) {
  const { experienceBlobsProviderConfig } = SystemContext.shared;
  assertThat(experienceBlobsProviderConfig, 'storage.not_configured');

  const serve: MiddlewareType = async (ctx, next) => {
    const [tenantId] = await getTenantId(ctx.URL);
    assertThat(tenantId, 'session.not_found', 404);

    const { downloadFile, isFileExisted, getFileProperties } = buildStorage(
      experienceBlobsProviderConfig
    );

    const { fileObjectKey, isFileAssetRequest } = resolveAssetObjectKey(
      `${tenantId}/${customUiAssetId}`,
      ctx.request.path
    );
    try {
      const isExisted = await isFileExisted(fileObjectKey, { throwOnTransientError: true });
      assertThat(isExisted, 'entity.not_found', 404);

      const range = ctx.get('range');
      const { start, end, count } = tryThat(
        () => parseRange(range),
        new RequestError({ code: 'request.range_not_satisfiable', status: 416 })
      );

      const [downloadSettlement, propertiesSettlement] = await Promise.allSettled([
        downloadFile(fileObjectKey, start, count),
        range ? getFileProperties(fileObjectKey) : undefined,
      ]);

      if (downloadSettlement.status === 'rejected') {
        throw toError(downloadSettlement.reason);
      }

      const { contentLength = 0, readableStreamBody, contentType } = downloadSettlement.value;

      if (propertiesSettlement.status === 'rejected') {
        destroyStreamIfNeeded(readableStreamBody);
        throw toError(propertiesSettlement.reason);
      }

      applyRangeHeadersIfNeeded(
        ctx,
        propertiesSettlement.value,
        { start, end },
        readableStreamBody
      );

      ctx.body = readableStreamBody;
      ctx.type = contentType ?? 'application/octet-stream';
      ctx.status = range ? 206 : 200;

      ctx.set('Cache-Control', isFileAssetRequest ? maxAgeSevenDays : noCache);
      ctx.set('Content-Length', contentLength.toString());
    } catch (error: unknown) {
      if (isTransientAzureStorageError(error)) {
        throw buildStorageDownloadError(error);
      }

      throw error;
    }

    return next();
  };

  return serve;
}
