import nock from 'nock';

import { vi, describe, beforeAll, it, expect } from 'vitest';

import { graphAPIEndpoint } from './constant.js';
import createConnector from './index.js';

const receivedAuthConfigs: Array<{ authority?: string }> = [];

vi.mock('@azure/msal-node', async () => ({
  ConfidentialClientApplication: class {
    constructor(config: { auth: { authority?: string } }) {
      // eslint-disable-next-line @silverhand/fp/no-mutating-methods -- test spy capture
      receivedAuthConfigs.push(config.auth);
    }

    async getAuthCodeUrl() {
      return 'https://login.microsoftonline.com/tenantId/oauth2/v2.0/authorize';
    }

    async acquireTokenByCode() {
      return {
        accessToken: 'accessToken',
        scopes: ['scopes'],
        tokenType: 'tokenType',
      };
    }
  },
}));

const mockedConfig = {
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  cloudInstance: 'https://login.microsoftonline.com',
  tenantId: 'tenantId',
};

const getConnectorConfig = vi.fn().mockResolvedValue(mockedConfig);

describe('Azure AD connector', () => {
  it('init without exploding', () => {
    expect(async () => createConnector({ getConfig: getConnectorConfig })).not.toThrow();
  });

  it('constructs a valid HTTPS authority URL for getAuthorizationUri across platforms', async () => {
    const connector = await createConnector({ getConfig: getConnectorConfig });
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'state',
        redirectUri: 'https://example.com/callback',
        connectorId: 'azuread',
        connectorFactoryId: 'azuread',
        jti: 'jti',
        headers: {},
      },
      vi.fn()
    );

    expect(authorizationUri).toBe(
      'https://login.microsoftonline.com/tenantId/oauth2/v2.0/authorize'
    );
    expect(receivedAuthConfigs.at(-1)?.authority).toBe(
      'https://login.microsoftonline.com/tenantId'
    );
  });
});

describe('getUserInfo', () => {
  beforeAll(async () => {
    const graphMeUrl = new URL(graphAPIEndpoint);
    nock(graphMeUrl.origin).get(graphMeUrl.pathname).reply(200, {
      id: 'id',
      displayName: 'displayName',
      mail: 'mail',
      userPrincipalName: 'userPrincipalName',
    });
  });

  it('should get user info from graph api', async () => {
    const connector = await createConnector({ getConfig: getConnectorConfig });
    const userInfo = await connector.getUserInfo(
      { code: 'code', redirectUri: 'redirectUri' },
      vi.fn()
    );
    expect(userInfo).toEqual({
      id: 'id',
      name: 'displayName',
      email: 'mail',
      rawData: {
        id: 'id',
        displayName: 'displayName',
        mail: 'mail',
        userPrincipalName: 'userPrincipalName',
      },
    });
  });

  it('should not return the email when email sync is disabled', async () => {
    const graphMeUrl = new URL(graphAPIEndpoint);
    nock(graphMeUrl.origin).get(graphMeUrl.pathname).reply(200, {
      id: 'id',
      displayName: 'displayName',
      mail: 'mail',
      userPrincipalName: 'userPrincipalName',
    });

    const connector = await createConnector({
      getConfig: vi.fn().mockResolvedValue({
        ...mockedConfig,
        disableEmailSync: true,
      }),
    });
    const userInfo = await connector.getUserInfo(
      { code: 'code', redirectUri: 'redirectUri' },
      vi.fn()
    );

    expect(userInfo.email).toBeUndefined();
    expect(userInfo).toEqual({
      id: 'id',
      name: 'displayName',
      rawData: {
        id: 'id',
        displayName: 'displayName',
        mail: 'mail',
        userPrincipalName: 'userPrincipalName',
      },
    });
  });

  it('should throw if graph api response has no id', async () => {
    const graphMeUrl = new URL(graphAPIEndpoint);
    nock(graphMeUrl.origin).get(graphMeUrl.pathname).reply(200, {
      displayName: 'displayName',
      mail: 'mail',
      userPrincipalName: 'userPrincipalName',
    });

    const connector = await createConnector({ getConfig: getConnectorConfig });
    const userInfo = connector.getUserInfo({ code: 'code', redirectUri: 'redirectUri' }, vi.fn());
    await expect(userInfo).rejects.toThrow(expect.objectContaining({ code: 'invalid_response' }));
  });
});
