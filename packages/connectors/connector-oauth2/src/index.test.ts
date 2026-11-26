import nock from 'nock';

import { mockConfig } from './mock.js';

const getConfig = vi.fn().mockResolvedValue(mockConfig);

const { default: createConnector } = await import('./index.js');

describe('getAuthorizationUri', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get a valid uri by redirectUri and state', async () => {
    const connector = await createConnector({ getConfig });
    const setSession = vi.fn();
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'some_state',
        redirectUri: 'http://localhost:3001/callback',
        connectorId: 'some_connector_id',
        connectorFactoryId: 'some_connector_factory_id',
        jti: 'some_jti',
        headers: {},
      },
      setSession
    );

    const { origin, pathname, searchParams } = new URL(authorizationUri);
    expect(origin + pathname).toEqual(mockConfig.authorizationEndpoint);
    expect(searchParams.get('client_id')).toEqual(mockConfig.clientId);
    expect(searchParams.get('redirect_uri')).toEqual('http://localhost:3001/callback');
    expect(searchParams.get('state')).toEqual('some_state');
    expect(searchParams.get('response_type')).toEqual('code');
  });

  it('should get a valid uri with custom scope', async () => {
    const connector = await createConnector({ getConfig });
    const setSession = vi.fn();
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
      setSession
    );

    const { origin, pathname, searchParams } = new URL(authorizationUri);
    expect(origin + pathname).toEqual(mockConfig.authorizationEndpoint);
    expect(searchParams.get('client_id')).toEqual(mockConfig.clientId);
    expect(searchParams.get('redirect_uri')).toEqual('http://localhost:3001/callback');
    expect(searchParams.get('state')).toEqual('some_state');
    expect(searchParams.get('response_type')).toEqual('code');
    expect(searchParams.get('scope')).toEqual('custom_scope');
    expect(searchParams.get('code_challenge')).toBeNull();
  });

  it('should generate PKCE S256 challenge and persist codeVerifier when enablePkce is true', async () => {
    const connector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({ ...mockConfig, enablePkce: true }),
    });
    const setSession = vi.fn();
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'pkce_state',
        redirectUri: 'http://localhost:3001/callback/shushuoauth2',
        connectorId: 'shushuoauth2',
        connectorFactoryId: 'oauth2',
        jti: 'some_jti',
        headers: {},
      },
      setSession
    );

    const { searchParams } = new URL(authorizationUri);
    expect(searchParams.get('code_challenge_method')).toEqual('S256');
    const codeChallenge = searchParams.get('code_challenge');
    expect(codeChallenge).toBeTruthy();

    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'http://localhost:3001/callback/shushuoauth2',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any(String) is typed as any
        codeVerifier: expect.any(String),
      })
    );
  });
});

describe('getUserInfo with PKCE', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.clearAllMocks();
  });

  it('sends code_verifier to tokenEndpoint when enablePkce is true and rejects missing session codeVerifier', async () => {
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(
        tokenEndpointUrl.pathname,
        (body: Record<string, string>) => body.code_verifier === 'verifier_123'
      )
      .reply(200, {
        access_token: 'pkce_access_token',
        token_type: 'Bearer',
      });
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin).get(userInfoEndpointUrl.pathname).reply(200, {
      sub: 'shushu_user_1',
      email: 'user@shushu.fan',
    });

    const connector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({ ...mockConfig, enablePkce: true }),
    });

    await expect(
      connector.getUserInfo({ code: 'auth_code' }, async () => ({
        redirectUri: 'http://localhost:3001/callback/shushuoauth2',
      }))
    ).rejects.toThrow();

    const userInfo = await connector.getUserInfo({ code: 'auth_code' }, async () => ({
      redirectUri: 'http://localhost:3001/callback/shushuoauth2',
      codeVerifier: 'verifier_123',
    }));

    expect(userInfo).toStrictEqual({
      id: 'shushu_user_1',
      email: 'user@shushu.fan',
      rawData: { sub: 'shushu_user_1', email: 'user@shushu.fan' },
    });
  });

  it('rejects non-http(s) endpoints and supports getAccessTokenByRefreshToken with default auth method', async () => {
    const invalidConnector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({
        ...mockConfig,
        // eslint-disable-next-line no-script-url -- testing rejection of unsafe javascript: endpoint scheme
        authorizationEndpoint: 'javascript:alert(1)',
      }),
    });

    await expect(
      invalidConnector.getAuthorizationUri(
        {
          state: 's',
          redirectUri: 'http://localhost:3001/callback',
          connectorId: 'c',
          connectorFactoryId: 'oauth2',
          jti: 'j',
          headers: {},
        },
        vi.fn()
      )
    ).rejects.toThrow();

    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(
        tokenEndpointUrl.pathname,
        (body: Record<string, string>) =>
          body.grant_type === 'refresh_token' &&
          body.refresh_token === 'rt_123' &&
          body.client_secret === mockConfig.clientSecret
      )
      .reply(200, {
        access_token: 'refreshed_access_token',
        token_type: '',
      });

    const connector = await createConnector({ getConfig });
    const refreshed = await connector.getAccessTokenByRefreshToken?.('rt_123');
    expect(refreshed?.access_token).toBe('refreshed_access_token');
  });
});

describe('getUserInfo', () => {
  afterEach(() => {
    nock.cleanAll();
    vi.clearAllMocks();
  });

  it('should get valid userInfo', async () => {
    const userId = 'userId';
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(tokenEndpointUrl.pathname)
      .query(true)
      .reply(
        200,
        JSON.stringify({
          access_token: 'access_token',
          token_type: 'bearer',
        })
      );
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin).get(userInfoEndpointUrl.pathname).query(true).reply(200, {
      sub: userId,
      foo: 'bar',
    });
    const connector = await createConnector({ getConfig });
    const userInfo = await connector.getUserInfo(
      { code: 'code' },
      vi.fn().mockImplementationOnce(() => {
        return { redirectUri: 'http://localhost:3001/callback' };
      })
    );
    expect(userInfo).toStrictEqual({ id: userId, rawData: { sub: userId, foo: 'bar' } });
  });

  it('should sync the mapped email by default', async () => {
    const userId = 'userId';
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(tokenEndpointUrl.pathname)
      .query(true)
      .reply(200, JSON.stringify({ access_token: 'access_token', token_type: 'bearer' }));
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin)
      .get(userInfoEndpointUrl.pathname)
      .query(true)
      .reply(200, { sub: userId, email: 'foo@example.com' });

    const connector = await createConnector({ getConfig });
    const userInfo = await connector.getUserInfo({ code: 'code' }, async () => ({
      redirectUri: 'http://localhost:3001/callback',
    }));

    expect(userInfo).toStrictEqual({
      id: userId,
      email: 'foo@example.com',
      rawData: { sub: userId, email: 'foo@example.com' },
    });
  });

  it('should not return the email when email sync is disabled', async () => {
    const userId = 'userId';
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(tokenEndpointUrl.pathname)
      .query(true)
      .reply(200, JSON.stringify({ access_token: 'access_token', token_type: 'bearer' }));
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin)
      .get(userInfoEndpointUrl.pathname)
      .query(true)
      .reply(200, { sub: userId, email: 'foo@example.com' });

    const connector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({ ...mockConfig, disableEmailSync: true }),
    });
    const userInfo = await connector.getUserInfo({ code: 'code' }, async () => ({
      redirectUri: 'http://localhost:3001/callback',
    }));

    expect(userInfo.email).toBeUndefined();
    // The address stays in `rawData` so an admin can still see what the provider returned.
    expect(userInfo.rawData).toStrictEqual({ sub: userId, email: 'foo@example.com' });
  });

  it('should accept a token response with an array `scope`', async () => {
    const userId = 'userId';
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin)
      .post(tokenEndpointUrl.pathname)
      .query(true)
      .reply(200, {
        access_token: 'access_token',
        token_type: 'bearer',
        scope: ['chat:read', 'chat:edit'],
      });
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin).get(userInfoEndpointUrl.pathname).query(true).reply(200, {
      sub: userId,
    });
    const connector = await createConnector({ getConfig });
    const userInfo = await connector.getUserInfo(
      { code: 'code' },
      vi.fn().mockImplementationOnce(() => {
        return { redirectUri: 'http://localhost:3001/callback' };
      })
    );
    expect(userInfo).toStrictEqual({ id: userId, rawData: { sub: userId } });
  });

  it('should accept a token response with a string `expires_in`', async () => {
    const userId = 'userId';
    const tokenEndpointUrl = new URL(mockConfig.tokenEndpoint);
    nock(tokenEndpointUrl.origin).post(tokenEndpointUrl.pathname).query(true).reply(200, {
      access_token: 'access_token',
      token_type: 'bearer',
      expires_in: '3600',
    });
    const userInfoEndpointUrl = new URL(mockConfig.userInfoEndpoint);
    nock(userInfoEndpointUrl.origin).get(userInfoEndpointUrl.pathname).query(true).reply(200, {
      sub: userId,
    });
    const connector = await createConnector({ getConfig });
    const userInfo = await connector.getUserInfo(
      { code: 'code' },
      vi.fn().mockImplementationOnce(() => {
        return { redirectUri: 'http://localhost:3001/callback' };
      })
    );
    expect(userInfo).toStrictEqual({ id: userId, rawData: { sub: userId } });
  });
});
