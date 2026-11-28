import {
  type AppearanceCardRadius,
  type AppearanceControlRadius,
  type AppearanceFontPreset,
  type AppearanceShadow,
  type ResolvedAppearance,
} from '@logto/schemas';
import { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import ColorPicker from '@/ds-components/ColorPicker';
import FormField from '@/ds-components/FormField';
import Select from '@/ds-components/Select';
import Switch from '@/ds-components/Switch';
import TextInput from '@/ds-components/TextInput';
import { uriValidator } from '@/utils/validator';

import type { SignInExperienceForm } from '../../../types';

import styles from './index.module.scss';

type Props = {
  readonly resolved: ResolvedAppearance;
  readonly isDarkModeEnabled: boolean;
};

function SurfaceAndTypographySection({ resolved, isDarkModeEnabled }: Props) {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SignInExperienceForm>();

  const validateOptionalUrl = useCallback(
    (value?: string) => !value || uriValidator(value) || t('errors.invalid_uri_format'),
    [t]
  );

  const cardRadiusOptions = useMemo<Array<{ value: AppearanceCardRadius; title: string }>>(
    () => [
      { value: 'none', title: t('sign_in_exp.appearance.radius_none') },
      { value: 'sm', title: t('sign_in_exp.appearance.radius_sm') },
      { value: 'md', title: t('sign_in_exp.appearance.radius_md') },
      { value: 'lg', title: t('sign_in_exp.appearance.radius_lg') },
      { value: 'xl', title: t('sign_in_exp.appearance.radius_xl') },
    ],
    [t]
  );

  const controlRadiusOptions = useMemo<Array<{ value: AppearanceControlRadius; title: string }>>(
    () => [
      { value: 'none', title: t('sign_in_exp.appearance.radius_none') },
      { value: 'sm', title: t('sign_in_exp.appearance.radius_sm') },
      { value: 'md', title: t('sign_in_exp.appearance.radius_md') },
      { value: 'lg', title: t('sign_in_exp.appearance.radius_lg') },
      { value: 'pill', title: t('sign_in_exp.appearance.radius_pill') },
    ],
    [t]
  );

  const shadowOptions = useMemo<Array<{ value: AppearanceShadow; title: string }>>(
    () => [
      { value: 'none', title: t('sign_in_exp.appearance.shadow_none') },
      { value: 'whisper', title: t('sign_in_exp.appearance.shadow_whisper') },
      { value: 'elevated', title: t('sign_in_exp.appearance.shadow_elevated') },
    ],
    [t]
  );

  const fontPresetOptions = useMemo<Array<{ value: AppearanceFontPreset; title: string }>>(
    () => [
      { value: 'noto-sans-sc', title: t('sign_in_exp.appearance.font_noto_sans_sc') },
      { value: 'inter', title: t('sign_in_exp.appearance.font_inter') },
      { value: 'system', title: t('sign_in_exp.appearance.font_system') },
      { value: 'custom', title: t('sign_in_exp.appearance.font_custom') },
    ],
    [t]
  );

  return (
    <div className={styles.subSection}>
      <div className={styles.subSectionTitle}>{t('sign_in_exp.appearance.surface_section')}</div>
      <div className={styles.twoColumns}>
        <FormField title="sign_in_exp.appearance.light_card_color">
          <Controller
            name="appearance.surface.lightCardColor"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ColorPicker value={value ?? resolved.surface.lightCardColor} onChange={onChange} />
            )}
          />
        </FormField>
        {isDarkModeEnabled && (
          <FormField title="sign_in_exp.appearance.dark_card_color">
            <Controller
              name="appearance.surface.darkCardColor"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ColorPicker value={value ?? resolved.surface.darkCardColor} onChange={onChange} />
              )}
            />
          </FormField>
        )}
      </div>

      <div className={styles.threeColumns}>
        <FormField title="sign_in_exp.appearance.card_radius">
          <Controller
            name="appearance.surface.cardRadius"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? resolved.surface.cardRadius}
                options={cardRadiusOptions}
                onChange={(nextValue) => {
                  if (nextValue) {
                    onChange(nextValue);
                  }
                }}
              />
            )}
          />
        </FormField>
        <FormField title="sign_in_exp.appearance.control_radius">
          <Controller
            name="appearance.surface.controlRadius"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? resolved.surface.controlRadius}
                options={controlRadiusOptions}
                onChange={(nextValue) => {
                  if (nextValue) {
                    onChange(nextValue);
                  }
                }}
              />
            )}
          />
        </FormField>
        <FormField title="sign_in_exp.appearance.shadow">
          <Controller
            name="appearance.surface.shadow"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? resolved.surface.shadow}
                options={shadowOptions}
                onChange={(nextValue) => {
                  if (nextValue) {
                    onChange(nextValue);
                  }
                }}
              />
            )}
          />
        </FormField>
      </div>

      <FormField title="sign_in_exp.appearance.font_preset">
        <Controller
          name="appearance.typography.fontPreset"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Select
              value={value ?? resolved.typography.fontPreset}
              options={fontPresetOptions}
              onChange={(nextValue) => {
                if (nextValue) {
                  onChange(nextValue);
                }
              }}
            />
          )}
        />
      </FormField>

      {resolved.typography.fontPreset === 'custom' && (
        <div className={styles.twoColumns}>
          <FormField title="sign_in_exp.appearance.custom_font_family">
            <TextInput
              placeholder="'Plus Jakarta Sans', sans-serif"
              error={errors.appearance?.typography?.customFontFamily?.message}
              {...register('appearance.typography.customFontFamily', { maxLength: 120 })}
            />
          </FormField>
          <FormField title="sign_in_exp.appearance.custom_font_stylesheet_url">
            <TextInput
              placeholder="https://fonts.googleapis.com/css2?..."
              error={errors.appearance?.typography?.customFontStylesheetUrl?.message}
              {...register('appearance.typography.customFontStylesheetUrl', {
                validate: validateOptionalUrl,
              })}
            />
          </FormField>
        </div>
      )}

      <div className={styles.stack}>
        {isDarkModeEnabled && (
          <Controller
            name="appearance.surface.darkTopHighlight"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Switch
                label={t('sign_in_exp.appearance.dark_top_highlight')}
                checked={value ?? resolved.surface.darkTopHighlight}
                onChange={(event) => {
                  onChange(event.currentTarget.checked);
                }}
              />
            )}
          />
        )}
        <Controller
          name="appearance.motion.errorShake"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Switch
              label={t('sign_in_exp.appearance.motion_error_shake')}
              checked={value ?? resolved.motion.errorShake}
              onChange={(event) => {
                onChange(event.currentTarget.checked);
              }}
            />
          )}
        />
        <Controller
          name="appearance.motion.reduced"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Switch
              label={t('sign_in_exp.appearance.motion_reduced')}
              checked={value ?? resolved.motion.reduced}
              onChange={(event) => {
                onChange(event.currentTarget.checked);
              }}
            />
          )}
        />
      </div>
    </div>
  );
}

export default SurfaceAndTypographySection;
