import ky from 'ky';
import type { ReactNode } from 'react';
import { useContext, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { adminTenantEndpoint } from '@/consts';

import { type AppData, AppDataContext } from './AppDataContext';
import { TenantsContext } from './TenantsProvider';

export { AppDataContext } from './AppDataContext';

type Props = {
  readonly children: ReactNode;
};

const useTenantEndpoint = (tenantId: string) => {
  return useSWRImmutable(
    Boolean(tenantId) && `api/.well-known/endpoints/${tenantId}`,
    async (pathname) => {
      const { user } = await ky
        .get(new URL(pathname, adminTenantEndpoint))
        .json<{ user: string }>();
      return new URL(user);
    }
  );
};

/** The context provider for the global app data. */
function AppDataProvider({ children }: Props) {
  const { currentTenantId } = useContext(TenantsContext);
  const { data: tenantEndpoint } = useTenantEndpoint(currentTenantId);
  const memorizedContext = useMemo(
    () =>
      ({
        tenantEndpoint,
      }) satisfies AppData,
    [tenantEndpoint]
  );

  return <AppDataContext.Provider value={memorizedContext}>{children}</AppDataContext.Provider>;
}

export default AppDataProvider;
