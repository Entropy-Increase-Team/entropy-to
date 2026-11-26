import { UserScope } from '@logto/core-kit';
import { AccountCenterControlValue, type AccountCenter } from '@logto/schemas';

import { mockUser } from '#src/__mocks__/user.js';
import type Libraries from '#src/tenants/Libraries.js';
import type Queries from '#src/tenants/Queries.js';

import { getAccountCenterFilteredProfile, getScopedProfile } from './get-scoped-profile.js';

const { jest } = import.meta;

describe('getScopedProfile', () => {
  it('assigns ssoIdentities under the ssoIdentities property rather than spreading array indices', async () => {
    const mockSsoIdentity = {
      tenantId: 'default',
      id: 'sso-id-1',
      userId: mockUser.id,
      issuer: 'https://idp.example.com',
      identityId: 'ext-1',
      detail: {},
      createdAt: 0,
      ssoConnectorId: 'connector-1',
      updatedAt: 0,
    };
    const queries = {
      users: { findUserById: jest.fn(async () => mockUser) },
    } as unknown as Queries;
    const libraries = {
      users: { findUserSsoIdentities: jest.fn(async () => [mockSsoIdentity]) },
    } as unknown as Libraries;

    const { profile } = await getScopedProfile(
      queries,
      libraries,
      new Set([UserScope.Identities]),
      mockUser.id
    );

    expect(profile.ssoIdentities).toEqual([mockSsoIdentity]);
    expect(profile).not.toHaveProperty('0');
  });
});

describe('getAccountCenterFilteredProfile', () => {
  const accountCenter: AccountCenter = {
    tenantId: 'tenant-id',
    id: 'default',
    enabled: true,
    fields: {
      email: AccountCenterControlValue.Off,
      phone: AccountCenterControlValue.Off,
    },
    webauthnRelatedOrigins: [],
    deleteAccountUrl: null,
    customCss: null,
    profileFields: null,
    maximumAuthenticationAgeInSeconds: 600,
  };

  const scopes = new Set([UserScope.Email, UserScope.Phone]);

  it('exposes primary identifier availability without exposing the identifiers', () => {
    const profile = getAccountCenterFilteredProfile({ id: 'user-id' }, accountCenter, scopes, {
      passwordEncrypted: null,
      primaryEmail: 'alex@example.com',
      primaryPhone: '+14155550100',
    });

    expect(profile.primaryEmail).toBeUndefined();
    expect(profile.primaryPhone).toBeUndefined();
    expect(profile.hasPrimaryEmail).toBe(true);
    expect(profile.hasPrimaryPhone).toBe(true);
  });

  it('reports missing identifiers as false', () => {
    const profile = getAccountCenterFilteredProfile({ id: 'user-id' }, accountCenter, scopes, {
      passwordEncrypted: null,
      primaryEmail: null,
      primaryPhone: null,
    });

    expect(profile.hasPrimaryEmail).toBe(false);
    expect(profile.hasPrimaryPhone).toBe(false);
  });

  it('does not expose identifier availability without the matching scopes', () => {
    const profile = getAccountCenterFilteredProfile({ id: 'user-id' }, accountCenter, new Set(), {
      passwordEncrypted: null,
      primaryEmail: 'alex@example.com',
      primaryPhone: '+14155550100',
    });

    expect(profile.hasPrimaryEmail).toBeUndefined();
    expect(profile.hasPrimaryPhone).toBeUndefined();
  });

  it('filters ssoIdentities unless fields.social is readable', () => {
    const mockSsoIdentities = [
      {
        tenantId: 'tenant-id',
        id: 'sso-1',
        userId: 'user-id',
        issuer: 'https://idp.example.com',
        identityId: 'sub-1',
        detail: { email: 'hidden@example.com' },
        createdAt: 0,
        ssoConnectorId: 'conn-1',
        updatedAt: 0,
      },
    ];

    const hiddenWhenOff = getAccountCenterFilteredProfile(
      { id: 'user-id', ssoIdentities: mockSsoIdentities },
      {
        ...accountCenter,
        fields: { ...accountCenter.fields, social: AccountCenterControlValue.Off },
      },
      new Set([UserScope.Identities])
    );
    expect(hiddenWhenOff.ssoIdentities).toBeUndefined();

    const hiddenWhenUnset = getAccountCenterFilteredProfile(
      { id: 'user-id', ssoIdentities: mockSsoIdentities },
      accountCenter,
      new Set([UserScope.Identities])
    );
    expect(hiddenWhenUnset.ssoIdentities).toBeUndefined();

    const visibleWhenReadOnly = getAccountCenterFilteredProfile(
      { id: 'user-id', ssoIdentities: mockSsoIdentities },
      {
        ...accountCenter,
        fields: { ...accountCenter.fields, social: AccountCenterControlValue.ReadOnly },
      },
      new Set([UserScope.Identities])
    );
    expect(visibleWhenReadOnly.ssoIdentities).toEqual(mockSsoIdentities);
  });
});
