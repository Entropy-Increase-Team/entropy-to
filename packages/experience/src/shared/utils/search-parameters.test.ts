import { handleSearchParametersData, removeSearchParameters } from './search-parameters';

describe('search parameters utils', () => {
  afterEach(() => {
    window.history.replaceState(window.history.state, '', '/');
  });

  it('removes selected search parameters and preserves the rest', () => {
    window.history.pushState(
      window.history.state,
      '',
      '/reset-password?one_time_token=token&login_hint=foo%40logto.io&foo=bar#section'
    );

    removeSearchParameters(['one_time_token', 'login_hint']);

    expect(window.location.pathname).toBe('/reset-password');
    expect(window.location.search).toBe('?foo=bar');
    expect(window.location.hash).toBe('#section');
  });

  it('stores confirm_redirect_policy and clears it when a later load does not pass it', () => {
    window.history.pushState(
      window.history.state,
      '',
      '/sign-in?app_id=foo&confirm_redirect_policy=password'
    );
    handleSearchParametersData();

    expect(sessionStorage.getItem('confirm_redirect_policy')).toBe('password');
    expect(window.location.search).toBe('?app_id=foo');

    window.history.pushState(window.history.state, '', '/sign-in?app_id=foo');
    handleSearchParametersData();

    expect(sessionStorage.getItem('confirm_redirect_policy')).toBeNull();
  });

  it.each(['/callback/github', '/callback/social/github'])(
    'keeps existing session values and ignores upstream IdP query params on %s',
    (pathname) => {
      sessionStorage.setItem('app_id', 'logto_app_1');
      sessionStorage.setItem('confirm_redirect_policy', 'password');
      sessionStorage.setItem('organization_id', 'org_123');
      sessionStorage.setItem('ui_locales', 'zh-CN');
      window.history.pushState(
        window.history.state,
        '',
        `${pathname}?app_id=upstream_alipay_app&organization_id=upstream_org&ui_locales=ar&code=foo&state=bar`
      );
      handleSearchParametersData();

      expect(sessionStorage.getItem('app_id')).toBe('logto_app_1');
      expect(sessionStorage.getItem('confirm_redirect_policy')).toBe('password');
      expect(sessionStorage.getItem('organization_id')).toBe('org_123');
      expect(sessionStorage.getItem('ui_locales')).toBe('zh-CN');
      expect(window.location.search).toBe(
        '?app_id=upstream_alipay_app&organization_id=upstream_org&ui_locales=ar&code=foo&state=bar'
      );
    }
  );
});
