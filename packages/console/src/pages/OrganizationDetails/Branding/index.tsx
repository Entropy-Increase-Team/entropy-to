import { generateDarkColor } from '@logto/core-kit';
import {
  Theme,
  type AppearanceBackgroundType,
  type AppearanceLayout,
  type AppearancePreset,
  type Organization,
} from '@logto/schemas';
import { useCallback, useMemo } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';

import CustomCssEditorField from '@/components/CustomCssEditorField';
import DetailsForm from '@/components/DetailsForm';
import FormCard from '@/components/FormCard';
import LogoAndFavicon from '@/components/ImageInputs/LogoAndFavicon';
import UnsavedChangesAlertModal from '@/components/UnsavedChangesAlertModal';
import { organizationBrandingLink } from '@/consts';
import Button from '@/ds-components/Button';
import ColorPicker from '@/ds-components/ColorPicker';
import FormField from '@/ds-components/FormField';
import Select from '@/ds-components/Select';
import Switch from '@/ds-components/Switch';
import useApi from '@/hooks/use-api';
import useCurrentTenantScopes from '@/hooks/use-current-tenant-scopes';
import useDocumentationUrl from '@/hooks/use-documentation-url';
import { trySubmitSafe } from '@/utils/form';

import { type OrganizationDetailsOutletContext } from '../types';
import { assembleData, normalizeData } from '../utils';

import styles from './index.module.scss';

type OrganizationBrandingForm = Pick<
  Organization,
  'branding' | 'color' | 'appearance' | 'customCss'
> & {
  isBrandingEnabled: boolean;
};

function Branding() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const api = useApi();
  const { getDocumentationUrl } = useDocumentationUrl();
  const {
    access: { isReadOnly },
  } = useCurrentTenantScopes();
  const { isDeleting, data, onUpdated } = useOutletContext<OrganizationDetailsOutletContext>();
  const formMethods = useForm<OrganizationBrandingForm>({
    defaultValues: {
      ...normalizeData(data),
      isBrandingEnabled:
        Object.keys(data.branding).length > 0 ||
        Object.keys(data.color).length > 0 ||
        Object.keys(data.appearance).length > 0 ||
        Boolean(data.customCss),
    },
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting, errors },
  } = formMethods;

  const onSubmit = handleSubmit(
    trySubmitSafe(async (formData) => {
      const updatedData = await api
        .patch(`api/organizations/${data.id}`, { json: assembleData(formData) })
        .json<Organization>();

      toast.success(t('general.saved'));
      reset(normalizeData(updatedData));
      onUpdated(updatedData);
    })
  );

  const [isBrandingEnabled, primaryColor, darkPrimaryColor] = watch([
    'isBrandingEnabled',
    'color.primaryColor',
    'color.darkPrimaryColor',
  ]);

  const calculatedDarkPrimaryColor = useMemo(() => {
    return primaryColor && generateDarkColor(primaryColor);
  }, [primaryColor]);

  const handleResetColor = useCallback(() => {
    setValue('color.darkPrimaryColor', calculatedDarkPrimaryColor, { shouldDirty: true });
  }, [calculatedDarkPrimaryColor, setValue]);

  const presetOptions = useMemo<Array<{ value: '' | AppearancePreset; title: string }>>(
    () => [
      { value: '', title: t('sign_in_exp.appearance.inherit_tenant') },
      { value: 'entropy', title: t('sign_in_exp.appearance.preset_entropy') },
      { value: 'classic', title: t('sign_in_exp.appearance.preset_classic') },
      { value: 'minimal', title: t('sign_in_exp.appearance.preset_minimal') },
    ],
    [t]
  );

  const layoutOptions = useMemo<Array<{ value: '' | AppearanceLayout; title: string }>>(
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

  const backgroundOptions = useMemo<Array<{ value: '' | AppearanceBackgroundType; title: string }>>(
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
    <FormProvider {...formMethods}>
      <DetailsForm
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        onDiscard={reset}
        onSubmit={onSubmit}
      >
        <FormCard
          title="organization_details.branding.name"
          description="organization_details.branding.description"
          learnMoreLink={{
            href: getDocumentationUrl(organizationBrandingLink),
            targetBlank: 'noopener',
          }}
        >
          <FormField title="organization_details.branding.organization_level_sie">
            <Switch
              description="organization_details.branding.organization_level_sie_switch"
              {...register('isBrandingEnabled')}
            />
          </FormField>
          {isBrandingEnabled && (
            <>
              <LogoAndFavicon
                control={control}
                register={register}
                theme={Theme.Light}
                type="organization_logo"
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
                type="organization_logo"
                logo={{ name: 'branding.darkLogoUrl', error: errors.branding?.darkLogoUrl }}
                favicon={{
                  name: 'branding.darkFavicon',
                  error: errors.branding?.darkFavicon,
                }}
              />
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
            </>
          )}
          <UnsavedChangesAlertModal hasUnsavedChanges={!isDeleting && isDirty} />
        </FormCard>
      </DetailsForm>
    </FormProvider>
  );
}

export default Branding;
