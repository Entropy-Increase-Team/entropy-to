import { consume } from '@lit/context';
import { assert, fixture, html, nextFrame, waitUntil } from '@open-wc/testing';
import { type Optional } from '@silverhand/essentials';
import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { createMockAccountApi } from '../__mocks__/account-api.js';
import { LogtoAccountApi } from '../api/index.js';

import {
  logtoAccountContext,
  type LogtoAccountContextType,
  LogtoAccountProvider,
} from './logto-account-provider.js';

@customElement('test-logto-account-provider-consumer')
export class TestLogtoAccountProviderConsumer extends LitElement {
  @consume({ context: logtoAccountContext, subscribe: true })
  @property({ attribute: false })
  accountContext?: LogtoAccountContextType;

  render() {
    if (!this.accountContext) {
      return nothing;
    }

    return html`<div id="user-id">${this.accountContext.userProfile.id}</div>`;
  }
}

suite('logto-account-provider', () => {
  test('is defined', () => {
    const element = document.createElement('logto-account-provider');
    assert.instanceOf(element, LogtoAccountProvider);
  });

  test('should render not initialized content when account api is not provided', async () => {
    const provider = await fixture<LogtoAccountProvider>(
      html`<logto-account-provider></logto-account-provider>`
    );

    await provider.updateComplete;

    assert.equal(
      provider.shadowRoot?.textContent,
      `${LogtoAccountProvider.tagName} not initialized.`
    );
  });

  test('should correctly consume logto account provider context', async () => {
    const testUserId = '123';

    const mockAccountApi = createMockAccountApi({
      fetchUserProfile: async () => ({
        id: testUserId,
      }),
    });

    const provider = await fixture<LogtoAccountProvider>(
      html`<logto-account-provider .accountApi=${mockAccountApi}>
        <test-logto-account-provider-consumer></test-logto-account-provider-consumer>
      </logto-account-provider>`
    );

    await provider.updateComplete;

    const consumer = provider.querySelector<TestLogtoAccountProviderConsumer>(
      'test-logto-account-provider-consumer'
    )!;

    await waitUntil(
      () => consumer.shadowRoot?.querySelector('#user-id')?.textContent === testUserId,
      'Unable to get user data from account context'
    );
  });

  test('should render error content and dispatch error event when initialize failed', async () => {
    const errorMessage = 'Failed to fetch user profile';
    // eslint-disable-next-line @silverhand/fp/no-let
    let dispatchedErrorEvent: Optional<ErrorEvent>;

    const mockAccountApi = createMockAccountApi({
      fetchUserProfile: async () => {
        // Simulate network delay
        await nextFrame();
        throw new Error(errorMessage);
      },
    });

    const provider = await fixture<LogtoAccountProvider>(
      html`<logto-account-provider .accountApi=${mockAccountApi}>
        <test-logto-account-provider-consumer></test-logto-account-provider-consumer>
      </logto-account-provider>`
    );

    provider.addEventListener('error', (event) => {
      // eslint-disable-next-line @silverhand/fp/no-mutation
      dispatchedErrorEvent = event;
    });

    await provider.updateComplete;

    await waitUntil(
      () => provider.shadowRoot?.textContent === `${LogtoAccountProvider.tagName}: ${errorMessage}`
    );

    assert.equal(dispatchedErrorEvent?.error.message, errorMessage);
  });

  test('LogtoAccountApi fetches user profile from /api/my-account with Bearer token', async () => {
    const originalFetch = window.fetch;
    // eslint-disable-next-line @silverhand/fp/no-let -- test spy capture
    let capturedUrl = '';
    // eslint-disable-next-line @silverhand/fp/no-let -- test spy capture
    let capturedAuth = '';

    // eslint-disable-next-line @silverhand/fp/no-mutation -- stub fetch for unit test
    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      // eslint-disable-next-line @silverhand/fp/no-mutation -- test spy capture
      capturedUrl = request.url;
      // eslint-disable-next-line @silverhand/fp/no-mutation -- test spy capture
      capturedAuth = request.headers.get('Authorization') ?? '';
      return new Response(JSON.stringify({ id: 'u_my_account' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const api = new LogtoAccountApi('https://tenant.logto.app', async () => 'tok_123');
      const profile = await api.fetchUserProfile();
      assert.equal(profile.id, 'u_my_account');
      assert.equal(capturedUrl, 'https://tenant.logto.app/api/my-account');
      assert.equal(capturedAuth, 'Bearer tok_123');
    } finally {
      // eslint-disable-next-line @silverhand/fp/no-mutation -- restore fetch
      window.fetch = originalFetch;
    }
  });
});
