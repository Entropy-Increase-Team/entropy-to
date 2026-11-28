import { generateDarkColor } from '@logto/core-kit';
import { Theme } from '@logto/schemas';
import { useMemo, useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import CustomCssEditorField from '@/components/CustomCssEditorField';
import LogoAndFavicon from '@/components/ImageInputs/LogoAndFavicon';
import Button from '@/ds-components/Button';
import ColorPicker from '@/ds-components/ColorPicker';
import FormField from '@/ds-components/FormField';
import Select from '@/ds-components/Select';
import useCurrentTenantScopes from '@/hooks/use-current-tenant-scopes';

import styles from './index.module.scss';
import {
  type AppBackgroundOption,
  type AppLayoutOption,
  type AppPresetOption,
  type ApplicationSignInExperienceForm,
} from './utils';

function NonThirdPartyBrandingForm() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const {
    access: { isReadOnly },
  } = useCurrentTenantScopes();
  const {
    control,
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<ApplicationSignInExperienceForm>();

  const [primaryColor, darkPrimaryColor] = watch(['color.primaryColor', 'color.darkPrimaryColor']);

  const calculatedDarkPrimaryColor = useMemo(() => {
    return primaryColor && generateDarkColor(primaryColor);
  }, [primaryColor]);

  const handleResetColor = useCallback(() => {
    setValue('color.darkPrimaryColor', calculatedDarkPrimaryColor, { shouldDirty: true });
  }, [calculatedDarkPrimaryColor, setValue]);

  const presetOptions = useMemo<Array<{ value: AppPresetOption; title: string }>>(
    () => [
      { value: '', title: t('sign_in_exp.appearance.inherit_tenant') },
      { value: 'entropy', title: t('sign_in_exp.appearance.preset_entropy') },
      { value: 'classic', title: t('sign_in_exp.appearance.preset_classic') },
      { value: 'minimal', title: t('sign_in_exp.appearance.preset_minimal') },
    ],
    [t]
  );

  const layoutOptions = useMemo<Array<{ value: AppLayoutOption; title: string }>>(
    () => [
      { value: '', title: t('sign_in_exp.appearance.inherit_tenant') },
      { value: 'centered', title: t('sign_in_exp.appearance.layout_centered') },
      { value: 'framed', title: t('sign_in_exp.appearance.layout_framed') },
      { value: 'split-left', title: t('sign_in_exp.appearance.layout_split_left') },
      { value: 'split-right', title: t('sign_in_exp.appearance.layout_split_right') },
      { value: 'minimal', title: t('sign_in_exp.appearance.layout_minimal') },
    ],
    [t]
  );

  const backgroundOptions = useMemo<Array<{ value: AppBackgroundOption; title: string }>>(
    () => [
      { value: '', title: t('sign_in_exp.appearance.inherit_tenant') },
      { value: 'tech-grid', title: t('sign_in_exp.appearance.bg_tech_grid') },
      { value: 'solid', title: t('sign_in_exp.appearance.bg_solid') },
      { value: 'subtle-gradient', title: t('sign_in_exp.appearance.bg_subtle_gradient') },
      { value: 'image', title: t('sign_in_exp.appearance.bg_image') },
    ],
    [t]
  );

  return (
    <>
      <LogoAndFavicon
        control={control}
        register={register}
        theme={Theme.Light}
        type="app_logo"
        logo={{ name: 'branding.logoUrl', error: errors.branding?.logoUrl }}
        favicon={{
          name: 'branding.favicon',
          error: errors.branding?.favicon,
        }}
      />
      <LogoAndFavicon
        control={control}
        register={register}
        theme={Theme.Dark}
        type="app_logo"
        logo={{ name: 'branding.darkLogoUrl', error: errors.branding?.darkLogoUrl }}
        favicon={{
          name: 'branding.darkFavicon',
          error: errors.branding?.darkFavicon,
        }}
      />
      <div className={styles.colors}>
        <Controller
          control={control}
          name="color.primaryColor"
          render={({ field: { name, value, onChange } }) => (
            <FormField title="application_details.branding.brand_color">
              <ColorPicker name={name} value={value} onChange={onChange} />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="color.darkPrimaryColor"
          render={({ field: { name, value, onChange } }) => (
            <FormField title="application_details.branding.brand_color_dark">
              <ColorPicker name={name} value={value} onChange={onChange} />
            </FormField>
          )}
        />
        {!isReadOnly && calculatedDarkPrimaryColor !== darkPrimaryColor && (
          <div className={styles.darkModeTip}>
            {t('sign_in_exp.color.dark_mode_reset_tip')}
            <Button
              type="text"
              size="small"
              title="sign_in_exp.color.reset"
              onClick={handleResetColor}
            />
          </div>
        )}
        <FormField title="sign_in_exp.appearance.preset">
          <Controller
            control={control}
            name="appearance.preset"
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? ''}
                options={presetOptions}
                onChange={(nextValue) => {
                  onChange(nextValue === '' ? undefined : nextValue);
                }}
              />
            )}
          />
        </FormField>
        <FormField title="sign_in_exp.appearance.layout">
          <Controller
            control={control}
            name="appearance.layout"
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? ''}
                options={layoutOptions}
                onChange={(nextValue) => {
                  onChange(nextValue === '' ? undefined : nextValue);
                }}
              />
            )}
          />
        </FormField>
        <FormField title="sign_in_exp.appearance.background">
          <Controller
            control={control}
            name="appearance.background.type"
            render={({ field: { value, onChange } }) => (
              <Select
                value={value ?? ''}
                options={backgroundOptions}
                onChange={(nextValue) => {
                  onChange(nextValue === '' ? undefined : nextValue);
                }}
              />
            )}
          />
        </FormField>
        <CustomCssEditorField />
      </div>
    </>
  );
}

export default NonThirdPartyBrandingForm;
