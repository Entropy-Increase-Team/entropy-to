import nock from 'nock';

import { ConnectorError, ConnectorErrorCodes } from '@logto/connector-kit';

import { mockConfig } from './mock.js';

const getConfig = vi.fn().mockResolvedValue(mockConfig);

const jwtVerify = vi.fn();

vi.mock('jose', () => ({
  jwtVerify,
  createRemoteJWKSet: vi.fn(),
}));

const { default: createConnector } = await import('./index.js');

describe('getAuthorizationUri', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get a valid uri by redirectUri and state', async () => {
    const connector = await createConnector({ getConfig });
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'some_state',
        redirectUri: 'http://localhost:3001/callback',
        connectorId: 'some_connector_id',
        connectorFactoryId: 'some_connector_factory_id',
        jti: 'some_jti',
        headers: {},
      },
      vi.fn()
    );

    const { origin, pathname, searchParams } = new URL(authorizationUri);
    expect(origin + pathname).toEqual(mockConfig.authorizationEndpoint);
    expect(searchParams.get('client_id')).toEqual(mockConfig.clientId);
    expect(searchParams.get('redirect_uri')).toEqual('http://localhost:3001/callback');
    expect(searchParams.get('state')).toEqual('some_state');
    expect(searchParams.get('response_type')).toEqual('code');
    expect(searchParams.get('scope')).toEqual(mockConfig.scope);
    expect(searchParams.has('nonce')).toBeTruthy();
  });

  it('should get a valid uri with custom scope', async () => {
    const connector = await createConnector({ getConfig });
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'some_state',
        redirectUri: 'http://localhost:3001/callback',
        scope: 'custom_scope',
        connectorId: 'some_connector_id',
        connectorFactoryId: 'some_connector_factory_id',
        jti: 'some_jti',
        headers: {},
      },
      vi.fn()
    );

    const { origin, pathname, searchParams } = new URL(authorizationUri);
    expect(origin + pathname).toEqual(mockConfig.authorizationEndpoint);
    expect(searchParams.get('client_id')).toEqual(mockConfig.clientId);
    expect(searchParams.get('redirect_uri')).toEqual('http://localhost:3001/callback');
    expect(searchParams.get('state')).toEqual('some_state');
    expect(searchParams.get('response_type')).toEqual('code');
    expect(searchParams.get('scope')).toEqual('custom_scope');
  });
});

describe('getUserInfo', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.clearAllMocks();
  });

  it('should get valid userInfo', async () => {
    const userId = 'userId';
    const mockJwtVerify = jwtVerify;
    mockJwtVerify.mockImplementationOnce(() => ({
      payload: { sub: userId, nonce: 'nonce' },
    }));
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin).post(tokenEndpointUrl.pathname).query(true).reply(200, {
      id_token: 'id_token',
      access_token: 'access_token',
    });
    const connector = await createConnector({ getConfig });
    const userInfo = await connector.getUserInfo(
      { code: 'code' },
      vi.fn().mockImplementationOnce(() => {
        return { nonce: 'nonce', redirectUri: 'http://localhost:3001/callback' };
      })
    );
    expect(userInfo).toMatchObject({ id: userId, rawData: { sub: userId, nonce: 'nonce' } });
  });

  it('should throw SocialIdTokenInvalid when session expects a nonce but id_token omits it', async () => {
    jwtVerify.mockImplementationOnce(() => ({
      payload: { sub: 'userId' },
    }));
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin).post(tokenEndpointUrl.pathname).query(true).reply(200, {
      id_token: 'id_token',
      access_token: 'access_token',
    });
    const connector = await createConnector({ getConfig });
    await expect(
      connector.getUserInfo(
        { code: 'code' },
        vi.fn().mockResolvedValueOnce({
          nonce: 'expected_nonce',
          redirectUri: 'http://localhost:3001/callback',
        })
      )
    ).rejects.toStrictEqual(
      new ConnectorError(ConnectorErrorCodes.SocialIdTokenInvalid, {
        message: 'ID Token validation failed due to `nonce` mismatch.',
      })
    );
  });

  it('supports PKCE S256 end-to-end and default auth method in getAccessTokenByRefreshToken', async () => {
    const pkceConnector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({ ...mockConfig, enablePkce: true }),
    });
    const setSession = vi.fn();
    const authUri = await pkceConnector.getAuthorizationUri(
      {
        state: 'oidc_pkce_state',
        redirectUri: 'http://localhost:3001/callback/oidc',
        connectorId: 'oidc_1',
        connectorFactoryId: 'oidc',
        jti: 'jti_1',
        headers: {},
      },
      setSession
    );

    const parsedUri = new URL(authUri);
    expect(parsedUri.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsedUri.searchParams.get('code_challenge')).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- mock call argument inspection in test
    const savedSession: { nonce: string; redirectUri: string; codeVerifier: string } =
      setSession.mock.calls[0]?.[0];
    expect(savedSession.codeVerifier).toBeTruthy();

    jwtVerify.mockImplementationOnce(() => ({
      payload: { sub: 'oidc_user_1', nonce: savedSession.nonce },
    }));
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(
        tokenEndpointUrl.pathname,
        (body: Record<string, string>) => body.code_verifier === savedSession.codeVerifier
      )
      .reply(200, {
        id_token: 'id_token',
        access_token: 'access_token',
      });

    const userInfo = await pkceConnector.getUserInfo(
      { code: 'oidc_code' },
      async () => savedSession
    );
    expect(userInfo.id).toBe('oidc_user_1');

    nock(tokenEndpointUrl.origin)
      .post(
        tokenEndpointUrl.pathname,
        (body: Record<string, string>) =>
          body.grant_type === 'refresh_token' && body.refresh_token === 'oidc_rt'
      )
      .reply(200, {
        id_token: 'new_id_token',
        access_token: 'new_access_token',
      });
    const refreshed = await pkceConnector.getAccessTokenByRefreshToken?.('oidc_rt');
    expect(refreshed?.access_token).toBe('new_access_token');
  });
});
