import { generateDarkColor } from '@logto/core-kit';
import { appearancePresetDefaults, Theme, type FooterBrandingMode } from '@logto/schemas';
import { useMemo, useCallback, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import LogoAndFavicon from '@/components/ImageInputs/LogoAndFavicon';
import { isCloud } from '@/consts/env';
import Button from '@/ds-components/Button';
import Card from '@/ds-components/Card';
import ColorPicker from '@/ds-components/ColorPicker';
import FormField from '@/ds-components/FormField';
import RadioGroup, { Radio } from '@/ds-components/RadioGroup';
import Switch from '@/ds-components/Switch';
import TextInput from '@/ds-components/TextInput';
import useCurrentTenantScopes from '@/hooks/use-current-tenant-scopes';
import { uriValidator } from '@/utils/validator';

import useBrandingEntitlements from '../../../hooks/use-branding-entitlements';
import type { SignInExperienceForm } from '../../../types';
import FormSectionTitle from '../../components/FormSectionTitle';

import HideLogtoBrandingField from './HideLogtoBrandingField';
import styles from './index.module.scss';

function BrandingForm() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const {
    access: { isReadOnly },
  } = useCurrentTenantScopes();
  const {
    watch,
    register,
    unregister,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useFormContext<SignInExperienceForm>();
  const { isHideLogtoBrandingAvailable, isHideLogtoBrandingEnabled } = useBrandingEntitlements();

  const isDarkModeEnabled = watch('color.isDarkModeEnabled');
  const primaryColor = watch('color.primaryColor');
  const darkPrimaryColor = watch('color.darkPrimaryColor');
  const footerBrandingMode = watch('branding.footerBranding')?.mode ?? 'hidden';

  const calculatedDarkPrimaryColor = useMemo(() => {
    return generateDarkColor(primaryColor);
  }, [primaryColor]);

  const handleResetColor = useCallback(() => {
    setValue('color.darkPrimaryColor', calculatedDarkPrimaryColor, { shouldDirty: true });
  }, [calculatedDarkPrimaryColor, setValue]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    // If it's enabled, the original dark mode color won't change, users need to click "reset".
    if (!isDarkModeEnabled) {
      handleResetColor();
    }
  }, [handleResetColor, isDarkModeEnabled, isDirty]);

  useEffect(() => {
    if (!isHideLogtoBrandingAvailable) {
      unregister('hideLogtoBranding');
    }
  }, [isHideLogtoBrandingAvailable, unregister]);

  const handleFooterModeChange = useCallback(
    (nextMode: string) => {
      // eslint-disable-next-line no-restricted-syntax -- RadioGroup emits string union of our FooterBrandingMode options
      const mode = nextMode as FooterBrandingMode;
      setValue('branding.footerBranding.mode', mode, { shouldDirty: true });
      setValue('hideLogtoBranding', mode !== 'logto', { shouldDirty: true });
    },
    [setValue]
  );

  const validateOptionalHttpUrl = useCallback(
    (value?: string) => !value || uriValidator(value) || t('errors.invalid_uri_format'),
    [t]
  );

  const showCustomFooterDesigner = !isCloud || isHideLogtoBrandingEnabled;

  return (
    <Card>
      <FormSectionTitle title="branding.title" />
      <FormField title="sign_in_exp.branding.brand_name">
        <TextInput
          placeholder={t('sign_in_exp.branding.brand_name_placeholder')}
          error={errors.branding?.brandName?.message}
          {...register('branding.brandName', { maxLength: 64 })}
        />
      </FormField>
      <FormField title="sign_in_exp.branding.tagline">
        <TextInput
          placeholder={t('sign_in_exp.branding.tagline_placeholder')}
          error={errors.branding?.tagline?.message}
          {...register('branding.tagline', { maxLength: 160 })}
        />
      </FormField>
      <FormField title="sign_in_exp.color.primary_color">
        <Controller
          name="color.primaryColor"
          control={control}
          render={({ field: { name, onChange, value } }) => (
            <ColorPicker name={name} value={value} onChange={onChange} />
          )}
        />
      </FormField>
      <FormField title="sign_in_exp.color.link_color">
        <Controller
          name="color.linkColor"
          control={control}
          render={({ field: { name, onChange, value } }) => (
            <ColorPicker
              name={name}
              value={value ?? appearancePresetDefaults.entropy.color.linkColor}
              onChange={onChange}
            />
          )}
        />
      </FormField>
      <LogoAndFavicon
        control={control}
        register={register}
        theme={Theme.Light}
        type="company_logo"
        logo={{ name: 'branding.logoUrl', error: errors.branding?.logoUrl }}
        favicon={{
          name: 'branding.favicon',
          error: errors.branding?.favicon,
        }}
      />
      <FormField title="sign_in_exp.color.dark_mode">
        <Switch
          label={t('sign_in_exp.color.dark_mode_description')}
          {...register('color.isDarkModeEnabled')}
        />
      </FormField>
      {isDarkModeEnabled && (
        <>
          <FormField title="sign_in_exp.color.dark_primary_color">
            <Controller
              name="color.darkPrimaryColor"
              control={control}
              render={({ field: { onChange, value } }) => (
                <ColorPicker value={value} onChange={onChange} />
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
          </FormField>
          <FormField title="sign_in_exp.color.dark_link_color">
            <Controller
              name="color.darkLinkColor"
              control={control}
              render={({ field: { onChange, value } }) => (
                <ColorPicker
                  value={value ?? appearancePresetDefaults.entropy.color.darkLinkColor}
                  onChange={onChange}
                />
              )}
            />
          </FormField>
          <LogoAndFavicon
            control={control}
            register={register}
            theme={Theme.Dark}
            type="company_logo"
            logo={{ name: 'branding.darkLogoUrl', error: errors.branding?.darkLogoUrl }}
            favicon={{
              name: 'branding.darkFavicon',
              error: errors.branding?.darkFavicon,
            }}
          />
          <FormField title="sign_in_exp.branding.adaptive_logo">
            <Switch
              label={t('sign_in_exp.branding.adaptive_logo_description')}
              {...register('branding.adaptiveLogo')}
            />
          </FormField>
        </>
      )}
      {showCustomFooterDesigner ? (
        <>
          <FormField title="sign_in_exp.branding.footer_branding">
            <RadioGroup
              type="small"
              name="footerBrandingMode"
              value={footerBrandingMode}
              onChange={handleFooterModeChange}
            >
              <Radio value="hidden" title="sign_in_exp.branding.footer_branding_hidden" />
              <Radio value="custom" title="sign_in_exp.branding.footer_branding_custom" />
              <Radio value="logto" title="sign_in_exp.branding.footer_branding_logto" />
            </RadioGroup>
          </FormField>
          {footerBrandingMode === 'custom' && (
            <>
              <FormField title="sign_in_exp.branding.footer_text">
                <TextInput
                  placeholder={t('sign_in_exp.branding.footer_text_placeholder')}
                  error={errors.branding?.footerBranding?.text?.message}
                  {...register('branding.footerBranding.text', { maxLength: 120 })}
                />
              </FormField>
              <FormField title="sign_in_exp.branding.footer_link_url">
                <TextInput
                  placeholder="https://"
                  error={errors.branding?.footerBranding?.linkUrl?.message}
                  {...register('branding.footerBranding.linkUrl', {
                    validate: validateOptionalHttpUrl,
                  })}
                />
              </FormField>
              <FormField title="sign_in_exp.branding.footer_logo_url">
                <TextInput
                  placeholder="https://"
                  error={errors.branding?.footerBranding?.logoUrl?.message}
                  {...register('branding.footerBranding.logoUrl', {
                    validate: validateOptionalHttpUrl,
                  })}
                />
              </FormField>
              {isDarkModeEnabled && (
                <FormField title="sign_in_exp.branding.footer_dark_logo_url">
                  <TextInput
                    placeholder="https://"
                    error={errors.branding?.footerBranding?.darkLogoUrl?.message}
                    {...register('branding.footerBranding.darkLogoUrl', {
                      validate: validateOptionalHttpUrl,
                    })}
                  />
                </FormField>
              )}
              <FormField title="sign_in_exp.branding.footer_icp_record">
                <TextInput
                  placeholder={t('sign_in_exp.branding.footer_icp_record_placeholder')}
                  error={errors.branding?.footerBranding?.icpRecord?.message}
                  {...register('branding.footerBranding.icpRecord', { maxLength: 80 })}
                />
              </FormField>
              <FormField title="sign_in_exp.branding.footer_icp_url">
                <TextInput
                  placeholder="https://"
                  error={errors.branding?.footerBranding?.icpUrl?.message}
                  {...register('branding.footerBranding.icpUrl', {
                    validate: validateOptionalHttpUrl,
                  })}
                />
              </FormField>
            </>
          )}
        </>
      ) : (
        <HideLogtoBrandingField
          variant={isHideLogtoBrandingAvailable ? 'switch' : 'oss-upsell'}
          isEnabled={isHideLogtoBrandingEnabled}
        />
      )}
    </Card>
  );
}

export default BrandingForm;
