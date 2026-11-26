import type { SetSession } from '@logto/connector-kit';
import { ConnectorError, ConnectorErrorCodes, socialUserInfoGuard } from '@logto/connector-kit';
import { XMLValidator } from 'fast-xml-parser';
import * as saml from 'samlify';

import type { ESamlHttpRequest, ProfileMap, SamlConfig } from './types.js';

export const userProfileMapping = (
  originUserProfile: Record<string, unknown>,
  keyMapping: ProfileMap
) => {
  const keyMap = new Map(
    Object.entries(keyMapping).map(([destination, source]) => [source, destination])
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mappedUserProfile = Object.fromEntries(
    Object.entries(originUserProfile)
      .filter(([key, value]) => keyMap.get(key) && value)
      .map(([key, value]) => [keyMap.get(key), value])
  );

  const result = socialUserInfoGuard.safeParse(mappedUserProfile);

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }

  return result.data;
};

export const getUserInfoFromRawUserProfile = (
  rawUserProfile: Record<string, unknown>,
  keyMapping: ProfileMap
) => {
  const userProfile = userProfileMapping(rawUserProfile, keyMapping);
  const result = socialUserInfoGuard.safeParse(userProfile);

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, result.error);
  }

  return result.data;
};

export const samlAssertionHandler = async (
  request: ESamlHttpRequest,
  options: SamlConfig,
  setSession: SetSession
): Promise<void | Record<string, unknown>> => {
  const {
    entityID,
    x509Certificate,
    idpMetadataXml,
    encryptAssertion,
    encPrivateKey,
    encPrivateKeyPass,
    messageSigningOrder,
    timeout,
  } = options;
  // eslint-disable-next-line new-cap
  const identityProvider = saml.IdentityProvider({
    metadata: idpMetadataXml,
    messageSigningOrder,
    isAssertionEncrypted: encryptAssertion,
  });
  // eslint-disable-next-line new-cap
  const serviceProvider = saml.ServiceProvider({
    entityID,
    signingCert: x509Certificate,
    isAssertionEncrypted: encryptAssertion,
    encPrivateKey,
    encPrivateKeyPass,
    clockDrifts: [-timeout, timeout],
  });

  // Used to check whether xml content is valid in format.
  saml.setSchemaValidator({
    validate: async (xmlContent: string) => {
      const validationResult = XMLValidator.validate(xmlContent, {
        allowBooleanAttributes: true,
      });

      if (validationResult !== true) {
        throw new Error(validationResult.err.msg);
      }

      return true;
    },
  });

  try {
    const assertionResult = await serviceProvider.parseLoginResponse(
      identityProvider,
      'post',
      request
    );

    const audiences: unknown[] = [assertionResult.extract.audience ?? []].flat();
    if (!audiences.includes(entityID)) {
      throw new Error('SAML assertion audience does not match the SP entity ID.');
    }

    await setSession({
      extractedRawProfile: {
        ...(Boolean(assertionResult.extract.nameID) && {
          id: assertionResult.extract.nameID,
        }),
        ...assertionResult.extract.attributes,
      },
    });
  } catch (error: unknown) {
    throw new ConnectorError(ConnectorErrorCodes.General, String(error));
  }
};
