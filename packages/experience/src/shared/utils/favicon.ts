/**
 * Neutral fallback SVG favicon data URI used when neither the tenant nor the instance has
 * configured a custom favicon URL. Intentionally brand-neutral and carries no external or
 * proprietary logo assets.
 */
export const defaultNeutralFavicon =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="16" fill="#14171c"/>' +
      '<rect x="18" y="18" width="28" height="28" rx="7" fill="none" stroke="#f5f7fa" stroke-width="5"/>' +
      '<circle cx="32" cy="32" r="5" fill="#6ea8ff"/>' +
      '</svg>'
  );
