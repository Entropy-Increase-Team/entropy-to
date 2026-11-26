import { conditional } from '@silverhand/essentials';

import { ConnectorError, ConnectorErrorCodes, parseJson } from '@logto/connector-kit';
import { requestTokenEndpoint, sanitizeCustomTokenParameters } from '@logto/connector-oauth';
import { type KyResponse } from 'ky';

import { defaultTimeout } from './constant.js';
import type { AccessTokenResponse, OidcConnectorConfig } from './types.js';
import { accessTokenResponseGuard, authResponseGuard } from './types.js';

const accessTokenResponseHandler = async (response: KyResponse): Promise<AccessTokenResponse> => {
  const result = accessTokenResponseGuard.safeParse(parseJson(await response.text()));

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }

  return result.data;
};

export const getIdToken = async (
  config: OidcConnectorConfig,
  data: unknown,
  redirectUri: string,
  codeVerifier?: string
) => {
  const result = authResponseGuard.safeParse(data);

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, data);
  }

  const { code } = result.data;

  const {
    tokenEndpoint,
    grantType,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod,
    clientSecretJwtSigningAlgorithm,
    customConfig,
  } = config;

  const tokenResponse = await requestTokenEndpoint({
    tokenEndpoint,
    tokenEndpointAuthOptions: {
      method: tokenEndpointAuthMethod,
      clientSecretJwtSigningAlgorithm,
    },
    tokenRequestBody: {
      ...sanitizeCustomTokenParameters(customConfig),
      grantType,
      code,
      redirectUri,
      clientId,
      clientSecret,
      ...conditional(codeVerifier && { codeVerifier }),
    },
    timeout: defaultTimeout,
  });

  return accessTokenResponseHandler(tokenResponse);
};

export const getAccessTokenByRefreshToken = async (
  config: OidcConnectorConfig,
  refreshToken: string
) => {
  const {
    tokenEndpoint,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod,
    clientSecretJwtSigningAlgorithm,
    customConfig,
  } = config;

  const tokenResponse = await requestTokenEndpoint({
    tokenEndpoint,
    tokenEndpointAuthOptions: {
      method: tokenEndpointAuthMethod,
      clientSecretJwtSigningAlgorithm,
    },
    tokenRequestBody: {
      ...sanitizeCustomTokenParameters(customConfig),
      grantType: 'refresh_token',
      refreshToken,
      clientId,
      clientSecret,
    },
    timeout: defaultTimeout,
  });

  return accessTokenResponseHandler(tokenResponse);
};
