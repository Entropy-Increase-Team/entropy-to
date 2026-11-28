import { describe, expect, it } from 'vitest';

import { Theme } from '../types/theme.js';

import {
  appearancePresetDefaults,
  buildAppearanceCssVariables,
  buildAppearanceStyleSheet,
  getAppearanceFontStylesheetUrl,
  resolveSignInExperienceAppearance,
} from './appearance.js';

describe('appearance utilities', () => {
  it('defaults to entropy preset with hidden footer when hideLogtoBranding is true or omitted', () => {
    const resolved = resolveSignInExperienceAppearance(undefined, undefined, true);
    expect(resolved.preset).toBe('entropy');
    expect(resolved.layout).toBe('centered');
    expect(resolved.background.type).toBe('tech-grid');
    expect(resolved.background.lightColor).toBe('#f4f4f6');
    expect(resolved.background.darkColor).toBe('#0f1114');
    expect(resolved.surface.darkCardColor).toBe('#161920');
    expect(resolved.topBar.enabled).toBe(true);
    expect(resolved.topBar.showThemeToggle).toBe(true);
    expect(resolved.footerBranding).toEqual({ mode: 'hidden' });
  });

  it('respects explicit custom footerBranding and falls back to logto when hideLogtoBranding=false', () => {
    const legacy = resolveSignInExperienceAppearance(undefined, undefined, false);
    expect(legacy.footerBranding).toEqual({ mode: 'logto' });

    const custom = resolveSignInExperienceAppearance(
      undefined,
      {
        footerBranding: {
          mode: 'custom',
          text: '© 2026 熵增账号中心',
          icpRecord: '京ICP备00000000号',
        },
      },
      false
    );
    expect(custom.footerBranding.mode).toBe('custom');
    expect(custom.footerBranding.text).toBe('© 2026 熵增账号中心');
  });

  it('computes contrast-safe dark mode foreground for light monochrome button (#f5f7fa)', () => {
    const resolved = resolveSignInExperienceAppearance({ preset: 'entropy' }, undefined, true);
    const darkVariables = buildAppearanceCssVariables(
      resolved,
      {
        primaryColor: '#14171C',
        darkPrimaryColor: '#F5F7FA',
        isDarkModeEnabled: true,
      },
      Theme.Dark
    );

    expect(darkVariables['--color-brand-default']).toBe('#F5F7FA');
    expect(darkVariables['--color-brand-foreground']).toBe('#0f1114');
    expect(darkVariables['--color-type-link']).toBe('#6EA8FF');
    expect(darkVariables['--color-bg-float-base']).toBe('#0f1114');
    expect(darkVariables['--color-bg-float']).toBe('#161920');
    expect(darkVariables['--color-shadow-card']).toContain('inset 0 1px');
  });

  it('generates SSR stylesheet containing both light and dark scopes', () => {
    const resolved = resolveSignInExperienceAppearance({ preset: 'minimal' });
    const css = buildAppearanceStyleSheet(resolved, appearancePresetDefaults.minimal.color);

    expect(css).toContain('html[data-theme="light"] body');
    expect(css).toContain('html[data-theme="dark"] body');
    expect(css).toContain('--radius-card: 0px;');
  });

  it('resolves font stylesheet URLs by preset', () => {
    expect(getAppearanceFontStylesheetUrl({ fontPreset: 'system' })).toBeUndefined();
    expect(getAppearanceFontStylesheetUrl({ fontPreset: 'noto-sans-sc' })).toContain(
      'Noto+Sans+SC'
    );
    expect(
      getAppearanceFontStylesheetUrl({
        fontPreset: 'custom',
        customFontStylesheetUrl: 'https://cdn.example.com/font.css',
      })
    ).toBe('https://cdn.example.com/font.css');
  });
});
