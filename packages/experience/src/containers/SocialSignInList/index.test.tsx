import { fireEvent } from '@testing-library/react';

import renderWithPageContext from '@/__mocks__/RenderWithPageContext';
import SettingsProvider from '@/__mocks__/RenderWithPageContext/SettingsProvider';
import { socialConnectors } from '@/__mocks__/logto';

import SocialSignInList from '.';

const mockInvokeSocialSignIn = jest.fn();

jest.mock('./use-social', () => ({
  __esModule: true,
  default: () => ({
    invokeSocialSignIn: mockInvokeSocialSignIn,
    theme: 'light',
  }),
}));

describe('SocialSignInList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Display connectors and prevents duplicate clicks while social sign-in is loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally pending promise to test in-flight state
    mockInvokeSocialSignIn.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithPageContext(
      <SettingsProvider>
        <SocialSignInList socialConnectors={socialConnectors} />
      </SettingsProvider>
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(socialConnectors.length);

    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[0]!);
    expect(mockInvokeSocialSignIn).toHaveBeenCalledTimes(1);
    expect(buttons[0]?.disabled).toBe(true);
  });
});
