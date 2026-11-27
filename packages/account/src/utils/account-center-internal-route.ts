export const accountCenterBasePath = '/account';

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return;
  }

  return window.location.origin;
};

const tryParseUrl = (url: string, base?: string) => {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
};

export const getAccountCenterInternalRoute = (
  returnUrl: string,
  currentOrigin = getCurrentOrigin()
): string | undefined => {
  if (!currentOrigin) {
    return;
  }

  const currentUrl = tryParseUrl(currentOrigin);

  if (!currentUrl) {
    return;
  }

  const parsedUrl = tryParseUrl(returnUrl, currentUrl.origin);

  if (!parsedUrl) {
    return;
  }

  const { pathname, search, hash } = parsedUrl;

  if (
    parsedUrl.origin !== currentUrl.origin ||
    (pathname !== accountCenterBasePath && !pathname.startsWith(`${accountCenterBasePath}/`))
  ) {
    return;
  }

  const relativePathname = pathname.slice(accountCenterBasePath.length) || '/';

  // Reject protocol-relative (`//`) or backslash (`\`) paths before passing to react-router navigate().
  if (relativePathname.startsWith('//') || relativePathname.includes('\\')) {
    return;
  }

  return `${relativePathname}${search}${hash}`;
};
