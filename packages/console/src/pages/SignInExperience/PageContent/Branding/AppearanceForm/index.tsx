import {
  appearancePresetDefaults,
  resolveSignInExperienceAppearance,
  type AppearanceCardWidth,
  type AppearanceHeaderAlignment,
  type AppearanceLayout,
  type AppearancePreset,
} from '@logto/schemas';
import classNames from 'classnames';
import { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Card from '@/ds-components/Card';
import FormField from '@/ds-components/FormField';
import RadioGroup, { Radio } from '@/ds-components/RadioGroup';
import Select from '@/ds-components/Select';
import Switch from '@/ds-components/Switch';
import TextInput from '@/ds-components/TextInput';
import useCurrentTenantScopes from '@/hooks/use-current-tenant-scopes';
import { uriValidator } from '@/utils/validator';

import type { SignInExperienceForm } from '../../../types';
import FormSectionTitle from '../../components/FormSectionTitle';

import BackgroundAndHeroSection from './BackgroundAndHeroSection';
import SurfaceAndTypographySection from './SurfaceAndTypographySection';
import styles from './index.module.scss';

const presetOptions: ReadonlyArray<{
  value: AppearancePreset;
  titleKey: 'preset_entropy' | 'preset_classic' | 'preset_minimal';
  descriptionKey:
    | 'preset_entropy_description'
    | 'preset_classic_description'
    | 'preset_minimal_description';
}> = [
  {
    value: 'entropy',
    titleKey: 'preset_entropy',
    descriptionKey: 'preset_entropy_description',
  },
  {
    value: 'classic',
    titleKey: 'preset_classic',
    descriptionKey: 'preset_classic_description',
  },
  {
    value: 'minimal',
    titleKey: 'preset_minimal',
    descriptionKey: 'preset_minimal_description',
  },
];

function AppearanceForm() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const {
    access: { isReadOnly },
  } = useCurrentTenantScopes();
  const {
    watch,
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<SignInExperienceForm>();

  const appearance = watch('appearance');
  const branding = watch('branding');
  const isDarkModeEnabled = watch('color.isDarkModeEnabled');
  const hideLogtoBranding = watch('hideLogtoBranding');

  const resolved = useMemo(
    () => resolveSignInExperienceAppearance(appearance, branding, hideLogtoBranding),
    [appearance, branding, hideLogtoBranding]
  );

  const handleSelectPreset = useCallback(
    (preset: AppearancePreset) => {
      if (isReadOnly) {
        return;
      }

      const defaults = appearancePresetDefaults[preset];
      setValue(
        'appearance',
        {
          ...appearance,
          preset,
          layout: defaults.layout,
          headerAlignment: defaults.headerAlignment,
          cardWidth: defaults.cardWidth,
          topBar: {
            ...appearance.topBar,
            enabled: defaults.topBar.enabled,
            showThemeToggle: defaults.topBar.showThemeToggle,
          },
          background: {
            ...appearance.background,
            type: defaults.background.type,
            lightColor: defaults.background.lightColor,
            darkColor: defaults.background.darkColor,
            overlayOpacity: defaults.background.overlayOpacity,
          },
          surface: {
            ...appearance.surface,
            lightCardColor: defaults.surface.lightCardColor,
            darkCardColor: defaults.surface.darkCardColor,
            cardRadius: defaults.surface.cardRadius,
            controlRadius: defaults.surface.controlRadius,
            shadow: defaults.surface.shadow,
            density: defaults.surface.density,
            darkTopHighlight: defaults.surface.darkTopHighlight,
          },
          typography: {
            ...appearance.typography,
            fontPreset: defaults.typography.fontPreset,
          },
          motion: {
            ...appearance.motion,
            reduced: defaults.motion.reduced,
            errorShake: defaults.motion.errorShake,
          },
        },
        { shouldDirty: true }
      );
      setValue('color.primaryColor', defaults.color.primaryColor, { shouldDirty: true });
      setValue('color.darkPrimaryColor', defaults.color.darkPrimaryColor, { shouldDirty: true });
      setValue('color.linkColor', defaults.color.linkColor, { shouldDirty: true });
      setValue('color.darkLinkColor', defaults.color.darkLinkColor, { shouldDirty: true });
    },
    [appearance, isReadOnly, setValue]
  );

  const validateOptionalUrl = useCallback(
    (value?: string) => !value || uriValidator(value) || t('errors.invalid_uri_format'),
    [t]
  );

  const layoutOptions = useMemo<Array<{ value: AppearanceLayout; title: string }>>(
    () => [
      { value: 'centered', title: t('sign_in_exp.appearance.layout_centered') },
      { value: 'framed', title: t('sign_in_exp.appearance.layout_framed') },
      { value: 'split-left', title: t('sign_in_exp.appearance.layout_split_left') },
      { value: 'split-right', title: t('sign_in_exp.appearance.layout_split_right') },
      { value: 'minimal', title: t('sign_in_exp.appearance.layout_minimal') },
    ],
    [t]
  );

  return (
    <Card>
      <FormSectionTitle title="appearance.title" />

      <FormField title="sign_in_exp.appearance.preset">
        <div className={styles.presetGrid}>
          {presetOptions.map(({ value, titleKey, descriptionKey }) => {
            const defaults = appearancePresetDefaults[value];
            const isSelected = resolved.preset === value;

            return (
              <button
                key={value}
                type="button"
                disabled={isReadOnly}
                className={classNames(styles.presetCard, isSelected && styles.selected)}
                onClick={() => {
                  handleSelectPreset(value);
                }}
              >
                <div
                  className={styles.presetSwatch}
                  style={{ background: defaults.background.lightColor }}
                >
                  <span
                    className={styles.swatchCard}
                    style={{
                      background: defaults.surface.lightCardColor,
                      borderColor: defaults.color.linkColor,
                    }}
                  >
                    <span
                      className={styles.swatchButton}
                      style={{ background: defaults.color.primaryColor }}
                    />
                  </span>
                </div>
                <div className={styles.presetTitle}>{t(`sign_in_exp.appearance.${titleKey}`)}</div>
                <div className={styles.presetDescription}>
                  {t(`sign_in_exp.appearance.${descriptionKey}`)}
                </div>
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField title="sign_in_exp.appearance.layout">
        <Controller
          name="appearance.layout"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Select
              value={value ?? resolved.layout}
              options={layoutOptions}
              onChange={(nextValue) => {
                if (nextValue) {
                  onChange(nextValue);
                }
              }}
            />
          )}
        />
      </FormField>

      <div className={styles.twoColumns}>
        <FormField title="sign_in_exp.appearance.header_alignment">
          <Controller
            name="appearance.headerAlignment"
            control={control}
            render={({ field: { value, onChange } }) => (
              <RadioGroup
                type="small"
                name="headerAlignment"
                value={value ?? resolved.headerAlignment}
                onChange={(nextValue) => {
                  // eslint-disable-next-line no-restricted-syntax -- fixed union values
                  onChange(nextValue as AppearanceHeaderAlignment);
                }}
              >
                <Radio value="center" title="sign_in_exp.appearance.align_center" />
                <Radio value="left" title="sign_in_exp.appearance.align_left" />
              </RadioGroup>
            )}
          />
        </FormField>

        <FormField title="sign_in_exp.appearance.card_width">
          <Controller
            name="appearance.cardWidth"
            control={control}
            render={({ field: { value, onChange } }) => (
              <RadioGroup
                type="small"
                name="cardWidth"
                value={value ?? resolved.cardWidth}
                onChange={(nextValue) => {
                  // eslint-disable-next-line no-restricted-syntax -- fixed union values
                  onChange(nextValue as AppearanceCardWidth);
                }}
              >
                <Radio value="compact" title="sign_in_exp.appearance.width_compact" />
                <Radio value="default" title="sign_in_exp.appearance.width_default" />
                <Radio value="wide" title="sign_in_exp.appearance.width_wide" />
              </RadioGroup>
            )}
          />
        </FormField>
      </div>

      <FormField title="sign_in_exp.appearance.top_bar">
        <div className={styles.stack}>
          <Controller
            name="appearance.topBar.enabled"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Switch
                label={t('sign_in_exp.appearance.top_bar_enabled')}
                checked={value ?? resolved.topBar.enabled}
                onChange={(event) => {
                  onChange(event.currentTarget.checked);
                }}
              />
            )}
          />
          {resolved.topBar.enabled && (
            <>
              <Controller
                name="appearance.topBar.showThemeToggle"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    label={t('sign_in_exp.appearance.top_bar_theme_toggle')}
                    checked={value ?? resolved.topBar.showThemeToggle}
                    onChange={(event) => {
                      onChange(event.currentTarget.checked);
                    }}
                  />
                )}
              />
              <div className={styles.twoColumns}>
                <FormField title="sign_in_exp.appearance.top_bar_home_url">
                  <TextInput
                    placeholder="https://"
                    error={errors.appearance?.topBar?.homeUrl?.message}
                    {...register('appearance.topBar.homeUrl', { validate: validateOptionalUrl })}
                  />
                </FormField>
                <FormField title="sign_in_exp.appearance.top_bar_home_label">
                  <TextInput
                    placeholder={t('sign_in_exp.appearance.top_bar_home_label_placeholder')}
                    {...register('appearance.topBar.homeLabel', { maxLength: 40 })}
                  />
                </FormField>
              </div>
            </>
          )}
        </div>
      </FormField>

      <BackgroundAndHeroSection resolved={resolved} isDarkModeEnabled={isDarkModeEnabled} />
      <SurfaceAndTypographySection resolved={resolved} isDarkModeEnabled={isDarkModeEnabled} />
    </Card>
  );
}

export default AppearanceForm;
