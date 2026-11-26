import { useLocation } from 'react-router-dom';

import { useSieMethods } from '@/hooks/use-sie';

type Props = {
  readonly className?: string;
};

const blockedTagNames = new Set(['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta']);
const urlAttributeNames = new Set(['href', 'src', 'xlink:href', 'formaction']);
const unsafeUrlSchemePattern = /^(?:javascript|vbscript|data\s*:\s*text\/html)/i;

const sanitizeCustomHtml = (rawHtml: string): string => {
  const document = new DOMParser().parseFromString(rawHtml, 'text/html');

  for (const element of document.body.querySelectorAll('*')) {
    if (blockedTagNames.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attribute of element.attributes) {
      const attributeName = attribute.name.toLowerCase();
      const normalizedValue = attribute.value.replaceAll(/[\p{Cc}\s]+/gu, '');
      if (
        attributeName.startsWith('on') ||
        (urlAttributeNames.has(attributeName) && unsafeUrlSchemePattern.test(normalizedValue))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return document.body.innerHTML;
};

const CustomContent = ({ className }: Props) => {
  const { customContent } = useSieMethods();
  const { pathname } = useLocation();

  const customHtml = customContent?.[pathname];

  if (!customHtml) {
    return null;
  }

  try {
    const sanitizedHtml = sanitizeCustomHtml(customHtml);
    // eslint-disable-next-line react/no-danger -- custom content is sanitized via DOMParser before rendering
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className={className} />;
  } catch {
    return null;
  }
};

export default CustomContent;
