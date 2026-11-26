import {
  ConnectorConfigFormItemType,
  ConnectorPlatform,
  ConnectorType,
} from '@logto/connector-kit';
import { type ConnectorResponse } from '@logto/schemas';

import { convertResponseToForm } from './connector-form';

describe('convertResponseToForm', () => {
  it('initializes omitted Switch fields to boolean defaults when editing an existing connector', () => {
    const mockConnector: ConnectorResponse = {
      id: 'shushuoauth2',
      syncProfile: true,
      enableTokenStorage: false,
      platform: ConnectorPlatform.Universal,
      config: {
        clientId: 'shu_123',
      },
      metadata: {
        target: 'shushu',
        name: { en: 'Shushu' },
        logo: 'https://example.com/logo.svg',
        logoDark: null,
      },
      connectorId: 'oauth2',
      target: 'shushu',
      name: { en: 'Shushu' },
      description: { en: 'OAuth 2.0' },
      logo: 'https://example.com/logo.svg',
      logoDark: null,
      readme: '',
      type: ConnectorType.Social,
      isStandard: true,
      formItems: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: ConnectorConfigFormItemType.Text,
          required: true,
        },
        {
          key: 'enablePkce',
          label: 'Enable PKCE',
          type: ConnectorConfigFormItemType.Switch,
          required: false,
          defaultValue: false,
        },
      ],
    };

    const form = convertResponseToForm(mockConnector);
    expect(form.formConfig.enablePkce).toBe(false);
  });
});
