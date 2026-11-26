import { removeUndefinedKeys } from '@silverhand/essentials';
import crypto from 'node:crypto';
import snakecaseKeys from 'snakecase-keys';

import { ConnectorError, ConnectorErrorCodes } from '@logto/connector-kit';
import { generateStandardId } from '@logto/shared/universal';
import { SignJWT } from 'jose';
import ky, { HTTPError } from 'ky';

import { TokenEndpointAuthMethod } from './types.js';

export const generateCodeVerifier = () => crypto.randomBytes(32).toString('base64url');

export const generateCodeChallenge = (verifier: string) =>
  crypto.createHash('sha256').update(verifier).digest('base64url');

const reservedAuthParameterKeys = new Set([
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'nonce',
  'code_challenge',
  'code_challenge_method',
  'scope',
]);

const reservedTokenParameterKeys = new Set([
  'grant_type',
  'code',
  'redirect_uri',
  'refresh_token',
  'client_id',
  'client_secret',
  'client_assertion',
  'client_assertion_type',
  'code_verifier',
]);

const clientCredentialSnakeKeys = new Set([
  'client_id',
  'client_secret',
  'client_assertion',
  'client_assertion_type',
]);

const sanitizeCustomParameters = (
  customConfig: Record<string, string> | undefined,
  reservedKeys: ReadonlySet<string>
): Record<string, string> => {
  if (!customConfig) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(snakecaseKeys(customConfig)).filter(([key]) => !reservedKeys.has(key))
  );
};

export const sanitizeCustomAuthParameters = (customConfig?: Record<string, string>) =>
  sanitizeCustomParameters(customConfig, reservedAuthParameterKeys);

export const sanitizeCustomTokenParameters = (customConfig?: Record<string, string>) =>
  sanitizeCustomParameters(customConfig, reservedTokenParameterKeys);

const parseHttpUrl = (endpoint: string): URL => {
  try {
    const parsedUrl = new URL(endpoint);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new ConnectorError(ConnectorErrorCodes.InvalidConfig, {
        message: `Endpoint must use http or https protocol: ${endpoint}`,
      });
    }

    return parsedUrl;
  } catch (error: unknown) {
    if (error instanceof ConnectorError) {
      throw error;
    }

    throw new ConnectorError(ConnectorErrorCodes.InvalidConfig, {
      message: `Invalid endpoint URL: ${endpoint}`,
    });
  }
};

type TokenEndpointAuthOptions<T extends TokenEndpointAuthMethod = TokenEndpointAuthMethod> =
  T extends TokenEndpointAuthMethod.ClientSecretJwt
    ? {
        method: TokenEndpointAuthMethod.ClientSecretJwt;
        clientSecretJwtSigningAlgorithm: string;
      }
    : {
        method:
          | TokenEndpointAuthMethod.ClientSecretBasic
          | TokenEndpointAuthMethod.ClientSecretPost;
      };

export type RequestTokenEndpointOptions = {
  tokenEndpoint: string;
  tokenEndpointAuthOptions: TokenEndpointAuthOptions;
  tokenRequestBody:
    | ({
        grantType: string;
        code: string;
        redirectUri: string;
        clientId: string;
        clientSecret: string;
      } & Record<string, string>)
    | ({
        grantType: string;
        refreshToken: string;
        clientId: string;
        clientSecret: string;
      } & Record<string, string>);
  timeout?: number;
};

/**
 * Requests the token endpoint for an access token with given client authentication options.
 *
 * @param tokenEndpoint - The URL of the token endpoint.
 * @param clientCredentials - The client credentials (client ID and client secret).
 * @param tokenEndpointAuthOptions - The options for authenticating with the token endpoint.
 * @param tokenEndpointAuthOptions.method - The method to use for authenticating with the token endpoint.
 * @param tokenEndpointAuthOptions.clientSecretJwtSigningAlgorithm - The signing algorithm to use for the client secret JWT. Required if the `method` is `TokenEndpointAuthMethod.ClientSecretJwt`.
 * @param tokenRequestBody - The request body to be sent as application/x-www-form-urlencoded to the token endpoint. Parameters are automatically converted to snake_case and undefined values are removed.
 * @param timeout - The timeout for the request in milliseconds.
 * @returns A Promise that resolves to the response from the token endpoint.
 */
export const requestTokenEndpoint = async ({
  tokenEndpoint,
  tokenEndpointAuthOptions,
  tokenRequestBody,
  timeout,
}: RequestTokenEndpointOptions) => {
  const validatedTokenEndpoint = parseHttpUrl(tokenEndpoint).toString();

  const postTokenEndpoint = async ({
    form,
    headers,
  }: {
    form: Record<string, string>;
    headers?: Record<string, string>;
  }) => {
    try {
      return await ky.post(validatedTokenEndpoint, {
        headers,
        body: new URLSearchParams(removeUndefinedKeys(snakecaseKeys(form))),
        timeout,
      });
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        throw new ConnectorError(ConnectorErrorCodes.General, await error.response.text());
      }

      throw error;
    }
  };

  const { clientId, clientSecret, ...rawBodyWithoutCredentials } = tokenRequestBody;
  const requestBodyWithoutClientCredentials = Object.fromEntries(
    Object.entries(snakecaseKeys(rawBodyWithoutCredentials)).filter(
      ([key]) => !clientCredentialSnakeKeys.has(key)
    )
  );

  switch (tokenEndpointAuthOptions.method) {
    case TokenEndpointAuthMethod.ClientSecretJwt: {
      const clientSecretJwt = await new SignJWT({
        iss: clientId,
        sub: clientId,
        aud: validatedTokenEndpoint,
        jti: generateStandardId(),
        exp: Math.floor(Date.now() / 1000) + 600, // Expiration time is 10 minutes
        iat: Math.floor(Date.now() / 1000),
      })
        .setProtectedHeader({
          alg: tokenEndpointAuthOptions.clientSecretJwtSigningAlgorithm,
        })
        .sign(Buffer.from(clientSecret))
        .catch((error: unknown) => {
          if (error instanceof Error) {
            throw new ConnectorError(
              ConnectorErrorCodes.General,
              'Failed to sign client secret JWT'
            );
          }
          throw error;
        });

      return postTokenEndpoint({
        form: {
          ...requestBodyWithoutClientCredentials,
          clientId,
          clientAssertion: clientSecretJwt,
          /**
           * `client_assertion_type` parameter MUST be "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
           *  see https://datatracker.ietf.org/doc/html/rfc7523#section-2.2
           */
          clientAssertionType: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        },
      });
    }
    case TokenEndpointAuthMethod.ClientSecretBasic: {
      return postTokenEndpoint({
        form: requestBodyWithoutClientCredentials,
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      });
    }
    case TokenEndpointAuthMethod.ClientSecretPost: {
      return postTokenEndpoint({
        form: tokenRequestBody,
      });
    }
  }
};

/**
 * Constructs a complete URL for initiating OAuth authorization by appending properly formatted
 * query parameters to the provided authorization endpoint URL.
 *
 * @param authorizationEndpoint The base URL to which the OAuth authorization request is sent.
 * @param queryParameters An object containing OAuth specific parameters such as responseType, clientId, scope, redirectUri, and state. Additional custom parameters can also be included as needed. Parameters are automatically converted to snake_case and undefined values are removed.
 * @returns A string representing the fully constructed URL to be used for OAuth authorization.
 */
export const constructAuthorizationUri = (
  authorizationEndpoint: string,
  queryParameters: {
    responseType: string;
    clientId: string;
    scope?: string;
    redirectUri: string;
    state: string;
  } & Record<string, string | undefined>
) => {
  const url = parseHttpUrl(authorizationEndpoint);
  for (const [key, value] of Object.entries(removeUndefinedKeys(snakecaseKeys(queryParameters)))) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};
