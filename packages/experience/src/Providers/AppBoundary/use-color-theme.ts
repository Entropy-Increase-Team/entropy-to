import { useEffect, useContext } from 'react';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import { applyAppearanceToDocument } from '@/shared/utils/appearance-dom';

const useColorTheme = () => {
  const { theme, experienceSettings } = useContext(PageContext);

  useEffect(() => {
    if (!experienceSettings) {
      return;
    }

    applyAppearanceToDocument({
      color: experienceSettings.color,
      branding: experienceSettings.branding,
      appearance: experienceSettings.appearance,
      hideLogtoBranding: experienceSettings.hideLogtoBranding,
      theme,
    });
  }, [experienceSettings, theme]);
};

export default useColorTheme;
