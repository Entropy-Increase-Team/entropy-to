import { type AppearanceBackgroundType, type ResolvedAppearance } from '@logto/schemas';
import { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import ColorPicker from '@/ds-components/ColorPicker';
import FormField from '@/ds-components/FormField';
import Select from '@/ds-components/Select';
import TextInput from '@/ds-components/TextInput';
import { uriValidator } from '@/utils/validator';

import type { SignInExperienceForm } from '../../../types';

import styles from './index.module.scss';

type Props = {
  readonly resolved: ResolvedAppearance;
  readonly isDarkModeEnabled: boolean;
};

function BackgroundAndHeroSection({ resolved, isDarkModeEnabled }: Props) {
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

  const backgroundOptions = useMemo<Array<{ value: AppearanceBackgroundType; title: string }>>(
    () => [
      { value: 'tech-grid', title: t('sign_in_exp.appearance.bg_tech_grid') },
      { value: 'solid', title: t('sign_in_exp.appearance.bg_solid') },
      { value: 'subtle-gradient', title: t('sign_in_exp.appearance.bg_subtle_gradient') },
      { value: 'image', title: t('sign_in_exp.appearance.bg_image') },
    ],
    [t]
  );

  const isSplitLayout = resolved.layout === 'split-left' || resolved.layout === 'split-right';

  return (
    <>
      <FormField title="sign_in_exp.appearance.background">
        <Controller
          name="appearance.background.type"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Select
              value={value ?? resolved.background.type}
              options={backgroundOptions}
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
        <FormField title="sign_in_exp.appearance.bg_light_color">
          <Controller
            name="appearance.background.lightColor"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ColorPicker value={value ?? resolved.background.lightColor} onChange={onChange} />
            )}
          />
        </FormField>
        {isDarkModeEnabled && (
          <FormField title="sign_in_exp.appearance.bg_dark_color">
            <Controller
              name="appearance.background.darkColor"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ColorPicker value={value ?? resolved.background.darkColor} onChange={onChange} />
              )}
            />
          </FormField>
        )}
      </div>

      {resolved.background.type === 'image' && (
        <div className={styles.twoColumns}>
          <FormField title="sign_in_exp.appearance.bg_image_url">
            <TextInput
              placeholder="https://"
              error={errors.appearance?.background?.imageUrl?.message}
              {...register('appearance.background.imageUrl', { validate: validateOptionalUrl })}
            />
          </FormField>
          {isDarkModeEnabled && (
            <FormField title="sign_in_exp.appearance.bg_dark_image_url">
              <TextInput
                placeholder="https://"
                error={errors.appearance?.background?.darkImageUrl?.message}
                {...register('appearance.background.darkImageUrl', {
                  validate: validateOptionalUrl,
                })}
              />
            </FormField>
          )}
        </div>
      )}

      {isSplitLayout && (
        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>{t('sign_in_exp.appearance.hero_section')}</div>
          <div className={styles.twoColumns}>
            <FormField title="sign_in_exp.appearance.hero_badge">
              <TextInput
                placeholder={t('sign_in_exp.appearance.hero_badge_placeholder')}
                {...register('appearance.hero.badge', { maxLength: 40 })}
              />
            </FormField>
            <FormField title="sign_in_exp.appearance.hero_title">
              <TextInput
                placeholder={t('sign_in_exp.appearance.hero_title_placeholder')}
                {...register('appearance.hero.title', { maxLength: 80 })}
              />
            </FormField>
          </div>
          <FormField title="sign_in_exp.appearance.hero_description">
            <TextInput
              placeholder={t('sign_in_exp.appearance.hero_description_placeholder')}
              {...register('appearance.hero.description', { maxLength: 240 })}
            />
          </FormField>
          <div className={styles.twoColumns}>
            <FormField title="sign_in_exp.appearance.hero_image_url">
              <TextInput
                placeholder="https://"
                error={errors.appearance?.hero?.imageUrl?.message}
                {...register('appearance.hero.imageUrl', { validate: validateOptionalUrl })}
              />
            </FormField>
            {isDarkModeEnabled && (
              <FormField title="sign_in_exp.appearance.hero_dark_image_url">
                <TextInput
                  placeholder="https://"
                  error={errors.appearance?.hero?.darkImageUrl?.message}
                  {...register('appearance.hero.darkImageUrl', { validate: validateOptionalUrl })}
                />
              </FormField>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default BackgroundAndHeroSection;
