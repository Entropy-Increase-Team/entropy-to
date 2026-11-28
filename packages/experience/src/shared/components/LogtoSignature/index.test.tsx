import { Theme } from '@logto/schemas';
import { render } from '@testing-library/react';

import LogtoSignature from '.';

describe('LogtoSignature / BrandSignature', () => {
  it('renders nothing when mode is hidden and injects no anti-tamper style guard', () => {
    const { container } = render(
      <LogtoSignature theme={Theme.Light} footerBranding={{ mode: 'hidden' }} />
    );

    expect(container.firstChild).toBeNull();
    expect(document.head.querySelector('style[data-logto-signature-guard]')).toBeNull();
  });

  it('renders custom footer branding with safe links and ICP record', () => {
    const { getByText, container } = render(
      <LogtoSignature
        theme={Theme.Dark}
        footerBranding={{
          mode: 'custom',
          text: '熵增账号中心',
          linkUrl: 'https://entropy.example.com',
          logoUrl: 'https://entropy.example.com/light.svg',
          darkLogoUrl: 'https://entropy.example.com/dark.svg',
          icpRecord: '京ICP备12345678号',
          icpUrl: 'https://beian.miit.gov.cn',
        }}
      />
    );

    expect(container.querySelector('[data-brand-signature="custom"]')).not.toBeNull();
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://entropy.example.com/dark.svg');
    expect(getByText('熵增账号中心').closest('a')?.getAttribute('href')).toBe(
      'https://entropy.example.com/'
    );
    expect(getByText('京ICP备12345678号').closest('a')?.getAttribute('href')).toBe(
      'https://beian.miit.gov.cn/'
    );
  });

  it('ignores non-http(s) URLs in custom footer branding', () => {
    const { getByText } = render(
      <LogtoSignature
        theme={Theme.Light}
        footerBranding={{
          mode: 'custom',
          text: 'Safe Text',
          // eslint-disable-next-line no-script-url -- testing unsafe protocol rejection
          linkUrl: 'javascript:alert(1)',
        }}
      />
    );

    expect(getByText('Safe Text').closest('a')).toBeNull();
  });

  it('renders plain non-locked Logto signature when mode is logto', () => {
    const { container } = render(
      <LogtoSignature theme={Theme.Light} footerBranding={{ mode: 'logto' }} />
    );

    expect(container.querySelector('[data-brand-signature="logto"]')).not.toBeNull();
    expect(container.querySelector('[data-logto-signature="secured"]')).toBeNull();
    expect(document.head.querySelector('style[data-logto-signature-guard]')).toBeNull();
  });
});
