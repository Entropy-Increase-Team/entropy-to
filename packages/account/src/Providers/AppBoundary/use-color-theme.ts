import { applyAppearanceToDocument } from '@experience/shared/utils/appearance-dom';
import { useEffect, useContext } from 'react';

import PageContext from '@ac/Providers/PageContextProvider/PageContext';

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
