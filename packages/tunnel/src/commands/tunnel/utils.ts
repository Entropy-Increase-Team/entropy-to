import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import type http from 'node:http';
import path from 'node:path';

import { isFileAssetPath, isValidUrl, parseRange } from '@logto/core-kit';
import { conditional, trySafe } from '@silverhand/essentials';
import chalk from 'chalk';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { type OnProxyEvent } from 'http-proxy-middleware/dist/types.js';
import mime from 'mime';

import { consoleLog } from '../../utils.js';

import { type LogtoResponseHandler } from './types.js';

export const createProxy = (targetUrl: string, onProxyResponse?: OnProxyEvent['proxyRes']) => {
  const hasResponseHandler = Boolean(onProxyResponse);
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: hasResponseHandler,
    ...conditional(
      hasResponseHandler && {
        on: {
          proxyReq: (proxyRequest) => {
            // Disable potential `zstd` compression since it's not supported by http-proxy-middleware
            // https://github.com/chimurai/http-proxy-middleware/issues/1070
            proxyRequest.setHeader('Accept-Encoding', 'gzip, deflate, br');
          },
          proxyRes: onProxyResponse,
          error: (error) => {
            consoleLog.error(chalk.red(error.message));
          },
        },
      }
    ),
  });
};

const index = 'index.html';
const indexContentType = 'text/html; charset=utf-8';
const noCache = 'no-cache, no-store, must-revalidate';
const maxAgeSevenDays = 'max-age=604800';

const isPathInsideRoot = (root: string, targetPath: string) => {
  const relativePath = path.relative(root, targetPath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

/**
 * Resolve the request URL to a file path inside the static root. Returns `undefined` if the file
 * does not exist or resolves outside of the static root, either lexically (e.g. `..` segments) or
 * through symlinks.
 */
export const getSafeStaticFilePath = async (staticPath: string, requestUrl: string) => {
  const [pathname = ''] = requestUrl.split(/[#?]/);
  const decodedPathname = trySafe(() => decodeURIComponent(pathname));

  if (!decodedPathname || decodedPathname.includes('\\')) {
    return;
  }

  const staticRoot = path.resolve(staticPath);
  const requestPath = decodedPathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(staticRoot, requestPath);

  if (!isPathInsideRoot(staticRoot, resolvedPath)) {
    return;
  }

  // Resolve symlinks, so that a symlink inside the static root cannot point to a file outside of it
  const [realStaticRoot, realPath] = await Promise.all([
    trySafe(fs.realpath(staticRoot)),
    trySafe(fs.realpath(resolvedPath)),
  ]);

  if (!realStaticRoot || !realPath || !isPathInsideRoot(realStaticRoot, realPath)) {
    return;
  }

  const fileStat = await trySafe(fs.stat(realPath));
  if (!fileStat?.isFile()) {
    return;
  }

  return realPath;
};

const readFile = async (
  requestPath: string,
  start?: number,
  end?: number,
  skipBodyRead = false
) => {
  const fileHandle = await fs.open(requestPath, 'r');
  try {
    const { size } = await fileHandle.stat();
    const readStart = start ?? 0;
    // Clamp the requested range to the file size
    const readEnd = Math.min(end ?? size - 1, size - 1);

    if (start !== undefined && start > readEnd) {
      throw new Error('Range not satisfiable.');
    }

    const contentLength = readEnd - readStart + 1;
    if (skipBodyRead) {
      return { buffer: Buffer.alloc(0), contentLength, totalFileSize: size, readStart, readEnd };
    }

    const buffer = Buffer.alloc(contentLength);
    await fileHandle.read(buffer, 0, buffer.length, readStart);
    return { buffer, contentLength, totalFileSize: size, readStart, readEnd };
  } finally {
    await fileHandle.close();
  }
};

const setRangeHeaders = (
  response: http.ServerResponse,
  range: string,
  {
    readStart,
    readEnd,
    totalFileSize,
  }: { readStart: number; readEnd: number; totalFileSize: number }
) => {
  if (range) {
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Range', `bytes ${readStart}-${readEnd}/${totalFileSize}`);
  }
};

const isStaticFileProxyMethod = (method?: string) => method === 'HEAD' || method === 'GET';

const getStaticFileRequestPath = async (
  staticPath: string,
  requestUrl: string,
  fallBackToIndex: boolean
) => getSafeStaticFilePath(staticPath, fallBackToIndex ? `/${index}` : requestUrl);

const getStaticFileErrorStatusCode = (errorMessage: string, requestPath: string) =>
  errorMessage === 'Range not satisfiable.' ? 416 : existsSync(requestPath) ? 500 : 404;

export const createStaticFileProxy =
  (staticPath: string) => async (request: http.IncomingMessage, response: http.ServerResponse) => {
    if (!request.url) {
      response.writeHead(400).end();
      return;
    }

    if (!isStaticFileProxyMethod(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    const [pathname = ''] = request.url.split(/[#?]/);
    const fallBackToIndex = !isFileAssetPath(pathname);
    const requestPath = await getStaticFileRequestPath(staticPath, request.url, fallBackToIndex);
    const { range = '' } = request.headers;

    if (!requestPath) {
      response.writeHead(404).end();
      return;
    }

    try {
      const { start, end } = parseRange(range);
      const isHeadRequest = request.method === 'HEAD';
      const { buffer, contentLength, totalFileSize, readStart, readEnd } = await readFile(
        requestPath,
        start,
        end,
        isHeadRequest
      );
      response.setHeader('cache-control', fallBackToIndex ? noCache : maxAgeSevenDays);
      response.setHeader('content-type', getMimeType(request.url));
      setRangeHeaders(response, range, { readStart, readEnd, totalFileSize });

      response.setHeader('content-length', String(contentLength));
      response.writeHead(range ? 206 : 200);
      if (isHeadRequest) {
        response.end();
        return;
      }
      response.end(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleLog.error(chalk.red(errorMessage));

      response.setHeader('content-type', getMimeType(request.url));
      response.writeHead(getStaticFileErrorStatusCode(errorMessage, requestPath));
      response.end();
    }
  };

/**
 * Intercept the response from Logto endpoint and replace Logto endpoint URLs in the response with the
 * tunnel service URL. The string replace happens in the following cases:
 * - The response is a redirect response, and the `location` property in response header may contain Logto
 *   endpoint URI.
 * - The response body is JSON, which consists of properties such as `**_endpoint` and `redirectTo`. These
 *   properties may contain Logto endpoint URI.
 * - The response is HTML content that contains a form. The form action URL may contain Logto endpoint URI.
 *
 * Note: the `issuer` and `jwks_uri` properties in the `/oidc/.well-known` response should not be replaced,
 * even they also contain the Logto endpoint URI.
 */
export const createLogtoResponseHandler = async ({
  proxyResponse,
  request,
  response,
  logtoEndpointUrl,
  tunnelServiceUrl,
  verbose,
}: LogtoResponseHandler) => {
  const { location } = proxyResponse.headers;
  if (location) {
    // eslint-disable-next-line @silverhand/fp/no-mutation
    proxyResponse.headers.location = location.replace(logtoEndpointUrl.href, tunnelServiceUrl.href);
  }

  void responseInterceptor(async (responseBuffer, proxyResponse) => {
    const responseBody = responseBuffer.toString();
    if (verbose) {
      const redactedBody = responseBody.replaceAll(
        /"(access_token|refresh_token|id_token)"\s*:\s*"[^"]*"/g,
        '"$1":"[REDACTED]"'
      );
      consoleLog.info(`[${proxyResponse.statusCode}] ${chalk.cyan(redactedBody)}`);
    }

    if (proxyResponse.headers['content-type']?.includes('text/html')) {
      return responseBody.replaceAll(
        `action="${logtoEndpointUrl.href}`,
        `action="${tunnelServiceUrl.href}`
      );
    }

    if (proxyResponse.headers['content-type']?.includes('application/json')) {
      const jsonData = trySafe<unknown>(() => JSON.parse(responseBody));

      if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
        const updatedEntries: Array<[string, unknown]> = Object.entries(jsonData).map(
          ([key, value]) => {
            if ((key === 'redirectTo' || key.endsWith('_endpoint')) && typeof value === 'string') {
              return [key, value.replace(logtoEndpointUrl.href, tunnelServiceUrl.href)];
            }
            return [key, value];
          }
        );

        return JSON.stringify(Object.fromEntries(updatedEntries));
      }
    }
    return responseBody;
  })(proxyResponse, request, response);
};

export const checkExperienceInput = (url?: string, staticPath?: string) => {
  if (staticPath && url) {
    consoleLog.fatal('Only one of the experience URI or path can be provided.');
  }
  if (!staticPath && !url) {
    consoleLog.fatal(`Either a sign-in experience URI or local path must be provided.
      
Specify --help for available options`);
  }
  if (url && !isValidUrl(url)) {
    consoleLog.fatal(
      'A valid sign-in experience URI must be provided. E.g. `--experience-uri http://localhost:4000` or add `LOGTO_EXPERIENCE_URI` to your environment variables.'
    );
  }
  if (staticPath && !existsSync(path.join(staticPath, index))) {
    consoleLog.fatal('The provided path must contain a valid index.html file.');
  }
};

/**
 * Check if the request path is a Logto request path.
 * @example isLogtoRequestPath('/oidc/.well-known/openid-configuration') // true
 * @example isLogtoRequestPath('/oidc/auth') // true
 * @example isLogtoRequestPath('/api/interaction/submit') // true
 * @example isLogtoRequestPath('/consent') // true
 */
export const isLogtoRequestPath = (requestPath?: string): boolean => {
  const [pathname = ''] = (requestPath ?? '').split(/[#?]/);
  return (
    ['/oidc/', '/api/'].some((prefix) => pathname.startsWith(prefix)) || pathname === '/consent'
  );
};

export const getMimeType = (requestPath: string) => {
  const [pathname = ''] = requestPath.split(/[#?]/);
  const fallBackToIndex = !isFileAssetPath(pathname);
  if (fallBackToIndex) {
    return indexContentType;
  }
  return mime.getType(pathname) ?? 'application/octet-stream';
};
