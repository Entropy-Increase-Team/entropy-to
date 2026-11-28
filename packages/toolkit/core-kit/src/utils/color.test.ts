import { describe, expect, it } from 'vitest';

import {
  generateBrandColorStates,
  generateDarkColor,
  getAccessibleForegroundColor,
} from './color.js';

describe('color utilities', () => {
  it('computes high-contrast accessible foregrounds', () => {
    expect(getAccessibleForegroundColor('#14171c')).toBe('#ffffff');
    expect(getAccessibleForegroundColor('#f5f7fa')).toBe('#0f1114');
    expect(getAccessibleForegroundColor('#0d74ce')).toBe('#ffffff');
    expect(getAccessibleForegroundColor('#facc15')).toBe('#0f1114');
    expect(getAccessibleForegroundColor('invalid-color')).toBe('#ffffff');
  });

  it('derives distinct interactive states for monochrome and chromatic primaries', () => {
    const darkMono = generateBrandColorStates('#14171c', false);
    expect(darkMono.default).toBe('#14171C');
    expect(darkMono.foreground).toBe('#ffffff');
    expect(darkMono.hover).not.toBe(darkMono.default);
    expect(darkMono.pressed).not.toBe(darkMono.default);

    const lightMono = generateBrandColorStates('#f5f7fa', true);
    expect(lightMono.default).toBe('#F5F7FA');
    expect(lightMono.foreground).toBe('#0f1114');
    expect(lightMono.hover).not.toBe(lightMono.default);
    expect(lightMono.pressed).not.toBe(lightMono.hover);

    const explicit = generateBrandColorStates('#0d74ce', false, '#f8fafc');
    expect(explicit.foreground).toBe('#f8fafc');
  });

  it('keeps generateDarkColor backward compatible', () => {
    expect(generateDarkColor('#6139F6')).toBe('#8768F8');
  });
});
