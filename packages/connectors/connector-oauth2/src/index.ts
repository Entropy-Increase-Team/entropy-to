import { assert, conditional, pick } from '@silverhand/essentials';

import {
  type GetAuthorizationUri,
  type GetUserInfo,
  type SocialConnector,
  type CreateConnector,
  type GetConnectorConfig,
  parseJsonObject,
  ConnectorError,
  ConnectorErrorCodes,
  validateConfig,
  ConnectorType,
  type GetTokenResponseAndUserInfo,
  type GetAccessTokenByRefreshToken,
} from '@logto/connector-kit';
import ky, { HTTPError } from 'ky';

import { defaultMetadata, defaultTimeout } from './constant.js';
import {
  constructAuthorizationUri,
  generateCodeChallenge,
  generateCodeVerifier,
  sanitizeCustomAuthParameters,
} from './oauth2/utils.js';
import { type Oauth2ConnectorConfig, oauth2ConnectorConfigGuard } from './types.js';
import {
  userProfileMapping,
  getAccessToken,
  getAccessTokenByRefreshToken as _getAccessTokenByRefreshToken,
} from './utils.js';

export * from './oauth2/index.js';

const getAuthorizationUri =
  (getConfig: GetConnectorConfig): GetAuthorizationUri =>
  async ({ state, redirectUri, scope }, setSession) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, oauth2ConnectorConfigGuard);
    const parsedConfig = oauth2ConnectorConfigGuard.parse(config);

    assert(
      setSession,
      new ConnectorError(ConnectorErrorCodes.NotImplemented, {
        message: 'Function `setSession()` is not implemented.',
      })
    );

    const codeVerifier = parsedConfig.enablePkce ? generateCodeVerifier() : undefined;
    const codeChallenge = codeVerifier ? generateCodeChallenge(codeVerifier) : undefined;

    await setSession({
      redirectUri,
      ...conditional(codeVerifier && { codeVerifier }),
    });

    const { authorizationEndpoint, customConfig } = parsedConfig;

    return constructAuthorizationUri(authorizationEndpoint, {
      ...sanitizeCustomAuthParameters(customConfig),
      ...pick(parsedConfig, 'responseType', 'clientId', 'scope'),
      // If scope is provided, it will override the scope in the config.
      ...conditional(scope && { scope }),
      redirectUri,
      state,
      ...conditional(
        codeChallenge && {
          codeChallenge,
          codeChallengeMethod: 'S256',
        }
      ),
    });
  };

const _getUserInfo = async (
  config: Oauth2ConnectorConfig,
  token_type: string,
  access_token: string
) => {
  const normalizedTokenType = token_type.trim();
  const authorizationScheme =
    !normalizedTokenType || normalizedTokenType.toLowerCase() === 'bearer'
      ? 'Bearer'
      : normalizedTokenType;
  assert(
    !/[\n\r]/.test(authorizationScheme) && !/[\n\r]/.test(access_token),
    new ConnectorError(ConnectorErrorCodes.InvalidResponse, {
      message: 'Invalid control characters in token response.',
    })
  );

  try {
    const httpResponse = await ky.get(config.userInfoEndpoint, {
      headers: {
        authorization: `${authorizationScheme} ${access_token}`,
      },
      timeout: defaultTimeout,
    });

    const rawData = parseJsonObject(await httpResponse.text());
    const { email, ...userProfile } = userProfileMapping(rawData, config.profileMap);

    return {
      ...userProfile,
      // Spread rather than assign: `userProfileMapping` omits the key when the provider returned
      // nothing, and an explicit `email: undefined` would overwrite that absence for consumers
      // that merge this profile.
      ...conditional(!config.disableEmailSync && email && { email }),
      rawData,
    };
  } catch (error: unknown) {
    if (error instanceof HTTPError) {
      throw new ConnectorError(ConnectorErrorCodes.General, await error.response.text());
    }

    throw error;
  }
};

const resolveConnectorSession = async (
  getSession:
    | (() => Promise<{ redirectUri?: string; codeVerifier?: unknown } | undefined>)
    | undefined,
  enablePkce: boolean
) => {
  assert(
    getSession,
    new ConnectorError(ConnectorErrorCodes.NotImplemented, {
      message: 'Function `getSession()` is not implemented.',
    })
  );

  const { redirectUri, codeVerifier } = (await getSession()) ?? {};
  assert(
    redirectUri,
    new ConnectorError(ConnectorErrorCodes.General, {
      message: 'Cannot find `redirectUri` from connector session.',
    })
  );

  if (!enablePkce) {
    return { redirectUri };
  }

  assert(
    typeof codeVerifier === 'string' && codeVerifier.length > 0,
    new ConnectorError(ConnectorErrorCodes.General, {
      message: 'Cannot find `codeVerifier` from connector session.',
    })
  );

  return { redirectUri, codeVerifier };
};

const getUserInfo =
  (getConfig: GetConnectorConfig): GetUserInfo =>
  async (data, getSession) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, oauth2ConnectorConfigGuard);
    const parsedConfig = oauth2ConnectorConfigGuard.parse(config);

    const { redirectUri, codeVerifier } = await resolveConnectorSession(
      getSession,
      parsedConfig.enablePkce
    );

    const { access_token, token_type } = await getAccessToken(
      parsedConfig,
      data,
      redirectUri,
      codeVerifier
    );
    return _getUserInfo(parsedConfig, token_type, access_token);
  };

const getTokenResponseAndUserInfo =
  (getConfig: GetConnectorConfig): GetTokenResponseAndUserInfo =>
  async (data, getSession) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, oauth2ConnectorConfigGuard);
    const parsedConfig = oauth2ConnectorConfigGuard.parse(config);

    const { redirectUri, codeVerifier } = await resolveConnectorSession(
      getSession,
      parsedConfig.enablePkce
    );

    const tokenResponse = await getAccessToken(parsedConfig, data, redirectUri, codeVerifier);

    const userInfo = await _getUserInfo(
      parsedConfig,
      tokenResponse.token_type,
      tokenResponse.access_token
    );

    return {
      tokenResponse,
      userInfo,
    };
  };

const getAccessTokenByRefreshToken =
  (getConfig: GetConnectorConfig): GetAccessTokenByRefreshToken =>
  async (refreshToken: string) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, oauth2ConnectorConfigGuard);
    const parsedConfig = oauth2ConnectorConfigGuard.parse(config);
    return _getAccessTokenByRefreshToken(parsedConfig, refreshToken);
  };

const createOauthConnector: CreateConnector<SocialConnector> = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: oauth2ConnectorConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig),
    getTokenResponseAndUserInfo: getTokenResponseAndUserInfo(getConfig),
    getAccessTokenByRefreshToken: getAccessTokenByRefreshToken(getConfig),
  };
};

export default createOauthConnector;
