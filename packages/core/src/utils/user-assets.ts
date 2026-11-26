import { XMLValidator } from 'fast-xml-parser';

import RequestError from '#src/errors/RequestError/index.js';
import assertThat from '#src/utils/assert-that.js';

const maxFilenameLength = 128;
const unsafeSvgContentPattern =
  /<(?:[\w-]+:)?(?:script|foreignobject)\b|\bon[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html/i;

export const buildSafeUploadFilename = (originalFilename: string): string => {
  const normalizedName = originalFilename.replaceAll('\\', '/').split('/').at(-1) ?? '';
  const sanitized = normalizedName.replaceAll(/[^\w.-]/g, '-').replace(/^\.+/, '');
  const extensionMatch = /(\.[\da-z]{1,10})$/i.exec(sanitized);
  const extension = extensionMatch?.[1] ?? '';
  const rawStem = extension ? sanitized.slice(0, -extension.length) : sanitized;
  const stem = /[\da-z]/i.test(rawStem) ? rawStem : 'asset';
  const maxStemLength = Math.max(1, maxFilenameLength - extension.length);

  return `${stem.slice(0, maxStemLength)}${extension}`;
};

export const assertSafeUploadedAssetContent = (buffer: Uint8Array, mimetype: string) => {
  if (mimetype !== 'image/svg+xml') {
    return;
  }

  const svgText = new TextDecoder().decode(buffer);
  const xmlValidation = XMLValidator.validate(svgText, { allowBooleanAttributes: true });
  assertThat(
    xmlValidation === true && !unsafeSvgContentPattern.test(svgText),
    new RequestError('guard.invalid_input')
  );
};
