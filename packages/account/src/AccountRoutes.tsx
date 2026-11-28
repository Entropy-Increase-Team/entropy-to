import { SignInIdentifier } from '@logto/schemas';
import { Route, Routes } from 'react-router-dom';

import {
  securityRoute,
  sessionsRoute,
  profileRoute,
  emailRoute,
  emailSuccessRoute,
  phoneRoute,
  phoneSuccessRoute,
  passwordRoute,
  passwordSuccessRoute,
  usernameRoute,
  usernameSuccessRoute,
  authenticatorAppRoute,
  authenticatorAppReplaceRoute,
  authenticatorAppSuccessRoute,
  authenticatorAppReplaceSuccessRoute,
  backupCodesGenerateRoute,
  backupCodesRegenerateRoute,
  backupCodesSuccessRoute,
  backupCodesManageRoute,
  passkeyAddRoute,
  passkeyManageRoute,
  passkeySuccessRoute,
  socialSuccessRoute,
  socialRoutePrefix,
} from './constants/routes';
import BackupCodeBinding from './pages/BackupCodeBinding';
import BackupCodeView from './pages/BackupCodeView';
import Email from './pages/Email';
import Home from './pages/Home';
import PasskeyBinding from './pages/PasskeyBinding';
import PasskeyView from './pages/PasskeyView';
import Password from './pages/Password';
import Phone from './pages/Phone';
import Profile from './pages/Profile';
import Security from './pages/Security';
import Sessions from './pages/Sessions';
import SocialFlow from './pages/SocialFlow';
import TotpBinding from './pages/TotpBinding';
import UpdateSuccess from './pages/UpdateSuccess';
import Username from './pages/Username';

type Props = {
  readonly hasProfile: boolean;
  readonly hasSecurity: boolean;
  readonly hasSessions: boolean;
};

const AccountRoutes = ({ hasProfile, hasSecurity, hasSessions }: Props) => (
  <Routes>
    <Route
      path={emailSuccessRoute}
      element={<UpdateSuccess identifierType={SignInIdentifier.Email} />}
    />
    <Route
      path={phoneSuccessRoute}
      element={<UpdateSuccess identifierType={SignInIdentifier.Phone} />}
    />
    <Route
      path={usernameSuccessRoute}
      element={<UpdateSuccess identifierType={SignInIdentifier.Username} />}
    />
    <Route path={passwordSuccessRoute} element={<UpdateSuccess identifierType="password" />} />
    <Route path={authenticatorAppSuccessRoute} element={<UpdateSuccess identifierType="totp" />} />
    <Route
      path={authenticatorAppReplaceSuccessRoute}
      element={<UpdateSuccess identifierType="totp_replaced" />}
    />
    <Route
      path={backupCodesSuccessRoute}
      element={<UpdateSuccess identifierType="backup_code" />}
    />
    <Route path={passkeySuccessRoute} element={<UpdateSuccess identifierType="passkey" />} />
    <Route path={socialSuccessRoute} element={<UpdateSuccess identifierType="social" />} />
    <Route path={emailRoute} element={<Email />} />
    <Route path={phoneRoute} element={<Phone />} />
    <Route path={passwordRoute} element={<Password />} />
    <Route path={usernameRoute} element={<Username />} />
    <Route path={authenticatorAppReplaceRoute} element={<TotpBinding isReplace />} />
    <Route path={authenticatorAppRoute} element={<TotpBinding />} />
    <Route path={backupCodesGenerateRoute} element={<BackupCodeBinding />} />
    <Route path={backupCodesRegenerateRoute} element={<BackupCodeBinding isRegenerate />} />
    <Route path={backupCodesManageRoute} element={<BackupCodeView />} />
    <Route path={passkeyAddRoute} element={<PasskeyBinding />} />
    <Route path={passkeyManageRoute} element={<PasskeyView />} />
    <Route path={`${socialRoutePrefix}/:connectorId`} element={<SocialFlow mode="add" />} />
    <Route
      path={`${socialRoutePrefix}/:connectorId/change`}
      element={<SocialFlow mode="change" />}
    />
    <Route
      path={`${socialRoutePrefix}/:connectorId/remove`}
      element={<SocialFlow mode="remove" />}
    />
    {hasSecurity && <Route path={securityRoute} element={<Security />} />}
    {hasSessions && <Route path={sessionsRoute} element={<Sessions />} />}
    {hasProfile && <Route path={profileRoute} element={<Profile />} />}
    <Route index element={<Home />} />
    <Route path="*" element={<Home />} />
  </Routes>
);

export default AccountRoutes;
