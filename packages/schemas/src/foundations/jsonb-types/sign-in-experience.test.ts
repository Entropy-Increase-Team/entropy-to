import { describe, expect, it } from 'vitest';

import {
  MfaPolicy,
  brandingGuard,
  colorGuard,
  customUiCspGuard,
  defaultTrustedDevicePolicy,
  mfaGuard,
  passwordExpirationPolicyGuard,
  signInExperienceAppearanceGuard,
  trustedDevicePolicyGuard,
} from './sign-in-experience.js';

describe('customUiCspGuard', () => {
  it.each([
    {},
    { scriptSrc: ['https://example.com'] },
    { connectSrc: ['https://api.example.com'] },
    {
      scriptSrc: ['https://example.com'],
      connectSrc: ['https://api.example.com'],
    },
  ])('accepts %p', (value) => {
    expect(customUiCspGuard.safeParse(value).success).toBe(true);
  });

  it('rejects unsupported directives', () => {
    expect(customUiCspGuard.safeParse({ imgSrc: ['https://example.com'] }).success).toBe(false);
  });
});

describe('passwordExpirationPolicyGuard', () => {
  it.each([
    [{}, {}],
    [{ enabled: false }, { enabled: false }],
  ])('accepts disabled policy %p', (value, expected) => {
    expect(passwordExpirationPolicyGuard.parse(value)).toEqual(expected);
  });

  it('accepts enabled policy with a valid period', () => {
    expect(
      passwordExpirationPolicyGuard.parse({
        enabled: true,
        validPeriodDays: 30,
      })
    ).toEqual({
      enabled: true,
      validPeriodDays: 30,
    });
  });

  it('accepts enabled policy with an enabledAt timestamp', () => {
    expect(
      passwordExpirationPolicyGuard.parse({
        enabled: true,
        validPeriodDays: 30,
        enabledAt: 1_700_000_000_000,
      })
    ).toEqual({
      enabled: true,
      validPeriodDays: 30,
      enabledAt: 1_700_000_000_000,
    });
  });

  it('strips unknown keys from legacy rows (e.g. the removed reminderPeriodDays)', () => {
    expect(
      passwordExpirationPolicyGuard.parse({
        enabled: true,
        validPeriodDays: 30,
        reminderPeriodDays: 5,
      })
    ).toEqual({
      enabled: true,
      validPeriodDays: 30,
    });
  });

  it.each([
    { enabled: true },
    { enabled: true, validPeriodDays: 0 },
    { enabled: true, validPeriodDays: 1.5 },
    { enabled: true, reminderPeriodDays: 5 },
    { enabled: true, validPeriodDays: 30, enabledAt: -1 },
    { enabled: true, validPeriodDays: 30, enabledAt: 1.5 },
  ])('rejects invalid policy %p', (value) => {
    expect(passwordExpirationPolicyGuard.safeParse(value).success).toBe(false);
  });
});

describe('trustedDevicePolicyGuard', () => {
  it.each([{}, { enabled: false }, { durationDays: 1 }, { enabled: true, durationDays: 365 }])(
    'accepts valid policy %p',
    (value) => {
      expect(trustedDevicePolicyGuard.parse(value)).toEqual(value);
    }
  );

  it.each([{ durationDays: 0 }, { durationDays: 366 }, { durationDays: 1.5 }])(
    'rejects invalid policy %p',
    (value) => {
      expect(trustedDevicePolicyGuard.safeParse(value).success).toBe(false);
    }
  );

  it('provides the complete effective default', () => {
    expect(defaultTrustedDevicePolicy).toEqual({ enabled: false, durationDays: 30 });
    expect(trustedDevicePolicyGuard.safeParse(defaultTrustedDevicePolicy).success).toBe(true);
  });

  it('rejects invalid enabled values', () => {
    const value = { enabled: 'true' };
    expect(trustedDevicePolicyGuard.safeParse(value).success).toBe(false);
  });
});

describe('mfaGuard', () => {
  it('accepts valid MfaPolicy values including deprecated UserControlled', () => {
    expect(
      mfaGuard.safeParse({ factors: [], policy: MfaPolicy.PromptAtSignInAndSignUp }).success
    ).toBe(true);
    expect(mfaGuard.safeParse({ factors: [], policy: MfaPolicy.UserControlled }).success).toBe(
      true
    );
  });
});

describe('brandingGuard, colorGuard, and signInExperienceAppearanceGuard', () => {
  it('accepts extended branding with custom footerBranding and blocks non-http footer URLs', () => {
    expect(
      brandingGuard.safeParse({
        brandName: '熵增账号中心',
        tagline: '统一身份认证',
        adaptiveLogo: true,
        footerBranding: {
          mode: 'custom',
          text: '© 2026 熵增开放平台',
          linkUrl: 'https://open.entropy.example',
          icpRecord: '京ICP备12345678号',
        },
      }).success
    ).toBe(true);

    expect(
      brandingGuard.safeParse({
        footerBranding: {
          mode: 'custom',
          linkUrl: ['javascript', 'alert(1)'].join(':'),
        },
      }).success
    ).toBe(false);
  });

  it('accepts optional link and foreground colors in colorGuard', () => {
    expect(
      colorGuard.safeParse({
        primaryColor: '#14171C',
        darkPrimaryColor: '#F5F7FA',
        isDarkModeEnabled: true,
        linkColor: '#0D74CE',
        darkLinkColor: '#6EA8FF',
        primaryForegroundColor: '#FFFFFF',
        darkPrimaryForegroundColor: '#0F1114',
      }).success
    ).toBe(true);
  });

  it('validates appearance presets, layouts, https font URLs, and blocks CSS injection in font names', () => {
    expect(
      signInExperienceAppearanceGuard.safeParse({
        preset: 'entropy',
        layout: 'split-left',
        headerAlignment: 'left',
        cardWidth: 'default',
        topBar: {
          enabled: true,
          showThemeToggle: true,
          homeUrl: 'https://open.entropy.example',
          homeLabel: '返回首页',
        },
        background: {
          type: 'tech-grid',
          lightColor: '#f4f4f6',
          darkColor: '#0f1114',
          overlayOpacity: 0.45,
        },
        surface: {
          cardRadius: 'xl',
          controlRadius: 'md',
          shadow: 'whisper',
          density: 'default',
          darkTopHighlight: true,
        },
        typography: {
          fontPreset: 'custom',
          customFontFamily: "'Noto Sans SC', sans-serif",
          customFontStylesheetUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC',
        },
      }).success
    ).toBe(true);

    expect(
      signInExperienceAppearanceGuard.safeParse({
        typography: {
          fontPreset: 'custom',
          customFontFamily: 'Arial; } body { background: red }',
        },
      }).success
    ).toBe(false);

    expect(
      signInExperienceAppearanceGuard.safeParse({
        typography: {
          fontPreset: 'custom',
          customFontStylesheetUrl: 'http://insecure.example.com/font.css',
        },
      }).success
    ).toBe(false);
  });
});
