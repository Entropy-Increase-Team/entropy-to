import { createContext } from 'react';

export type AppData = {
  /**
   * The Logto endpoint for the current tenant.
   *
   * Always use this value as the base URL when referring to the Logto URL of the current user's tenant.
   */
  tenantEndpoint?: URL;
};

export const AppDataContext = createContext<AppData>({});
